import { useAuth } from '../../context/AuthContext'

export default function AdminPanel() {
  const { organization, profile } = useAuth()
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-slate-800 mb-2">Admin Panel</h1>
      <p className="text-slate-500 mb-6">Manage users, modules, and settings for {organization?.name}.</p>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="text-sm text-slate-600"><span className="font-medium">Logged in as:</span> {profile?.role}</div>
        <div className="text-sm text-slate-600 mt-1"><span className="font-medium">Organization:</span> {organization?.name}</div>
        <div className="mt-4 text-slate-400 text-sm italic">User management, module toggling, and billing will be built here.</div>
      </div>
    </div>
  )
}
