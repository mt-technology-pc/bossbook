import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, FileText, Receipt, AlertCircle, TrendingUp, ListOrdered,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function SalesRepDetail() {
  const { id } = useParams()
  const [rep, setRep] = useState(null)
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase.from('sales_reps').select('*').eq('id', id).single(),
      supabase
        .from('sales')
        .select('id, type, reference, sale_date, due_date, total_amount, customers(name)')
        .eq('sales_rep_id', id)
        .order('sale_date', { ascending: false }),
    ]).then(([repRes, salesRes]) => {
      if (cancelled) return
      if (repRes.error || !repRes.data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setRep(repRes.data)
      if (salesRes.error) setError(salesRes.error.message)
      else setSales(salesRes.data ?? [])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-ink-600">Sales rep not found</p>
        <Link to="/dashboard/sales-reps" className="mt-4 text-sm font-medium text-clay-600 hover:text-clay-700">
          Back to sales reps
        </Link>
      </div>
    )
  }

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0)

  return (
    <div>
      <Link
        to="/dashboard/sales-reps"
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
      >
        <ArrowLeft size={15} /> Sales Reps
      </Link>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-ink-400/15 bg-cream-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 font-heading text-xl font-semibold text-cream-50">
            {rep.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="font-heading text-xl font-semibold text-ink-900 sm:text-2xl">
              {rep.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
              {rep.code && <span className="font-mono">{rep.code}</span>}
              {rep.phone && (
                <span className="flex items-center gap-1"><Phone size={12} /> {rep.phone}</span>
              )}
              {rep.email && (
                <span className="flex items-center gap-1"><Mail size={12} /> {rep.email}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-xs text-ink-400">
              <ListOrdered size={12} /> Sales
            </p>
            <p className="font-heading text-xl font-semibold text-ink-900">{sales.length}</p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-xs text-ink-400">
              <TrendingUp size={12} /> Total
            </p>
            <p className="font-heading text-xl font-semibold text-ink-900">{formatCurrency(totalSales)}</p>
          </div>
        </div>
      </div>

      {rep.notes && (
        <p className="mt-3 rounded-xl bg-cream-200/60 px-4 py-3 text-sm text-ink-500">
          {rep.notes}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-ink-900">
          Sales
        </h2>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
              <TrendingUp size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              No sales attributed to {rep.name} yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              Pick this rep when creating an invoice or sales receipt to see it show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-ink-400/10">
            {sales.map((s, i) => {
              const isInvoice = s.type === 'invoice'
              return (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                  className="flex items-center justify-between gap-3 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
                      {isInvoice ? <FileText size={16} /> : <Receipt size={16} />}
                    </span>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
                        {s.reference || (isInvoice ? 'Invoice' : 'Receipt')}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isInvoice
                              ? 'bg-clay-500/15 text-clay-600'
                              : 'bg-ink-400/10 text-ink-500'
                          }`}
                        >
                          {isInvoice ? 'Invoice' : 'Receipt'}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {s.customers?.name || 'Walk-in customer'} · {formatDate(s.sale_date)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-ink-700">
                    {formatCurrency(s.total_amount)}
                  </span>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
