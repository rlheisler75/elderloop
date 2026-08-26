import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import { Analytics } from '@vercel/analytics/react'

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
import CentralSupply from './pages/supply/CentralSupply'

// Lazy loaded
const Chapel         = lazy(() => import('./pages/chapel/Chapel'))
const Activities     = lazy(() => import('./pages/activities/Activities'))
const Directory      = lazy(() => import('./pages/directory/ResidentDirectory'))
const Family         = lazy(() => import('./pages/family/FamilyMessaging'))
const Incidents      = lazy(() => import('./pages/incidents/IncidentReports'))
const IT             = lazy(() => import('./pages/it/ITTickets'))
const Marketing      = lazy(() => import('./pages/marketing/Marketing'))
const Meters         = lazy(() => import('./pages/meters/MeterReadings'))
const Nursing        = lazy(() => import('./pages/nursing/NursingNotes'))
const SocialServices    = lazy(() => import('./pages/social/SocialServices'))
const ForgotPassword   = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword    = lazy(() => import('./pages/auth/ResetPassword'))
const PropertyMgmt   = lazy(() => import('./pages/property/PropertyManagement'))
const Security       = lazy(() => import('./pages/security/Security'))
const Staff          = lazy(() => import('./pages/staff/StaffManagement'))
const StaffDirectory = lazy(() => import('./pages/staff/StaffDirectory'))
const Scheduling     = lazy(() => import('./pages/staff/Scheduling'))
const Surveys        = lazy(() => import('./pages/surveys/Surveys'))
const TimeClock      = lazy(() => import('./pages/timeclock/TimeClock'))
const Transportation = lazy(() => import('./pages/transportation/Transportation'))
const CEODashboard   = lazy(() => import('./pages/ceo/CEODashboard'))
const UserSettings   = lazy(() => import('./pages/settings/UserSettings'))
const SuperAdmin     = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))
const RepPortal      = lazy(() => import('./pages/rep/RepPortal'))
const TrainingHub    = lazy(() => import('./pages/training/TrainingHub'))
const SocialServicesGuide = lazy(() => import('./pages/training/SocialServicesGuide'))
const DietaryGuide   = lazy(() => import('./pages/training/DietaryGuide'))
const NursingGuide   = lazy(() => import('./pages/training/NursingGuide'))
const MaintenanceGuide = lazy(() => import('./pages/training/MaintenanceGuide'))
const HousekeepingGuide = lazy(() => import('./pages/training/HousekeepingGuide'))
const ActivitiesGuide = lazy(() => import('./pages/training/ActivitiesGuide'))
const ChapelGuide = lazy(() => import('./pages/training/ChapelGuide'))
const MarketingGuide = lazy(() => import('./pages/training/MarketingGuide'))
const CommunicationGuide = lazy(() => import('./pages/training/CommunicationGuide'))
const TransportationGuide = lazy(() => import('./pages/training/TransportationGuide'))
const PropertyGuide = lazy(() => import('./pages/training/PropertyGuide'))
const SupplyGuide = lazy(() => import('./pages/training/SupplyGuide'))
const SecurityGuide = lazy(() => import('./pages/training/SecurityGuide'))
const MeterGuide = lazy(() => import('./pages/training/MeterGuide'))
const ITGuide = lazy(() => import('./pages/training/ITGuide'))
const DirectoryGuide = lazy(() => import('./pages/training/DirectoryGuide'))
const FamilyGuide = lazy(() => import('./pages/training/FamilyGuide'))
const IncidentsGuide = lazy(() => import('./pages/training/IncidentsGuide'))
const SchedulingGuide = lazy(() => import('./pages/training/SchedulingGuide'))
const StaffGuide = lazy(() => import('./pages/training/StaffGuide'))
const TimeClockGuide = lazy(() => import('./pages/training/TimeClockGuide'))
const SurveysGuide = lazy(() => import('./pages/training/SurveysGuide'))

