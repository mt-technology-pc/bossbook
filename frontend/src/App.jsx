import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import About from './pages/About'
import Login from './pages/Login'
import Overview from './pages/dashboard/Overview'
import Inventory from './pages/dashboard/Inventory'
import LabelGenerator from './pages/dashboard/LabelGenerator'
import Customers from './pages/dashboard/Customers'
import CustomerDetail from './pages/dashboard/CustomerDetail'
import Suppliers from './pages/dashboard/Suppliers'
import SupplierDetail from './pages/dashboard/SupplierDetail'
import Purchases from './pages/dashboard/Purchases'
import NewPurchase from './pages/dashboard/NewPurchase'
import Sales from './pages/dashboard/Sales'
import SalesReps from './pages/dashboard/SalesReps'
import SalesRepDetail from './pages/dashboard/SalesRepDetail'
import NewInvoice from './pages/dashboard/NewInvoice'
import NewSalesReceipt from './pages/dashboard/NewSalesReceipt'
import ReceivePayment from './pages/dashboard/ReceivePayment'
import CustomerPayments from './pages/dashboard/CustomerPayments'
import PayBill from './pages/dashboard/PayBill'
import SupplierPayments from './pages/dashboard/SupplierPayments'
import AccountDetail from './pages/dashboard/AccountDetail'
import Reports from './pages/dashboard/Reports'
import InventoryValuationReport from './pages/dashboard/InventoryValuationReport'
import ProductLedger from './pages/dashboard/ProductLedger'
import IncomeStatementReport from './pages/dashboard/IncomeStatementReport'
import GainLossReport from './pages/dashboard/GainLossReport'
import SalesDayBookReport from './pages/dashboard/SalesDayBookReport'
import PurchaseDayBookReport from './pages/dashboard/PurchaseDayBookReport'
import AccountsReceivable from './pages/dashboard/AccountsReceivable'
import AccountsPayable from './pages/dashboard/AccountsPayable'
import ChartOfAccounts from './pages/dashboard/ChartOfAccounts'
import GeneralLedger from './pages/dashboard/GeneralLedger'
import TrialBalance from './pages/dashboard/TrialBalance'
import Expenses from './pages/dashboard/Expenses'
import SerialTracking from './pages/dashboard/SerialTracking'
import Backup from './pages/dashboard/Backup'
import Settings from './pages/dashboard/Settings'
import ComingSoon from './pages/dashboard/ComingSoon'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import DashboardLayout from './layouts/DashboardLayout'
import AdminLayout from './layouts/AdminLayout'
import UtilityWidgets from './components/widgets/UtilityWidgets'
import PrivacyQuickSwitch from './components/widgets/PrivacyQuickSwitch'
import DecoySalesReceipt from './components/widgets/DecoySalesReceipt'
import { useLockState } from './hooks/useLockState'
import AdminLogin from './pages/admin/AdminLogin'
import AdminCompanies from './pages/admin/AdminCompanies'
import AdminCompanyDetail from './pages/admin/AdminCompanyDetail'
import AdminIntegrations from './pages/admin/AdminIntegrations'
import { useAuth } from './context/AuthContext'

