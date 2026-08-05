import { computeIncomeStatement } from './incomeStatement.js'
import { formatCurrency } from './formatCurrency.js'

// Single source of truth for the daily summary text, shared by the login
// alert (backend/src/routes/sms.js) and the end-of-day cron
// (backend/src/routes/cron.js) so they can never drift into two different
// formats. Modeled on a competitor's SMS format the user shared, adapted
// to what this app actually tracks — no payment-method breakdown
// (cash/credit/cheque/card) or cheque-return tracking exist in this data
// model (confirmed before building this), so this reports Sales, Due
// Received, Expenses, and Gross Profit instead.
//
// `companyId` optional/additive, same reasoning as computeIncomeStatement:
// pass it when `supabase` is the service-role client (the cron job, no
// RLS in effect); omit it when `supabase` is already RLS-scoped to one
// company (the login-alert route, called with the caller's own session).
export async function buildDailySummaryMessage(supabase, today, companyId) {
  const scoped = (query) => (companyId ? query.eq('company_id', companyId) : query)

  const [salesRes, paymentsRes, expensesRes, incomeStatement] = await Promise.all([
    scoped(supabase.from('sales').select('total_amount').eq('sale_date', today)),
    scoped(supabase.from('customer_transactions').select('amount').eq('type', 'payment')).gte('created_at', `${today}T00:00:00`).lt('created_at', `${today}T23:59:59.999`),
    scoped(supabase.from('expenses').select('amount').eq('expense_date', today)),
    computeIncomeStatement(supabase, today, today, companyId),
  ])

  if (salesRes.error) throw new Error(salesRes.error.message)
  if (paymentsRes.error) throw new Error(paymentsRes.error.message)
  if (expensesRes.error) throw new Error(expensesRes.error.message)
  if (incomeStatement.error) throw new Error(incomeStatement.error)

  const totalSales = (salesRes.data || []).reduce((sum, s) => sum + Number(s.total_amount), 0)
  const totalDueReceived = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + Number(e.amount), 0)

  return [
    `BossBooks Daily Summary — ${today}`,
    '',
    `Sales: ${formatCurrency(totalSales)}`,
    `Due Received: ${formatCurrency(totalDueReceived)}`,
    `Expenses: ${formatCurrency(totalExpenses)}`,
    '',
    `Gross Profit: ${formatCurrency(incomeStatement.gross_profit)}`,
  ].join('\n')
}
