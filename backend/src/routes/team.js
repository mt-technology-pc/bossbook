import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTeamManager } from '../middleware/requireTeamManager.js'
import { validateBody } from '../middleware/validate.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'

const router = Router()

router.use(requireAuth)

// A bare uuid() check, not .uuid() alone — an empty string or missing
// value should mean "no role", not a validation error, since the UI's
// "No role assigned" option sends exactly that.
const roleIdField = z.string().uuid().nullable().optional()

const addUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Temporary password must be at least 8 characters'),
  roleId: roleIdField,
})

const setUserRoleSchema = z.object({ roleId: roleIdField })

const roleSchema = z.object({
  name: z.string().trim().min(1, 'Role name is required').max(100),
  fullAccess: z.boolean().optional().default(false),
  pageKeys: z.array(z.string()).optional().default([]),
})

// PATCH allows a partial rename (name omitted = keep existing) — mirrors
// the route's pre-existing behavior of only sending `name` when provided.
const updateRoleSchema = roleSchema.partial({ name: true })

async function getCallerCompanyId(accessToken) {
  const supabase = supabaseForUser(accessToken)
  const { data, error } = await supabase.rpc('current_company_id')
  if (error) throw error
  return data
}

// Every company member can see who's on the team and what roles exist —
// only mutating this (add/remove a user, create/edit/delete a role) needs
// requireTeamManager, applied per-route below.

router.get('/users', async (req, res, next) => {
  try {
    const companyId = await getCallerCompanyId(req.accessToken)
    if (!companyId) return res.status(400).json({ error: 'No company found for this account' })

    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('company_users')
      .select('user_id, role, role_id, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
    if (membershipsError) throw membershipsError

    // A membership can outlive its auth.users row — mark it orphaned rather
    // than let one bad row break the whole list (same reasoning as the
    // platform-admin company-detail route this mirrors).
    const users = await Promise.all(
      memberships.map(async (m) => {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(m.user_id)
        if (userError || !userData?.user) {
          return {
            userId: m.user_id, role: m.role, roleId: m.role_id, joinedAt: m.created_at,
            orphaned: true, email: null, fullName: null, lastSignInAt: null,
          }
        }
        return {
          userId: m.user_id,
          role: m.role,
          roleId: m.role_id,
          joinedAt: m.created_at,
          email: userData.user.email || null,
          fullName: userData.user.user_metadata?.full_name || null,
          lastSignInAt: userData.user.last_sign_in_at || null,
        }
      }),
    )

    res.json({ users })
  } catch (err) {
    next(err)
  }
})

router.get('/roles', async (req, res, next) => {
  try {
    const supabase = supabaseForUser(req.accessToken)
    const companyId = await getCallerCompanyId(req.accessToken)
    if (!companyId) return res.status(400).json({ error: 'No company found for this account' })

    // Lazily ensures every company has at least one ready-to-assign
    // full-access role — see ensure_default_role in the migration.
    const { error: ensureError } = await supabase.rpc('ensure_default_role')
    if (ensureError) throw ensureError

    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, full_access, is_system, created_at')
      .order('created_at', { ascending: true })
    if (rolesError) throw rolesError

    const { data: permissions, error: permissionsError } = await supabase
      .from('role_permissions')
      .select('role_id, page_key')
    if (permissionsError) throw permissionsError

    const pagesByRole = {}
    for (const p of permissions) {
      (pagesByRole[p.role_id] ??= []).push(p.page_key)
    }

    res.json({
      roles: roles.map((r) => ({ ...r, pageKeys: pagesByRole[r.id] || [] })),
    })
  } catch (err) {
    next(err)
  }
})

// Creates a login for a new teammate and adds them to the caller's own
// company as staff with the given role — same shape as the platform-admin
// user-creation route (backend/src/routes/admin.js), scoped to the caller's
// own company instead of a URL param, and can only ever create staff (never
// owner) — promoting someone to owner stays a platform-admin-only action.
router.post('/users', requireTeamManager, validateBody(addUserSchema), async (req, res, next) => {
  try {
    const companyId = await getCallerCompanyId(req.accessToken)
    if (!companyId) return res.status(400).json({ error: 'No company found for this account' })

    const { email, password, roleId } = req.body
    if (roleId) {
      const { data: role } = await supabaseAdmin
        .from('roles').select('id').eq('id', roleId).eq('company_id', companyId).maybeSingle()
      if (!role) return res.status(400).json({ error: 'Invalid role' })
    }

    // handle_new_user() (schema.sql) fires immediately on this insert and
    // unconditionally auto-provisions a throwaway company + owner
    // membership for any brand-new user — cleaned up below, not avoided.
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    })

    if (createError) {
      const duplicate = createError.status === 422 || /already.*registered/i.test(createError.message || '')
      return res.status(duplicate ? 409 : 500).json({
        error: duplicate
          ? 'A user with this email already exists — this app supports one company per user'
          : createError.message,
      })
    }

    const newUserId = created.user.id

    const { data: bogusMembership } = await supabaseAdmin
      .from('company_users').select('company_id').eq('user_id', newUserId).maybeSingle()
    if (bogusMembership?.company_id) {
      await supabaseAdmin.from('companies').delete().eq('id', bogusMembership.company_id)
    }

    const { error: membershipError } = await supabaseAdmin
      .from('company_users')
      .insert({ user_id: newUserId, company_id: companyId, role: 'staff', role_id: roleId || null })

    if (membershipError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw membershipError
    }

    res.status(201).json({
      user: { userId: newUserId, email, roleId: roleId || null, temporaryPassword: password },
    })
  } catch (err) {
    next(err)
  }
})

