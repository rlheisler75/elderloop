import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LandingPage from './pages/landing/LandingPage'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import CEODashboard from './pages/ceo/CEODashboard'
import AdminPanel from './pages/admin/AdminPanel'
import WorkOrders from './pages/workorders/WorkOrders'
import Communication from './pages/communication/Communication'
import Dietary from './pages/dietary/Dietary'
import Housekeeping from './pages/housekeeping/Housekeeping'
import Chapel from './pages/chapel/Chapel'
import Transportation from './pages/transportation/Transportation'
import Activities from './pages/activities/Activities'
import IncidentReports from './pages/incidents/IncidentReports'
import ResidentDirectory from './pages/directory/ResidentDirectory'
import MeterReadings from './pages/meters/MeterReadings'
import Security from './pages/security/Security'
import StaffManagement from './pages/staff/StaffManagement'
import Scheduling from './pages/staff/Scheduling'
import Surveys from './pages/surveys/Surveys'
import SurveyPublic from './pages/surveys/SurveyPublic'
import Signage from './pages/signage/Signage'
import ResidentPortal from './pages/resident/ResidentPortal'

function ProtectedRoute({ children, requireModule }) {
  const { user, loading, hasModule } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center bg-brand-950"><div className="text-white font-display text-2xl">ElderLoop</div></div>
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

function SuperAdminRoute({ children }) {
  const { user, loading, isSuperAdmin } = useAuth()
  if (loading) return null
  if (!user || !isSuperAdmin()) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-brand-950">
      <div className="text-white font-display text-3xl tracking-wide">ElderLoop</div>
    </div>
  )

  // Resident / family → portal
  if (user && (profile?.role === 'resident' || profile?.role === 'family')) {
    return (
      <Routes>
        <Route path="/resident" element={<ResidentPortal />} />
        <Route path="*" element={<Navigate to="/resident" />} />
      </Routes>
    )
  }

  // CEO → CEO dashboard (can also access full app)
  if (user && profile?.role === 'ceo') {
    return (
      <Routes>
        <Route path="/survey/:token" element={<SurveyPublic />} />
      <Route path="/signage" element={<Signage />} />
        <Route path="/ceo" element={<CEODashboard />} />
        <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/ceo" />} />
          <Route path="dashboard"      element={<Dashboard />} />
          <Route path="admin"          element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="communication"  element={<ProtectedRoute requireModule="communication"><Communication /></ProtectedRoute>} />
          <Route path="chapel"         element={<ProtectedRoute requireModule="chapel"><Chapel /></ProtectedRoute>} />
          <Route path="activities"     element={<ProtectedRoute requireModule="activities"><Activities /></ProtectedRoute>} />
          <Route path="directory"      element={<ProtectedRoute requireModule="directory"><ResidentDirectory /></ProtectedRoute>} />
          <Route path="maintenance"    element={<ProtectedRoute requireModule="work_orders"><WorkOrders /></ProtectedRoute>} />
          <Route path="dietary"        element={<ProtectedRoute requireModule="dietary"><Dietary /></ProtectedRoute>} />
          <Route path="housekeeping"   element={<ProtectedRoute requireModule="housekeeping"><Housekeeping /></ProtectedRoute>} />
          <Route path="transportation" element={<ProtectedRoute requireModule="transportation"><Transportation /></ProtectedRoute>} />
          <Route path="meters"         element={<ProtectedRoute requireModule="meters"><MeterReadings /></ProtectedRoute>} />
          <Route path="scheduling"   element={<ProtectedRoute requireModule="staff"><Scheduling /></ProtectedRoute>} />
        <Route path="staff"         element={<ProtectedRoute requireModule="staff"><StaffManagement /></ProtectedRoute>} />
        <Route path="security"       element={<ProtectedRoute requireModule="security"><Security /></ProtectedRoute>} />
          <Route path="surveys"       element={<ProtectedRoute requireModule="surveys"><Surveys /></ProtectedRoute>} />
        <Route path="incidents"      element={<ProtectedRoute requireModule="incidents"><IncidentReports /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/ceo" />} />
      </Routes>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/survey/:token" element={<SurveyPublic />} />
      <Route path="/signage" element={<Signage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />

      {/* Super Admin */}
      <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />

      {/* App shell */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="admin"          element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="communication"  element={<ProtectedRoute requireModule="communication"><Communication /></ProtectedRoute>} />
        <Route path="chapel"         element={<ProtectedRoute requireModule="chapel"><Chapel /></ProtectedRoute>} />
        <Route path="activities"     element={<ProtectedRoute requireModule="activities"><Activities /></ProtectedRoute>} />
        <Route path="directory"      element={<ProtectedRoute requireModule="directory"><ResidentDirectory /></ProtectedRoute>} />
        <Route path="maintenance"    element={<ProtectedRoute requireModule="work_orders"><WorkOrders /></ProtectedRoute>} />
        <Route path="dietary"        element={<ProtectedRoute requireModule="dietary"><Dietary /></ProtectedRoute>} />
        <Route path="housekeeping"   element={<ProtectedRoute requireModule="housekeeping"><Housekeeping /></ProtectedRoute>} />
        <Route path="transportation" element={<ProtectedRoute requireModule="transportation"><Transportation /></ProtectedRoute>} />
        <Route path="meters"         element={<ProtectedRoute requireModule="meters"><MeterReadings /></ProtectedRoute>} />
        <Route path="scheduling"   element={<ProtectedRoute requireModule="staff"><Scheduling /></ProtectedRoute>} />
        <Route path="staff"         element={<ProtectedRoute requireModule="staff"><StaffManagement /></ProtectedRoute>} />
        <Route path="security"       element={<ProtectedRoute requireModule="security"><Security /></ProtectedRoute>} />
        <Route path="surveys"       element={<ProtectedRoute requireModule="surveys"><Surveys /></ProtectedRoute>} />
        <Route path="incidents"      element={<ProtectedRoute requireModule="incidents"><IncidentReports /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
