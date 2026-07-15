import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import About from './pages/About'
import Login from './pages/Login'
import Overview from './pages/dashboard/Overview'
import Inventory from './pages/dashboard/Inventory'
import Customers from './pages/dashboard/Customers'
import CustomerDetail from './pages/dashboard/CustomerDetail'
import Suppliers from './pages/dashboard/Suppliers'
import SupplierDetail from './pages/dashboard/SupplierDetail'
import Purchases from './pages/dashboard/Purchases'
import NewPurchase from './pages/dashboard/NewPurchase'
import Sales from './pages/dashboard/Sales'
import NewInvoice from './pages/dashboard/NewInvoice'
import NewSalesReceipt from './pages/dashboard/NewSalesReceipt'
import ReceivePayment from './pages/dashboard/ReceivePayment'
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
        path="/dashboard/sales/new-invoice"
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
        path="/dashboard/sales/receive-payment"
        element={
          <ProtectedRoute>
            <ReceivePayment />
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
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="sales" element={<Sales />} />
        <Route path="serial-tracking" element={<ComingSoon title="Serial tracking" />} />
        <Route path="reports" element={<ComingSoon title="Reports" />} />
        <Route path="team" element={<ComingSoon title="Team" />} />
        <Route path="settings" element={<ComingSoon title="Settings" />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  )
}

export default App
