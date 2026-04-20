import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'

// Auth
import Login from './pages/auth/Login'

// Dashboard & Admin
import Dashboard  from './pages/dashboard/Dashboard'
import AdminPanel from './pages/admin/AdminPanel'

// Modules
import Communication     from './pages/communication/Communication'
import WorkOrders        from './pages/workorders/WorkOrders'
import Dietary           from './pages/dietary/Dietary'
import Housekeeping      from './pages/housekeeping/Housekeeping'
import Marketing         from './pages/marketing/Marketing'
import PropertyManagement from './pages/property/PropertyManagement'

// Public / TV
import TV      from './pages/TV'
import Signage from './pages/signage/Signage'

// ── Route Guards ──────────────────────────────────────────────

function ProtectedRoute({ children, requireModule }) {
  const { user, loading, hasModule } = useAuth()

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (requireModule && !hasModule(requireModule)) return <Navigate to="/dashboard" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading, isOrgAdmin } = useAuth()
  if (loading) return null
  if (!user || !isOrgAdmin()) return <Navigate to="/dashboard" replace />
  return children
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-brand-950">
      <div className="text-white font-display text-3xl tracking-wide">ElderLoop</div>
    </div>
  )

  return (
    <Routes>

      {/* ── Public routes — no auth required ── */}
      <Route path="/tv/:slug" element={<TV />} />
      <Route path="/signage"  element={<Signage />} />

      {/* ── Auth ── */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* ── Protected app shell ── */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />
        <Route path="admin"     element={<AdminRoute><AdminPanel /></AdminRoute>} />

        <Route path="communication"
          element={<ProtectedRoute requireModule="communication"><Communication /></ProtectedRoute>} />

        <Route path="work-orders"
          element={<ProtectedRoute requireModule="work_orders"><WorkOrders /></ProtectedRoute>} />

        <Route path="dietary"
          element={<ProtectedRoute requireModule="dietary"><Dietary /></ProtectedRoute>} />

        <Route path="housekeeping"
          element={<ProtectedRoute requireModule="housekeeping"><Housekeeping /></ProtectedRoute>} />

        <Route path="marketing"
          element={<ProtectedRoute requireModule="marketing"><Marketing /></ProtectedRoute>} />

        <Route path="property-management"
          element={<ProtectedRoute requireModule="property_management"><PropertyManagement /></ProtectedRoute>} />
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />

    </Routes>
  )
}