// Reassigns a staff member's role. No-ops (400s) on an owner row — an
// owner's access never depends on role_id.
router.patch('/users/:userId', requireTeamManager, validateBody(setUserRoleSchema), async (req, res, next) => {
  try {
    const companyId = await getCallerCompanyId(req.accessToken)
    const { userId } = req.params
    const { roleId } = req.body

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('company_users').select('role').eq('company_id', companyId).eq('user_id', userId).maybeSingle()
    if (membershipError) throw membershipError
    if (!membership) return res.status(404).json({ error: 'User is not a member of this company' })
    if (membership.role === 'owner') {
      return res.status(400).json({ error: 'An owner always has full access — roles don\'t apply to them' })
    }

    if (roleId) {
      const { data: role } = await supabaseAdmin
        .from('roles').select('id').eq('id', roleId).eq('company_id', companyId).maybeSingle()
      if (!role) return res.status(400).json({ error: 'Invalid role' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('company_users')
      .update({ role_id: roleId || null })
      .eq('company_id', companyId).eq('user_id', userId)
    if (updateError) throw updateError

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// Removes a staff member's login entirely — intentionally can't remove an
// owner from this surface (that stays platform-admin-only), unlike the
// platform-admin equivalent route which allows it with a last-owner guard.
router.delete('/users/:userId', requireTeamManager, async (req, res, next) => {
  try {
    const companyId = await getCallerCompanyId(req.accessToken)
    const { userId } = req.params

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('company_users').select('role').eq('company_id', companyId).eq('user_id', userId).maybeSingle()
    if (membershipError) throw membershipError
    if (!membership) return res.status(404).json({ error: 'User is not a member of this company' })
    if (membership.role === 'owner') {
      return res.status(400).json({ error: 'Owners can\'t be removed from here' })
    }

    const { error: deleteMembershipError } = await supabaseAdmin
      .from('company_users').delete().eq('company_id', companyId).eq('user_id', userId)
    if (deleteMembershipError) throw deleteMembershipError

    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// Role CRUD goes through the caller's own RLS-scoped client (not
// supabaseAdmin) — the roles/role_permissions RLS policies (migration 007)
// already enforce is_team_manager() + company scoping, so this is a real
// second layer, not just the middleware above.
router.post('/roles', requireTeamManager, validateBody(roleSchema), async (req, res, next) => {
  try {
    const { name, fullAccess, pageKeys } = req.body

    const supabase = supabaseForUser(req.accessToken)
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({ name, full_access: fullAccess })
      .select()
      .single()
    if (roleError) {
      const duplicate = roleError.code === '23505'
      return res.status(duplicate ? 409 : 400).json({ error: duplicate ? 'A role with this name already exists' : roleError.message })
    }

    if (!fullAccess && Array.isArray(pageKeys) && pageKeys.length > 0) {
      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(pageKeys.map((page_key) => ({ role_id: role.id, page_key })))
      if (permError) throw permError
    }

    res.status(201).json({ role: { ...role, pageKeys: fullAccess ? [] : (pageKeys || []) } })
  } catch (err) {
    next(err)
  }
})

router.patch('/roles/:id', requireTeamManager, validateBody(updateRoleSchema), async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, fullAccess, pageKeys } = req.body
    const supabase = supabaseForUser(req.accessToken)

    const { data: existing, error: fetchError } = await supabase
      .from('roles').select('is_system').eq('id', id).maybeSingle()
    if (fetchError) throw fetchError
    if (!existing) return res.status(404).json({ error: 'Role not found' })
    if (existing.is_system) return res.status(400).json({ error: 'This is a system role and can\'t be edited' })

    const { error: updateError } = await supabase
      .from('roles')
      .update({ name, full_access: fullAccess })
      .eq('id', id)
    if (updateError) {
      const duplicate = updateError.code === '23505'
      return res.status(duplicate ? 409 : 400).json({ error: duplicate ? 'A role with this name already exists' : updateError.message })
    }

    const { error: deleteOldPermsError } = await supabase.from('role_permissions').delete().eq('role_id', id)
    if (deleteOldPermsError) throw deleteOldPermsError

    if (!fullAccess && Array.isArray(pageKeys) && pageKeys.length > 0) {
      const { error: insertPermsError } = await supabase
        .from('role_permissions').insert(pageKeys.map((page_key) => ({ role_id: id, page_key })))
      if (insertPermsError) throw insertPermsError
    }

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.delete('/roles/:id', requireTeamManager, async (req, res, next) => {
  try {
    const supabase = supabaseForUser(req.accessToken)
    const { error } = await supabase.from('roles').delete().eq('id', req.params.id)
    if (error) return res.status(400).json({ error: error.message })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
