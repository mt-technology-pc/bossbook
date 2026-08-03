import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Wallet, Users, HandCoins, AlertCircle, ChevronRight, ArrowLeft,
} from 'lucide-react'
import { useCustomerBalances } from '../../hooks/useCustomerBalances'
import { formatCurrency } from '../../lib/currency'

const ACCENT = '#2f6fed'
const ACCENT_HOVER = '#2559c9'

function ActionButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors"
      style={{ background: ACCENT }}
      onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_HOVER }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT }}
    >
      {children}
    </button>
  )
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="rounded-lg border border-[#e3e6ea] bg-white p-4.5">
      <span
        className="mb-3.5 flex h-9.5 w-9.5 items-center justify-center rounded-lg"
        style={{ background: '#eaf1ff', color: ACCENT }}
      >
        <Icon size={16} />
      </span>
      <p className="text-[26px] font-bold leading-none text-[#2b3648]">{value}</p>
      <p className="mt-1.5 text-[13px] text-[#8b93a1]">{label}</p>
    </div>
  )
}

export default function AccountsReceivable() {
  const { balances, loading, error } = useCustomerBalances()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const owing = balances
    .filter((b) => Number(b.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))

  const filtered = owing.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))

  const totalReceivable = owing.reduce((sum, b) => sum + Number(b.balance), 0)

  const receiveFrom = (e, customerId) => {
    e.stopPropagation()
    navigate('/dashboard/sales/receive-payment', { state: { customerId } })
  }

  return (
    <div className="min-h-screen w-full bg-[#eef1f5] p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-1.5 border-b-2 border-transparent pb-0.5 text-sm font-medium text-[#9aa2ad] transition-colors hover:text-[#2f6fed]"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-bold text-[#2b3648]">Accounts Receivable</h1>
          <p className="mt-1 text-[13px] text-[#8b93a1]">
            Every customer who currently owes you money, and how much.
          </p>
        </div>
        <ActionButton onClick={() => navigate('/dashboard/sales/receive-payment')}>
          <HandCoins size={16} /> Receive payment
        </ActionButton>
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Users} value={owing.length} label="Customers who owe you" />
        <StatCard icon={Wallet} value={formatCurrency(totalReceivable)} label="Total receivable" />
      </div>

      <div className="mt-5 rounded-lg border border-[#e3e6ea] bg-white p-4.5 sm:p-6">
        <div className="flex min-w-[280px] max-w-xs items-center gap-2 rounded-md border border-[#dfe3e8] bg-white px-3.5 py-2.5">
          <Search size={14} className="shrink-0 text-[#9aa2ad]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer name"
            className="w-full border-none bg-transparent text-[13px] text-[#333] outline-none placeholder:text-[#9aa2ad]"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#2f6fed]/30 border-t-[#2f6fed]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#eaf1ff', color: ACCENT }}>
              <Wallet size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-[#2b3648]">
              {owing.length === 0 ? 'Nobody owes you right now' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-[#8b93a1]">
              {owing.length === 0
                ? 'Every customer is settled — invoice a credit sale to see it appear here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#eef0f3]">
                  <th className="whitespace-nowrap px-0 py-3.5 text-xs font-semibold text-[#8b93a1]">Customer</th>
                  <th className="whitespace-nowrap px-3 py-3.5 text-right text-xs font-semibold text-[#8b93a1]">Balance owed</th>
                  <th className="px-3 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.customer_id}
                    onClick={() => navigate(`/dashboard/customers/${b.customer_id}`)}
                    className="cursor-pointer border-b border-[#f1f3f6] last:border-0 hover:bg-[#fafbfc]"
                  >
                    <td className="py-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ background: ACCENT }}
                        >
                          {b.name.charAt(0).toUpperCase()}
                        </span>
                        <p className="font-bold text-[#2b3648]">{b.name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right font-bold" style={{ color: ACCENT }}>
                      {formatCurrency(b.balance)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => receiveFrom(e, b.customer_id)}
                          className="flex items-center gap-1.5 rounded-md border border-[#dfe3e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a5568] transition-colors hover:border-[#2f6fed] hover:text-[#2f6fed]"
                        >
                          <HandCoins size={13} /> Receive
                        </button>
                        <ChevronRight size={15} className="text-[#c3c9d1]" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
