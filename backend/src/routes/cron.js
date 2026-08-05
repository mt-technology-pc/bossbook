import { Router } from 'express'
import nodemailer from 'nodemailer'
import { requireCronSecret } from '../middleware/requireCronSecret.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { todayColombo } from '../lib/todayColombo.js'
import { formatCurrency } from '../lib/formatCurrency.js'
import { buildDailySummaryMessage } from '../lib/dailySmsSummary.js'
import { sendPlainSms } from '../lib/textLk.js'

const router = Router()

// At most one notification per (company, type, related entity, calendar
// day) — every check below in this file calls this before inserting, so a
// cron misfire or manual re-run the same day never duplicates a row, but
// a fresh one appears each new day a bill stays overdue (the "escalate
// daily" effect from the spec) or a balance stays low. For grouped digest
// notifications (bill_due/invoice_due, which reference no single entity —
// see the migration's comment on related_entity_id), relatedEntityId is
// null, which naturally caps those at one digest per company per day too.
async function alreadyNotifiedToday(companyId, type, relatedEntityId, today) {
  let query = supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('type', type)
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999`)

  query = relatedEntityId
    ? query.eq('related_entity_id', relatedEntityId)
    : query.is('related_entity_id', null)

  const { count, error } = await query
  if (error) throw error
  return (count || 0) > 0
}

async function insertNotification(row) {
  const { error } = await supabaseAdmin.from('notifications').insert(row)
  if (error) throw error
}

function daysBetween(fromDate, toDate) {
  return Math.round((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24))
}

async function checkBalances(company, settings, today) {
  let created = 0
  const { data: accounts, error } = await supabaseAdmin
    .from('account_balances')
    .select('account_id, name, type, balance')
    .eq('company_id', company.id)
  if (error) throw error

  for (const account of accounts || []) {
    const threshold = account.type === 'cash' ? settings.threshold_cash_balance : settings.threshold_bank_balance
    if (threshold == null || Number(account.balance) >= Number(threshold)) continue

    const type = account.type === 'cash' ? 'cash_balance_low' : 'bank_balance_low'
    if (await alreadyNotifiedToday(company.id, type, account.account_id, today)) continue

    await insertNotification({
      company_id: company.id,
      type,
      severity: 'warning',
      title: `Low ${account.type} balance — ${account.name}`,
      message: `${account.name} is at ${formatCurrency(account.balance)}, below your ${formatCurrency(threshold)} threshold.`,
      related_entity_type: 'account',
      related_entity_id: account.account_id,
    })
    created += 1
  }
  return created
}

// Shared between bills (purchase_balances/suppliers) and invoices
// (sale_balances/customers) — same due-soon-digest + overdue-per-item
// shape either way, just different table/column names and notification
// types.
async function checkDueAndOverdue(company, settings, today, config) {
  let created = 0
  const { data: rows, error } = await supabaseAdmin
    .from(config.balancesView)
    .select(config.selectCols)
    .eq('company_id', company.id)
    .gt('outstanding', 0)
  if (error) throw error

  const dueSoon = []
  for (const row of rows || []) {
    if (!row.due_date) continue
    const days = daysBetween(today, row.due_date)
    if (days < 0) {
      // Overdue — one notification per bill/invoice, escalating severity
      // the longer it stays unpaid.
      const overdueDays = -days
      if (await alreadyNotifiedToday(company.id, config.overdueType, row[config.idCol], today)) continue

      await insertNotification({
        company_id: company.id,
        type: config.overdueType,
        severity: overdueDays > 3 ? 'critical' : 'warning',
        title: `${config.label} overdue — ${row.reference || config.label}`,
        message: `${row[config.partyCol] || 'Unknown'}: ${formatCurrency(row.outstanding)} was due ${row.due_date}, now ${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue.`,
        related_entity_type: config.entityType,
        related_entity_id: row[config.idCol],
      })
      created += 1
    } else if (days <= settings.days_before_due_alert) {
      dueSoon.push(row)
    }
  }

  // Group same-day-due items into one digest notification per the spec —
  // capped at one per company per day by alreadyNotifiedToday below,
  // regardless of how many distinct due-dates fall in the window today.
  if (dueSoon.length > 0 && !(await alreadyNotifiedToday(company.id, config.dueType, null, today))) {
    const total = dueSoon.reduce((sum, r) => sum + Number(r.outstanding), 0)
    const list = dueSoon
      .map((r) => `${r.reference || config.label} (${formatCurrency(r.outstanding)}, due ${r.due_date})`)
      .join(', ')

    await insertNotification({
      company_id: company.id,
      type: config.dueType,
      severity: 'info',
      title: `${dueSoon.length} ${config.label}${dueSoon.length === 1 ? '' : 's'} due soon`,
      message: `${list} — ${formatCurrency(total)} total.`,
      related_entity_type: null,
      related_entity_id: null,
    })
    created += 1
  }

  return created
}

const BILL_CONFIG = {
  balancesView: 'purchase_balances',
  selectCols: 'purchase_id, reference, due_date, outstanding, supplier_name',
  idCol: 'purchase_id',
  partyCol: 'supplier_name',
  entityType: 'purchase',
  label: 'Bill',
  dueType: 'bill_due',
  overdueType: 'bill_overdue',
}

const INVOICE_CONFIG = {
  balancesView: 'sale_balances',
  selectCols: 'sale_id, reference, due_date, outstanding, customer_name',
  idCol: 'sale_id',
  partyCol: 'customer_name',
  entityType: 'sale',
  label: 'Invoice',
  dueType: 'invoice_due',
  overdueType: 'invoice_overdue',
}

// Best-effort — a company with no SMTP configured just doesn't get an
// email (same behavior email.js already has for the same reason); the
// in-app notifications created above still exist either way.
async function sendDigestEmail(company, notificationsCreatedThisRun) {
  if (notificationsCreatedThisRun === 0) return

  const { data: smtp } = await supabaseAdmin
    .from('smtp_settings')
    .select('*')
    .eq('company_id', company.id)
    .maybeSingle()
  if (!smtp) return

  const { data: owner } = await supabaseAdmin
    .from('company_users')
    .select('user_id')
    .eq('company_id', company.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (!owner) return

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(owner.user_id)
  const ownerEmail = userData?.user?.email
  if (!ownerEmail) return

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.username, pass: smtp.password },
    })
    await transporter.sendMail({
      from: `"${smtp.from_name}" <${smtp.from_email}>`,
      to: ownerEmail,
      subject: `BossBooks: ${notificationsCreatedThisRun} new notification${notificationsCreatedThisRun === 1 ? '' : 's'}`,
      text: `You have ${notificationsCreatedThisRun} new notification${notificationsCreatedThisRun === 1 ? '' : 's'} in BossBooks — open the app to review them.`,
    })
  } catch (err) {
    console.error(`Failed to send notification digest email for company ${company.id}:`, err.message)
  }
}

router.get('/notifications', requireCronSecret, async (req, res, next) => {
  try {
    const today = todayColombo()
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id')
    if (companiesError) throw companiesError

    let companiesProcessed = 0
    let notificationsCreated = 0

    for (const company of companies || []) {
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('notification_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle()

      // A real query error (not just "no row") shouldn't be silently
      // indistinguishable from "this company hasn't configured
      // notifications yet" — log it and move on to the next company
      // rather than letting one bad query end the whole run.
      if (settingsError) {
        console.error(`notification_settings lookup failed for company ${company.id}:`, settingsError.message)
        continue
      }
      // No settings row means this company never configured thresholds —
      // nothing to check against, skip entirely rather than guessing.
      if (!settings) continue

      companiesProcessed += 1
      let createdForCompany = 0

      createdForCompany += await checkBalances(company, settings, today)
      createdForCompany += await checkDueAndOverdue(company, settings, today, BILL_CONFIG)
      createdForCompany += await checkDueAndOverdue(company, settings, today, INVOICE_CONFIG)

      if (createdForCompany > 0 && (settings.channels || []).includes('email')) {
        await sendDigestEmail(company, createdForCompany)
      }

      notificationsCreated += createdForCompany
    }

    res.json({ companiesProcessed, notificationsCreated })
  } catch (err) {
    next(err)
  }
})

// Separate schedule from /notifications (see vercel.json — this one runs
// late at night so it captures the full day's activity, /notifications
// runs in the morning for balance/due-date checks that don't care what
// time of day it is). Independent of the login-alert throttle in sms.js —
// this always sends once per day regardless of whether a login already
// triggered one earlier, since they answer different questions.
router.get('/daily-summary', requireCronSecret, async (req, res, next) => {
  try {
    const today = todayColombo()
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id')
    if (companiesError) throw companiesError

    let companiesProcessed = 0
    let sent = 0

    for (const company of companies || []) {
      const { data: sms, error: smsError } = await supabaseAdmin
        .from('sms_settings')
        .select('api_key, sender_id, notify_phone, last_daily_summary_sent_date')
        .eq('company_id', company.id)
        .maybeSingle()

      if (smsError) {
        console.error(`sms_settings lookup failed for company ${company.id}:`, smsError.message)
        continue
      }
      if (!sms || !sms.notify_phone) continue
      if (sms.last_daily_summary_sent_date === today) continue

      companiesProcessed += 1

      try {
        const message = await buildDailySummaryMessage(supabaseAdmin, today, company.id)
        await sendPlainSms({ apiKey: sms.api_key, senderId: sms.sender_id, phone: sms.notify_phone, message })
        await supabaseAdmin.from('sms_settings').update({ last_daily_summary_sent_date: today }).eq('company_id', company.id)
        sent += 1
      } catch (err) {
        console.error(`daily-summary SMS failed for company ${company.id}:`, err.message)
      }
    }

    res.json({ companiesProcessed, sent })
  } catch (err) {
    next(err)
  }
})

export default router
