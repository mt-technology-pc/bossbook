// Cross-tenant isolation check — creates two throwaway test companies,
// seeds one customer under Company A, then asserts Company B's session can
// see none of it: neither via a direct table read (proves RLS) nor via an
// RPC call targeting Company A's customer id (proves the security-definer
// ownership check inside the RPC, since RLS doesn't apply to those).
//
// Run this against a SCRATCH/STAGING Supabase project only — never
// production — before applying the multi-tenancy migration for real.
// Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY in
// backend/.env (the same vars the app already uses).
//
//   cd backend && node scripts/test-tenant-isolation.js
//
// Cleans up its own test users/data on both success and failure.

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in backend/.env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const stamp = Date.now()
const userAEmail = `isolation-test-a-${stamp}@example.com`
const userBEmail = `isolation-test-b-${stamp}@example.com`
const password = `Test-${stamp}-!Aa1`

let userAId, userBId
let failed = false

async function assert(condition, message) {
  if (condition) {
    console.log(`  PASS  ${message}`)
  } else {
    failed = true
    console.log(`  FAIL  ${message}`)
  }
}

async function signInAs(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session.access_token
}

async function cleanup() {
  if (userAId) await admin.auth.admin.deleteUser(userAId)
  if (userBId) await admin.auth.admin.deleteUser(userBId)
}

async function main() {
  console.log('Creating two test users (each auto-provisions its own company via the on_auth_user_created trigger)...')

  const { data: userA, error: errA } = await admin.auth.admin.createUser({
    email: userAEmail, password, email_confirm: true,
    user_metadata: { full_name: 'Isolation Test A', company_name: 'Isolation Test Co A' },
  })
  if (errA) throw errA
  userAId = userA.user.id

  const { data: userB, error: errB } = await admin.auth.admin.createUser({
    email: userBEmail, password, email_confirm: true,
    user_metadata: { full_name: 'Isolation Test B', company_name: 'Isolation Test Co B' },
  })
  if (errB) throw errB
  userBId = userB.user.id

  const tokenA = await signInAs(userAEmail)
  const tokenB = await signInAs(userBEmail)

  const asA = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${tokenA}` } },
  })
  const asB = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${tokenB}` } },
  })

  const { data: companyAId } = await asA.rpc('current_company_id')
  const { data: companyBId } = await asB.rpc('current_company_id')
  await assert(Boolean(companyAId), 'Company A auto-provisioned on signup')
  await assert(Boolean(companyBId), 'Company B auto-provisioned on signup')
  await assert(companyAId !== companyBId, 'Company A and Company B are different companies')

  console.log('Seeding a customer under Company A...')
  const { data: customer, error: customerErr } = await asA
    .from('customers')
    .insert({ name: 'Isolation Test Customer' })
    .select()
    .single()
  if (customerErr) throw customerErr
  await assert(customer.company_id === companyAId, "New customer's company_id matches Company A (column DEFAULT worked)")

  console.log('Checking Company B cannot see it via a direct table read (RLS)...')
  const { data: crossRead } = await asB.from('customers').select('*').eq('id', customer.id)
  await assert((crossRead ?? []).length === 0, 'Direct table read returns zero rows for Company B (RLS enforced)')

  console.log("Checking Company B's session cannot use it via receive_payment() (security-definer RPC check)...")
  const { data: accountA } = await asA
    .from('accounts')
    .insert({ name: 'Isolation Test Cash', type: 'cash', opening_balance: 0 })
    .select()
    .single()
  const { error: rpcErr } = await asB.rpc('receive_payment', {
    p_customer_id: customer.id,
    p_account_id: accountA.id,
    p_amount: 100,
    p_note: 'should be rejected',
  })
  await assert(Boolean(rpcErr), 'receive_payment() rejects Company B targeting Company A\'s customer/account')

  console.log(failed ? '\nSome checks FAILED — isolation is not fully working. Do not apply this migration to production.' : '\nAll checks passed.')
}

main()
  .catch((err) => {
    failed = true
    console.error('Unexpected error during isolation test:', err)
  })
  .finally(async () => {
    console.log('\nCleaning up test users...')
    await cleanup()
    process.exit(failed ? 1 : 0)
  })