function App() {
  const { user, loading: authLoading } = useAuth()
  const [locked, setLocked] = useLockState()

  // Without an authenticated user, "locked" is meaningless — clear it so
  // a stray leftover flag (from any sign-out path, not just the shortcut's
  // own) can never strand a fresh, legitimate login into decoy mode.
  //
  // Critically gated on `!authLoading` too, not just `!user` — right after
  // every reload, `user` is transiently null for the brief window before
  // Supabase's getSession() resolves, even when a real session exists.
  // Without the authLoading check, this effect fired during that window
  // on EVERY reload and cleared a legitimate lock before auth ever got a
  // chance to confirm the user was actually still logged in — this was a
  // real, confirmed bug: reloading while locked silently unlocked the app.
  useEffect(() => {
    if (!authLoading && !user && locked) setLocked(false)
  }, [user, authLoading, locked, setLocked])

  if (locked) {
    // Gated on `locked` alone, not `user && locked` — `locked` is read
    // synchronously on the very first render (useLockState's lazy
    // useState initializer), before Supabase's getSession() has even had
    // a chance to resolve. Requiring `user` too would mean that on every
    // reload, there's a real window (however brief) where `user` is still
    // null and this check would fail open into the real route tree.
    // Gating on `locked` alone means the decoy shows immediately, with no
    // dependency on auth-resolution timing at all — the only way `locked`
    // is true with no real user behind it is the stale-flag edge case the
    // cleanup effect above already handles (a one-render flash of the
    // decoy before it corrects itself, not a leak of anything real).
    //
    // Replaces the ENTIRE route tree — no sidebar, no other page is ever
    // mounted while locked, which is what actually blocks navigation
    // (there's nothing real for the sidebar/back-button/a typed URL to
    // reveal, since nothing else renders at all). PrivacyQuickSwitch stays
    // mounted below so the same shortcut can still sign out of this.
    return (
      <>
        <DecoySalesReceipt />
        <PrivacyQuickSwitch />
      </>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminCompanies />} />
          <Route path="companies/:id" element={<AdminCompanyDetail />} />
          <Route path="integrations" element={<AdminIntegrations />} />
        </Route>

        <Route
          path="/dashboard/purchases/new"
          element={
            <ProtectedRoute>
              <NewPurchase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/purchases/new/:id"
          element={
            <ProtectedRoute>
              <NewPurchase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/sales/new-invoice"
          element={
            <ProtectedRoute>
              <NewInvoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/sales/new-invoice/:id"
          element={
            <ProtectedRoute>
              <NewInvoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/sales/new-receipt"
          element={
            <ProtectedRoute>
              <NewSalesReceipt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/sales/new-receipt/:id"
          element={
            <ProtectedRoute>
              <NewSalesReceipt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/sales/receive-payment"
          element={
            <ProtectedRoute>
              <ReceivePayment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/sales/receive-payment/:id"
          element={
            <ProtectedRoute>
              <ReceivePayment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/purchases/pay-bill"
          element={
            <ProtectedRoute>
              <PayBill />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/purchases/pay-bill/:id"
          element={
            <ProtectedRoute>
              <PayBill />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/labels" element={<LabelGenerator />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="receivables" element={<AccountsReceivable />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="suppliers/:id" element={<SupplierDetail />} />
          <Route path="payables" element={<AccountsPayable />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="purchases/payments-made" element={<SupplierPayments />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sales/payments-received" element={<CustomerPayments />} />
          <Route path="sales-reps" element={<SalesReps />} />
          <Route path="sales-reps/:id" element={<SalesRepDetail />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="accounts/:id" element={<AccountDetail />} />
          <Route path="serial-tracking" element={<SerialTracking />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/inventory-valuation" element={<InventoryValuationReport />} />
          <Route path="reports/inventory-valuation/:id" element={<ProductLedger />} />
          <Route path="reports/income-statement" element={<IncomeStatementReport />} />
          <Route path="reports/gain-and-loss" element={<GainLossReport />} />
          <Route path="reports/sales-day-book" element={<SalesDayBookReport />} />
          <Route path="reports/purchase-day-book" element={<PurchaseDayBookReport />} />
          <Route path="reports/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="reports/general-ledger" element={<GeneralLedger />} />
          <Route path="reports/general-ledger/:coaId" element={<GeneralLedger />} />
          <Route path="reports/trial-balance" element={<TrialBalance />} />
          <Route path="team" element={<ComingSoon title="Team" />} />
          <Route path="settings" element={<Settings />} />
          <Route path="backup" element={<Backup />} />
          <Route path="*" element={<ComingSoon />} />
        </Route>
      </Routes>
      {user && <UtilityWidgets />}
      {user && <PrivacyQuickSwitch />}
    </>
  )
}

export default App