// Training routes — shared between the public route tree and the sales-rep
// route branch (below) so reps can reach the Training Library from /rep.
const trainingRoutes = [
  <Route key="training"               path="/training"                    element={<Lazy><TrainingHub /></Lazy>} />,
  <Route key="training-social"        path="/training/social-services"     element={<Lazy><SocialServicesGuide /></Lazy>} />,
  <Route key="training-dietary"       path="/training/dietary"             element={<Lazy><DietaryGuide /></Lazy>} />,
  <Route key="training-nursing"       path="/training/nursing"             element={<Lazy><NursingGuide /></Lazy>} />,
  <Route key="training-maintenance"   path="/training/maintenance"         element={<Lazy><MaintenanceGuide /></Lazy>} />,
  <Route key="training-housekeeping"  path="/training/housekeeping"        element={<Lazy><HousekeepingGuide /></Lazy>} />,
  <Route key="training-activities"    path="/training/activities"          element={<Lazy><ActivitiesGuide /></Lazy>} />,
  <Route key="training-chapel"        path="/training/chapel"              element={<Lazy><ChapelGuide /></Lazy>} />,
  <Route key="training-marketing"     path="/training/marketing"           element={<Lazy><MarketingGuide /></Lazy>} />,
  <Route key="training-communication" path="/training/communication"       element={<Lazy><CommunicationGuide /></Lazy>} />,
  <Route key="training-transportation" path="/training/transportation"     element={<Lazy><TransportationGuide /></Lazy>} />,
  <Route key="training-property"      path="/training/property-management" element={<Lazy><PropertyGuide /></Lazy>} />,
  <Route key="training-supply"        path="/training/central-supply"      element={<Lazy><SupplyGuide /></Lazy>} />,
  <Route key="training-security"      path="/training/security"            element={<Lazy><SecurityGuide /></Lazy>} />,
  <Route key="training-meters"        path="/training/meters"              element={<Lazy><MeterGuide /></Lazy>} />,
  <Route key="training-it"            path="/training/it"                  element={<Lazy><ITGuide /></Lazy>} />,
  <Route key="training-directory"     path="/training/directory"           element={<Lazy><DirectoryGuide /></Lazy>} />,
  <Route key="training-family"        path="/training/family"              element={<Lazy><FamilyGuide /></Lazy>} />,
  <Route key="training-incidents"     path="/training/incidents"           element={<Lazy><IncidentsGuide /></Lazy>} />,
  <Route key="training-scheduling"    path="/training/scheduling"          element={<Lazy><SchedulingGuide /></Lazy>} />,
  <Route key="training-staff"         path="/training/staff"               element={<Lazy><StaffGuide /></Lazy>} />,
  <Route key="training-timeclock"     path="/training/timeclock"           element={<Lazy><TimeClockGuide /></Lazy>} />,
  <Route key="training-surveys"       path="/training/surveys"             element={<Lazy><SurveysGuide /></Lazy>} />,
]

// Public TV & role-specific portals (outside the staff Layout)
import TV            from './pages/tv/TV'
import Signage       from './pages/signage/Signage'
import FamilyPortal  from './pages/family/FamilyPortal'
import ResidentPortal from './pages/resident/ResidentPortal'
import EarlyAccess   from './pages/landing/EarlyAccess'
import SurveyPublic  from './pages/surveys/SurveyPublic'
import Terms            from './pages/landing/Terms'
import Privacy          from './pages/landing/Privacy'
import CampaignLandingPage from './pages/landing/CampaignLandingPage'
import EmailOptOut         from './pages/landing/EmailOptOut'

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

  if (requireModule && planAllowsModule && !planAllowsModule(requireModule)) {
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
  if (!user || !isOrgAdmin) return <Navigate to="/app/dashboard" replace />
  return children
}

function SuperAdminRoute({ children }) {
  const { user, loading, isSuperAdmin } = useAuth()
  if (loading) return null
  if (!user || !isSuperAdmin) return <Navigate to="/app/dashboard" replace />
  return children
}

