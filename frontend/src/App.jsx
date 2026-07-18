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
import SalesDayBookReport from './pages/dashboard/SalesDayBookReport'
import PurchaseDayBookReport from './pages/dashboard/PurchaseDayBookReport'
import AccountsReceivable from './pages/dashboard/AccountsReceivable'
import AccountsPayable from './pages/dashboard/AccountsPayable'
import ChartOfAccounts from './pages/dashboard/ChartOfAccounts'
import GeneralLedger from './pages/dashboard/GeneralLedger'
import TrialBalance from './pages/dashboard/TrialBalance'
import Expenses from './pages/dashboard/Expenses'
import SerialTracking from './pages/dashboard/SerialTracking'
import ComingSoon from './pages/dashboard/ComingSoon'
import ProtectedRoute from './components/auth/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />

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
        <Route path="reports/sales-day-book" element={<SalesDayBookReport />} />
        <Route path="reports/purchase-day-book" element={<PurchaseDayBookReport />} />
        <Route path="reports/chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="reports/general-ledger" element={<GeneralLedger />} />
        <Route path="reports/general-ledger/:coaId" element={<GeneralLedger />} />
        <Route path="reports/trial-balance" element={<TrialBalance />} />
        <Route path="team" element={<ComingSoon title="Team" />} />
        <Route path="settings" element={<ComingSoon title="Settings" />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  )
}

export default App
