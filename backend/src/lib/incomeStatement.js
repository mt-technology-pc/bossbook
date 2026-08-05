import { computeProductValuation } from './inventoryValuation.js'
import { todayColombo } from './todayColombo.js'

// Extracted verbatim from assistantTools.js's `get_income_statement` case
// — the authoritative way to compute profit (accrual basis, FIFO cost of
// goods sold), shared by the assistant tool and the daily SMS summary so
// there's exactly one place this math lives, not two that could drift.
//
// `companyId` is optional and additive — the assistant never passes it
// (its `supabase` is always the caller's own RLS-scoped client, so RLS
// alone already scopes every query to one company, exactly as before this
// param existed). The daily SMS summary's cron job, on the other hand,
// uses the service-role client (no user session to scope RLS by, since
// nobody's logged in when a cron fires) iterating every company in turn —
// without an explicit filter it would silently mix every company's
// products/sales/expenses together. Passing companyId there makes the
// filter explicit instead of relying on RLS that isn't in effect.
export async function computeIncomeStatement(supabase, fromDateArg, toDateArg, companyId) {
  const toDate = toDateArg || todayColombo()
  const fromDate = fromDateArg || `${toDate.slice(0, 7)}-01`

  const scoped = (query) => (companyId ? query.eq('company_id', companyId) : query)

  const [productsRes, purchaseItemsRes, saleItemsRes, expensesRes] = await Promise.all([
    scoped(supabase.from('products').select('*')),
    scoped(supabase.from('purchase_items').select('*, purchases(bill_date, reference)')),
    scoped(supabase.from('sale_items').select('*, sales(sale_date, type, reference)')),
    scoped(supabase.from('expenses').select('*')),
  ])
  if (productsRes.error) return { error: productsRes.error.message }
  if (purchaseItemsRes.error) return { error: purchaseItemsRes.error.message }
  if (saleItemsRes.error) return { error: saleItemsRes.error.message }
  if (expensesRes.error) return { error: expensesRes.error.message }

  const products = productsRes.data
  const purchaseItems = purchaseItemsRes.data
  const saleItems = saleItemsRes.data
  const expenses = expensesRes.data

  const revenueByCategory = new Map()
  let totalRevenue = 0
  let totalCogs = 0

  products.forEach((product) => {
    const pItems = purchaseItems.filter((pi) => pi.product_id === product.id)
    const sItems = saleItems.filter((si) => si.product_id === product.id)
    const inPeriod = sItems.some((s) => s.sales?.sale_date >= fromDate && s.sales?.sale_date <= toDate)
    if (!inPeriod) return

    const valuation = computeProductValuation(product, pItems, sItems, { asOfDate: toDate, method: 'fifo' })
    const category = product.category || 'Uncategorized'
    const bucket = revenueByCategory.get(category) ?? { category, revenue: 0, cogs: 0 }

    valuation.ledger
      .filter((e) => e.type === 'out' && e.date >= fromDate && e.date <= toDate)
      .forEach((e) => {
        const revenue = e.qty * (e.unitPrice ?? 0)
        bucket.revenue += revenue
        bucket.cogs += e.cogs ?? 0
        totalRevenue += revenue
        totalCogs += e.cogs ?? 0
      })

    revenueByCategory.set(category, bucket)
  })

  const categories = [...revenueByCategory.values()]
    .map((c) => ({ ...c, grossProfit: c.revenue - c.cogs }))
    .sort((a, b) => b.revenue - a.revenue)

  const expensesInPeriod = expenses.filter((e) => e.expense_date >= fromDate && e.expense_date <= toDate)
  const totalExpenses = expensesInPeriod.reduce((sum, e) => sum + Number(e.amount), 0)

  const grossProfit = totalRevenue - totalCogs
  const netIncome = grossProfit - totalExpenses

  return {
    from_date: fromDate,
    to_date: toDate,
    total_revenue: totalRevenue,
    total_cost_of_goods_sold: totalCogs,
    gross_profit: grossProfit,
    total_expenses: totalExpenses,
    net_profit: netIncome,
    by_category: categories,
  }
}
