import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'

// Landing
import LandingPage from './pages/landing/LandingPage'

// Auth
import Login from './pages/auth/Login'

// Dashboard & Admin
import Dashboard  from './pages/dashboard/Dashboard'
import AdminPanel from './pages/admin/AdminPanel'

// Core modules (all plans)
import Communication from './pages/communication/Communication'
import WorkOrders    from './pages/workorders/WorkOrders'
import Dietary       from './pages/dietary/Dietary'
import Housekeeping  from './pages/housekeeping/Housekeeping'

// Community+ modules (lazy loaded)
const Marketing          = lazy(() => import('./pages/marketing/Marketing'))
const PropertyManagement = lazy(() => import('./pages/property/PropertyManagement'))

// Public TV
import TV      from './pages/tv/TV'
import Signage from './pages/signage/Signage'

// Upgrade wall
import UpgradeWall from './components/ui/UpgradeWall'

// ── Helpers ───────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )
}

// ── Route Guards ──────────────────────────────────────────────

function ProtectedRoute({ children, requireModule }) {
  const { user, loading, hasModule, planAllowsModule } = useAuth()

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Module required but plan doesn't allow it — show upgrade wall
  if (requireModule && !planAllowsModule(requireModule)) {
    return <UpgradeWall moduleKey={requireModule} />
  }

  // Module required but org doesn't have it enabled — redirect to dashboard
  if (requireModule && !hasModule(requireModule)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { user, loading, isOrgAdmin } = useAuth()
  if (loading) return null
  if (!user || !isOrgAdmin()) return <Navigate to="/app/dashboard" replace />
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

      {/* ── Public ── */}
      <Route path="/"         element={<LandingPage />} />
      <Route path="/tv/:slug" element={<TV />} />
      <Route path="/signage"  element={<Signage />} />

      {/* ── Auth ── */}
      <Route path="/login" element={user ? <Navigate to="/app/dashboard" replace /> : <Login />} />

      {/* ── Protected app shell ── */}
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />
        <Route path="admin"     element={<AdminRoute><AdminPanel /></AdminRoute>} />

        {/* Starter + Community modules */}
        <Route path="communication"
          element={<ProtectedRoute requireModule="communication"><Communication /></ProtectedRoute>} />
        <Route path="work-orders"
          element={<ProtectedRoute requireModule="work_orders"><WorkOrders /></ProtectedRoute>} />
        <Route path="dietary"
          element={<ProtectedRoute requireModule="dietary"><Dietary /></ProtectedRoute>} />
        <Route path="housekeeping"
          element={<ProtectedRoute requireModule="housekeeping"><Housekeeping /></ProtectedRoute>} />

        {/* Community+ only modules */}
        <Route path="marketing"
          element={
            <ProtectedRoute requireModule="marketing">
              <Suspense fallback={<PageLoader />}>
                <Marketing />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="property-management"
          element={
            <ProtectedRoute requireModule="property_management">
              <Suspense fallback={<PageLoader />}>
                <PropertyManagement />
              </Suspense>
            </ProtectedRoute>
          }
        />

      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}
