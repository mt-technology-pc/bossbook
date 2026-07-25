import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'

const router = Router()

router.use(requireAuth, requireAdmin)

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

    const users = await Promise.all(
      memberships.map(async (m) => {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(m.user_id)
        return {
          userId: m.user_id,
          role: m.role,
          joinedAt: m.created_at,
          email: userData?.user?.email || null,
          fullName: userData?.user?.user_metadata?.full_name || null,
          lastSignInAt: userData?.user?.last_sign_in_at || null,
        }
      }),
    )

    res.json({ company, users })
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

export default router
