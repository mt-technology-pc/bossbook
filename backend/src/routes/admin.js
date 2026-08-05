import { Router } from 'express'
import { z } from 'zod'
import { ZipArchive } from 'archiver'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { validateBody } from '../middleware/validate.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { BACKUP_TABLES } from '../lib/backupTables.js'
import { buildBackupSql } from '../lib/buildBackupSql.js'
import { buildBackupWorkbook } from '../lib/buildBackupWorkbook.js'

const router = Router()

router.use(requireAuth, requireAdmin)

// amount was previously passed straight to the RPC with no validation at
// all — z.coerce.number() still accepts a numeric string (in case the
// frontend ever sends one from a form field) while rejecting anything
// that isn't actually a number, instead of the RPC surfacing a confusing
// Postgres type-cast error for bad input.
const receivePaymentSchema = z.object({
  customerId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  note: z.string().trim().optional().nullable(),
  paymentDate: z.string().trim().optional().nullable(),
  saleId: z.string().uuid().optional().nullable(),
})

const payBillSchema = z.object({
  supplierId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  note: z.string().trim().optional().nullable(),
  paymentDate: z.string().trim().optional().nullable(),
  purchaseId: z.string().uuid().optional().nullable(),
})

// List every company, with a registered-user count per company — the
// service-role client bypasses RLS, which is exactly what a cross-tenant
// admin view needs (the same reason supabaseAdmin exists in this codebase
// already, just never wired to a route until now).
router.get('/companies', async (req, res, next) => {
  try {
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (companiesError) throw companiesError

    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('company_users')
      .select('company_id')

    if (membershipsError) throw membershipsError

    const counts = {}
    for (const m of memberships) counts[m.company_id] = (counts[m.company_id] || 0) + 1

    res.json({
      companies: companies.map((c) => ({ ...c, userCount: counts[c.id] || 0 })),
    })
  } catch (err) {
    next(err)
  }
})

// Company detail + its users (with email, resolved from auth.users via the
// service-role admin API since company_users only stores user_id — the
// auth schema isn't exposed through the regular PostgREST/from() client).
router.get('/companies/:id', async (req, res, next) => {
  try {
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (companyError) throw companyError

    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('company_users')
      .select('user_id, role, created_at')
      .eq('company_id', req.params.id)
      .order('created_at', { ascending: true })

    if (membershipsError) throw membershipsError

    // A membership can outlive its auth.users row (e.g. deleted outside
    // this app) — getUserById errors for those instead of returning data,
    // which previously broke the whole page via Promise.all. Mark that
    // row orphaned instead so the rest of the list still renders.
    const users = await Promise.all(
      memberships.map(async (m) => {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(m.user_id)
        if (userError || !userData?.user) {
          return {
            userId: m.user_id,
            role: m.role,
            joinedAt: m.created_at,
            orphaned: true,
            email: null,
            fullName: null,
            lastSignInAt: null,
          }
        }
        return {
          userId: m.user_id,
          role: m.role,
          joinedAt: m.created_at,
          email: userData.user.email || null,
          fullName: userData.user.user_metadata?.full_name || null,
          lastSignInAt: userData.user.last_sign_in_at || null,
        }
      }),
    )

    res.json({ company, users })
  } catch (err) {
    next(err)
  }
})