function SuspendedWall() {
  const { organization, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⏸</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3" style={{ fontFamily: '"Playfair Display", serif' }}>
          Account Suspended
        </h2>
        <p className="text-slate-500 mb-2">
          Access to <strong>{organization?.name || 'your community'}</strong> has been suspended.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          Please contact ElderLoop support to restore access.
        </p>
        <div className="flex flex-col gap-3">
          <a href="mailto:info@loopwaresolutions.com?subject=Account Suspension - Please Restore Access"
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors text-sm">
            Contact Support
          </a>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="w-full py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50 transition-colors">
            Sign Out
          </button>
        </div>
        <p className="text-slate-400 text-xs mt-6">info@loopwaresolutions.com</p>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  const { user, loading, profile, isSuperAdmin, impersonating } = useAuth()

  // A super admin with no org actively impersonated has nothing to see in the
  // staff dashboard shell — send them to the platform Super Admin Dashboard instead.
  const defaultAppRoute = (isSuperAdmin && !impersonating) ? '/superadmin' : '/app/dashboard'

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-brand-950">
      <div className="text-white font-display text-3xl tracking-wide">ElderLoop</div>
    </div>
  )

  // ── Role-based portal intercepts (bypass staff Layout entirely) ──
  if (user && profile?.role === 'family') {
    return (
      <Routes>
        <Route path="/family-portal" element={<FamilyPortal />} />
        <Route path="*" element={<Navigate to="/family-portal" replace />} />
      </Routes>
    )
  }

  if (user && profile?.role === 'resident') {
    return (
      <Routes>
        <Route path="/resident" element={<ResidentPortal />} />
        <Route path="*" element={<Navigate to="/resident" replace />} />
      </Routes>
    )
  }

  if (user && profile?.role === 'sales_rep') {
    return (
      <Routes>
        <Route path="/rep" element={<Lazy><RepPortal /></Lazy>} />
        {trainingRoutes}
        <Route path="*" element={<Navigate to="/rep" replace />} />
      </Routes>
    )
  }

  return (
    <>
      <Routes>

        {/* ── Public ── */}
        <Route path="/"         element={<LandingPage />} />
          <Route path="/tv/:slug"       element={<TV />} />
        <Route path="/signage"        element={<Signage />} />
        <Route path="/early-access"   element={<EarlyAccess />} />
        <Route path="/survey/:token"  element={<SurveyPublic />} />
        <Route path="/lp/:slug"       element={<CampaignLandingPage />} />
        <Route path="/email-optout"   element={<EmailOptOut />} />
        <Route path="/terms"           element={<Terms />} />
        <Route path="/privacy"         element={<Privacy />} />
        {trainingRoutes}
        <Route path="/resident"       element={user ? <ResidentPortal /> : <Navigate to="/login" replace />} />
        <Route path="/family-portal"  element={user ? <FamilyPortal />  : <Navigate to="/login" replace />} />
        <Route path="/rep"            element={!user ? <Navigate to="/login" replace /> : isSuperAdmin ? <Lazy><RepPortal /></Lazy> : <Navigate to="/app/dashboard" replace />} />
        <Route path="/superadmin"     element={<SuperAdminRoute><Lazy><SuperAdmin /></Lazy></SuperAdminRoute>} />

        {/* ── Auth ── */}
        <Route path="/login"           element={user ? <Navigate to={defaultAppRoute} replace /> : <Login />} />
        <Route path="/signup"          element={user ? <Navigate to={defaultAppRoute} replace /> : <Signup />} />
        <Route path="/forgot-password" element={<Lazy><ForgotPassword /></Lazy>} />
        <Route path="/reset-password"  element={<Lazy><ResetPassword /></Lazy>} />

        {/* ── Protected app shell ── */}
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to={defaultAppRoute} replace />} />

          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="settings"   element={<Lazy><UserSettings /></Lazy>} />
          <Route path="admin"      element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="ceo"        element={<Lazy><CEODashboard /></Lazy>} />

          {/* Core modules */}
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

          {/* Community+ modules */}
          <Route path="nursing"
            element={<ProtectedRoute requireModule="nursing"><Lazy><Nursing /></Lazy></ProtectedRoute>} />
          <Route path="social"
            element={<ProtectedRoute requireModule="social_services"><Lazy><SocialServices /></Lazy></ProtectedRoute>} />
          <Route path="incidents"
            element={<ProtectedRoute requireModule="incidents"><Lazy><Incidents /></Lazy></ProtectedRoute>} />
          <Route path="staff"
            element={<ProtectedRoute requireModule="staff"><Lazy><Staff /></Lazy></ProtectedRoute>} />
          <Route path="directory-staff"
            element={<ProtectedRoute requireModule="staff"><Lazy><StaffDirectory /></Lazy></ProtectedRoute>} />
          <Route path="scheduling"
            element={<ProtectedRoute requireModule="staff"><Lazy><Scheduling /></Lazy></ProtectedRoute>} />
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
          <Route path="central-supply" 
            element={<ProtectedRoute requireModule="central_supply"><CentralSupply /></ProtectedRoute>} />

        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to={user ? "/app/dashboard" : "/login"} replace />} />

      </Routes>
      <Analytics />
    </>
  )
}
