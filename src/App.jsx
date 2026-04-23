import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'

// Landing & Auth
import LandingPage from './pages/landing/LandingPage'
import Login       from './pages/auth/Login'
import Signup      from './pages/auth/Signup'

// Dashboard & Admin
import Dashboard  from './pages/dashboard/Dashboard'
import AdminPanel from './pages/admin/AdminPanel'

// Eagerly loaded core modules
import Communication from './pages/communication/Communication'
import WorkOrders    from './pages/workorders/WorkOrders'
import Dietary       from './pages/dietary/Dietary'
import Housekeeping  from './pages/housekeeping/Housekeeping'

// Lazy loaded modules — won't crash if file doesn't exist yet
const Chapel          = lazy(() => import('./pages/chapel/Chapel'))
const Activities      = lazy(() => import('./pages/activities/Activities'))
const Directory       = lazy(() => import('./pages/directory/ResidentDirectory'))
const Transportation  = lazy(() => import('./pages/transportation/Transportation'))
const Meters          = lazy(() => import('./pages/meters/Meters'))
const Security        = lazy(() => import('./pages/security/Security'))
const Staff           = lazy(() => import('./pages/staff/StaffManagement'))
const StaffDirectory  = lazy(() => import('./pages/staff/StaffDirectory'))
const Scheduling      = lazy(() => import('./pages/scheduling/Scheduling'))
const Nursing         = lazy(() => import('./pages/nursing/NursingNotes'))
const Family          = lazy(() => import('./pages/family/FamilyMessaging'))
const Surveys         = lazy(() => import('./pages/surveys/Surveys'))
const Incidents       = lazy(() => import('./pages/incidents/IncidentReports'))
const TimeClock       = lazy(() => import('./pages/timeclock/TimeClock'))
const IT              = lazy(() => import('./pages/it/ITManagement'))
const Marketing       = lazy(() => import('./pages/marketing/Marketing'))
const PropertyMgmt    = lazy(() => import('./pages/property/PropertyManagement'))
const CEODashboard    = lazy(() => import('./pages/ceo/CEODashboard'))
const SuperAdmin      = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))

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

function Lazy({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
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

  if (requireModule && !planAllowsModule(requireModule)) {
    return <UpgradeWall moduleKey={requireModule} />
  }

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

function SuperAdminRoute({ children }) {
  const { user, loading, isSuperAdmin } = useAuth()
  if (loading) return null
  if (!user || !isSuperAdmin()) return <Navigate to="/app/dashboard" replace />
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
      <Route path="/login"  element={user ? <Navigate to="/app/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/app/dashboard" replace /> : <Signup />} />

      {/* ── Protected app shell ── */}
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />

        <Route path="admin"
          element={<AdminRoute><AdminPanel /></AdminRoute>} />

        <Route path="superadmin"
          element={<SuperAdminRoute><Lazy><SuperAdmin /></Lazy></SuperAdminRoute>} />

        <Route path="ceo"
          element={<Lazy><CEODashboard /></Lazy>} />

        {/* ── Core modules (all plans) ── */}
        <Route path="communication"
          element={<ProtectedRoute requireModule="communication"><Communication /></ProtectedRoute>} />

        <Route path="maintenance"
          element={<ProtectedRoute requireModule="work_orders"><WorkOrders /></ProtectedRoute>} />

        <Route path="dietary"
          element={<ProtectedRoute requireModule="dietary"><Dietary /></ProtectedRoute>} />

        <Route path="housekeeping"
          element={<ProtectedRoute requireModule="housekeeping"><Housekeeping /></ProtectedRoute>} />

        <Route path="chapel"
          element={<ProtectedRoute requireModule="chapel"><Lazy><Chapel /></Lazy></ProtectedRoute>} />

        <Route path="activities"
          element={<ProtectedRoute requireModule="activities"><Lazy><Activities /></Lazy></ProtectedRoute>} />

        <Route path="directory"
          element={<ProtectedRoute requireModule="directory"><Lazy><Directory /></Lazy></ProtectedRoute>} />

        <Route path="family"
          element={<ProtectedRoute requireModule="family"><Lazy><Family /></Lazy></ProtectedRoute>} />

        <Route path="surveys"
          element={<ProtectedRoute requireModule="surveys"><Lazy><Surveys /></Lazy></ProtectedRoute>} />

        {/* ── Community+ modules ── */}
        <Route path="nursing"
          element={<ProtectedRoute requireModule="nursing"><Lazy><Nursing /></Lazy></ProtectedRoute>} />

        <Route path="incidents"
          element={<ProtectedRoute requireModule="incidents"><Lazy><Incidents /></Lazy></ProtectedRoute>} />

        <Route path="staff"
          element={<ProtectedRoute requireModule="staff"><Lazy><Staff /></Lazy></ProtectedRoute>} />

        <Route path="directory-staff"
          element={<ProtectedRoute requireModule="staff"><Lazy><StaffDirectory /></Lazy></ProtectedRoute>} />

        <Route path="scheduling"
          element={<ProtectedRoute requireModule="scheduling"><Lazy><Scheduling /></Lazy></ProtectedRoute>} />

        <Route path="timeclock"
          element={<ProtectedRoute requireModule="timeclock"><Lazy><TimeClock /></Lazy></ProtectedRoute>} />

        <Route path="transportation"
          element={<ProtectedRoute requireModule="transportation"><Lazy><Transportation /></Lazy></ProtectedRoute>} />

        <Route path="meters"
          element={<ProtectedRoute requireModule="meters"><Lazy><Meters /></Lazy></ProtectedRoute>} />

        <Route path="security"
          element={<ProtectedRoute requireModule="security"><Lazy><Security /></Lazy></ProtectedRoute>} />

        <Route path="it"
          element={<ProtectedRoute requireModule="it"><Lazy><IT /></Lazy></ProtectedRoute>} />

        <Route path="marketing"
          element={<ProtectedRoute requireModule="marketing"><Lazy><Marketing /></Lazy></ProtectedRoute>} />

        <Route path="property-management"
          element={<ProtectedRoute requireModule="property_management"><Lazy><PropertyMgmt /></Lazy></ProtectedRoute>} />

      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}