// Pauses/unpauses a company (e.g. non-payment) — goes through the
// admin_set_company_paused RPC (not a direct .update()) since the real
// enforcement lives in current_company_id() being pause-aware, and this
// keeps the "only a platform admin can flip this" check inside the
// database itself, not just this route.
//
// Called via supabaseForUser (the admin's OWN session), not supabaseAdmin
// — this and the other admin_* RPCs below are security definer and check
// is_platform_admin() internally, which reads auth.uid(). A service-role
// call has no auth.uid() at all (null), so is_platform_admin() would
// always fail regardless of who's actually calling — confirmed live. The
// function grants itself the elevated access it needs internally; it
// just needs the caller's real identity to authorize against.
router.patch('/companies/:id/pause', async (req, res, next) => {
  try {
    const { paused } = req.body || {}
    if (typeof paused !== 'boolean') {
      return res.status(400).json({ error: 'paused must be true or false' })
    }

    const supabase = supabaseForUser(req.accessToken)
    const { error } = await supabase.rpc('admin_set_company_paused', {
      p_company_id: req.params.id,
      p_paused: paused,
    })
    if (error) return res.status(400).json({ error: error.message })

    const { data: company, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (fetchError) throw fetchError

    res.json({ company })
  } catch (err) {
    next(err)
  }
})

// Partial update of a company's feature-toggle bag — merges into the
// existing jsonb rather than replacing it, so adding one new key doesn't
// require the client to resend every existing one.
router.patch('/companies/:id/features', async (req, res, next) => {
  try {
    const { features } = req.body
    if (!features || typeof features !== 'object' || Array.isArray(features)) {
      return res.status(400).json({ error: 'features must be an object' })
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('features')
      .eq('id', req.params.id)
      .single()

    if (fetchError) throw fetchError

    const merged = { ...(existing.features || {}), ...features }

    const { data, error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ features: merged })
      .eq('id', req.params.id)
      .select()
      .single()

    if (updateError) throw updateError

    res.json({ company: data })
  } catch (err) {
    next(err)
  }
})

// Creates a login for someone new and adds them to this company. No
// public signup exists in this app (see Login.jsx) — this is the actual
// provisioning path its own copy promises. Uses a temporary password the
// admin sets and hands off out-of-band, not an email invite (no
// dependency on Supabase's own email delivery being configured).
router.post('/companies/:id/users', async (req, res, next) => {
  try {
    const companyId = req.params.id
    const { email, password, role } = req.body || {}

    if (!email || !password || !['owner', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'email, password, and a valid role are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Temporary password must be at least 8 characters' })
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .single()
    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    // handle_new_user() (schema.sql) fires immediately on this insert and
    // unconditionally auto-provisions a throwaway company + owner
    // membership for any brand-new user — there's no metadata flag it
    // checks to skip itself. Cleaned up below, not avoided.
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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

    // Delete handle_new_user()'s bogus company — cascades to remove its
    // bogus company_users row too (company_id references companies(id)
    // on delete cascade) — then insert the real membership.
    const { data: bogusMembership } = await supabaseAdmin
      .from('company_users')
      .select('company_id')
      .eq('user_id', newUserId)
      .maybeSingle()

    if (bogusMembership?.company_id) {
      await supabaseAdmin.from('companies').delete().eq('id', bogusMembership.company_id)
    }

    const { error: membershipError } = await supabaseAdmin
      .from('company_users')
      .insert({ user_id: newUserId, company_id: companyId, role })

    if (membershipError) {
      // Don't leave a dangling auth user with no company behind.
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw membershipError
    }

    res.status(201).json({
      user: { userId: newUserId, email, role, temporaryPassword: password },
    })
  } catch (err) {
    next(err)
  }
})

// Removes a user's login entirely, not just their company membership —
// this app's model has no notion of a user without a company
// (current_company_id() would return null and every policy keyed off it
// would deny everything), so a dangling auth account would just be a
// dead, empty login. Refuses to remove a company's only remaining owner.
router.delete('/companies/:id/users/:userId', async (req, res, next) => {
  try {
    const { id: companyId, userId } = req.params

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('company_users')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (membershipError) throw membershipError
    if (!membership) return res.status(404).json({ error: 'User is not a member of this company' })

    if (membership.role === 'owner') {
      const { count, error: ownerCountError } = await supabaseAdmin
        .from('company_users')
        .select('user_id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'owner')

      if (ownerCountError) throw ownerCountError
      if ((count ?? 0) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the only owner of a company' })
      }
    }

    const { error: deleteMembershipError } = await supabaseAdmin
      .from('company_users')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', userId)

    if (deleteMembershipError) throw deleteMembershipError

    // Best-effort — if the auth user was already gone (orphaned
    // membership being cleaned up), this errors harmlessly; the
    // membership row above is already deleted either way.
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// Outstanding invoices/bills + accounts for this company — what the
// admin "mark paid" screen needs to list and pick from.
router.get('/companies/:id/outstanding', async (req, res, next) => {
  try {
    const companyId = req.params.id

    const [salesRes, purchasesRes, accountsRes] = await Promise.all([
      supabaseAdmin.from('sale_balances').select('*').eq('company_id', companyId).gt('outstanding', 0),
      supabaseAdmin.from('purchase_balances').select('*').eq('company_id', companyId).gt('outstanding', 0),
      supabaseAdmin.from('accounts').select('id, name, type').eq('company_id', companyId),
    ])

    if (salesRes.error) throw salesRes.error
    if (purchasesRes.error) throw purchasesRes.error
    if (accountsRes.error) throw accountsRes.error

    res.json({
      outstandingSales: salesRes.data,
      outstandingPurchases: purchasesRes.data,
      accounts: accountsRes.data,
    })
  } catch (err) {
    next(err)
  }
})

// Records a real payment (real journal entry, same rigor as the owner's
// own Receive Payment page) on behalf of this company — see schema.sql's
// admin_receive_payment for why this can't just call the regular
// receive_payment RPC (it derives the company from the CALLER's own
// session, which for an admin would be the admin's own company).
router.post('/companies/:id/receive-payment', validateBody(receivePaymentSchema), async (req, res, next) => {
  try {
    const { customerId, accountId, amount, note, paymentDate, saleId } = req.body
    const supabase = supabaseForUser(req.accessToken)
    const { data, error } = await supabase.rpc('admin_receive_payment', {
      p_company_id: req.params.id,
      p_customer_id: customerId,
      p_account_id: accountId,
      p_amount: amount,
      p_note: note || null,
      p_payment_date: paymentDate || null,
      p_sale_id: saleId || null,
    })
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ transactionId: data })
  } catch (err) {
    next(err)
  }
})

router.post('/companies/:id/pay-bill', validateBody(payBillSchema), async (req, res, next) => {
  try {
    const { supplierId, accountId, amount, note, paymentDate, purchaseId } = req.body
    const supabase = supabaseForUser(req.accessToken)
    const { data, error } = await supabase.rpc('admin_pay_bill', {
      p_company_id: req.params.id,
      p_supplier_id: supplierId,
      p_account_id: accountId,
      p_amount: amount,
      p_note: note || null,
      p_payment_date: paymentDate || null,
      p_purchase_id: purchaseId || null,
    })
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ paymentId: data })
  } catch (err) {
    next(err)
  }
})

// Same zip-of-sql-plus-xlsx shape as the owner-facing /api/backup/download
// (backend/src/routes/backup.js), just querying via supabaseAdmin filtered
// to the target company instead of the caller's own RLS-scoped session.
router.get('/companies/:id/backup', async (req, res, next) => {
  try {
    const companyId = req.params.id

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()
    if (companyError || !company) return res.status(404).json({ error: 'Company not found' })

    const results = await Promise.all(
      BACKUP_TABLES.map((name) => supabaseAdmin.from(name).select('*').eq('company_id', companyId)),
    )

    const failed = results.find((r) => r.error)
    if (failed) {
      return res.status(500).json({ error: `Could not read backup data: ${failed.error.message}` })
    }

    const tables = BACKUP_TABLES.map((name, i) => ({ name, rows: results[i].data || [] }))
    const sql = buildBackupSql(tables)
    const xlsxBuffer = await buildBackupWorkbook(tables)

    const safeName = company.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const filename = `bossbooks-backup-${safeName}-${new Date().toISOString().slice(0, 10)}.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const archive = new ZipArchive()
    archive.on('error', (err) => next(err))
    archive.pipe(res)
    archive.append(sql, { name: 'backup.sql' })
    archive.append(xlsxBuffer, { name: 'backup.xlsx' })
    await archive.finalize()
  } catch (err) {
    next(err)
  }
})

export default router
