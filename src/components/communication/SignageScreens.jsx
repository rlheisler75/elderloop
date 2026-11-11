// Communication → Digital Signage: the community's screens. Each screen gets the
// address elderloop.xyz/<facility number>-<name> (signage_screens + the
// signage_resolve() lookup), and picks a layout: Signage (the board, TV.jsx) or
// TV slideshow (Signage.jsx); SignageScreen.jsx maps them. Each screen can also
// show a particular cycle menu (signage_screens.cycle_menu_id, e.g. the LTC
// menu on the LTC screen); unset = the community's Active menu.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Plus, Monitor, Copy, ExternalLink, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react'

const LAYOUTS = [
  { key: 'signage', label: 'Signage', hint: 'Announcements, activities, and the menu together' },
  { key: 'tv',      label: 'TV slideshow', hint: 'One full-screen slide at a time' },
]
const toUrlName = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export default function SignageScreens({ onClose }) {
  const { organization, can, profile } = useAuth()
  const canManage = ['org_admin', 'ceo', 'super_admin'].includes(profile?.role) || can('communication', 'edit')
  const number = organization?.facility_number
  const host = window.location.host.replace(/^www\./, '')
  const [screens, setScreens] = useState([])
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', url_name: '', display: 'signage' })
  const [urlTouched, setUrlTouched] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('signage_screens').select('*')
      .eq('organization_id', organization.id).eq('is_active', true).order('name')
    setScreens(data || []); setLoading(false)
    const { data: m } = await supabase.from('cycle_menus').select('id, name, is_current')
      .eq('organization_id', organization.id).eq('is_active', true).order('name')
    setMenus(m || [])
  }

  const address = (urlName) => `${host}/${number}${urlName ? `-${urlName}` : ''}`
  const copy = (key, text) => { navigator.clipboard?.writeText(`https://${text}`); setCopied(key); setTimeout(() => setCopied(null), 1500) }

  async function add() {
    const url_name = toUrlName(form.url_name || form.name)
    if (!form.name.trim() || !url_name) { setError('Give the screen a name.'); return }
    setSaving(true); setError('')
    const { error: e } = await supabase.from('signage_screens').insert({
      organization_id: organization.id, name: form.name.trim(), url_name, display: form.display })
    setSaving(false)
    if (e) { setError(e.code === '23505' ? `${address(url_name)} is already used by another screen.` : e.message); return }
    setForm({ name: '', url_name: '', display: 'signage' }); setUrlTouched(false); load()
  }
  async function setLayout(s, display) {
    await supabase.from('signage_screens').update({ display }).eq('id', s.id); load()
  }
  async function setMenu(s, cycle_menu_id) {
    await supabase.from('signage_screens').update({ cycle_menu_id: cycle_menu_id || null }).eq('id', s.id); load()
  }
  async function remove(s) {
    if (!window.confirm(`Remove the screen "${s.name}"? Its address will stop working.`)) return
    await supabase.from('signage_screens').update({ is_active: false, url_name: `${s.url_name}-removed-${Date.now().toString(36)}`.slice(0, 60) }).eq('id', s.id)
    load()
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500'

  const ScreenRow = ({ k, name, urlName, display, screen }) => (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
      <Monitor size={16} className="text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{name}</div>
        <div className="text-xs font-mono text-brand-600 dark:text-brand-400 truncate">{address(urlName)}</div>
      </div>
      {screen && canManage ? (
        <select value={display} onChange={e => setLayout(screen, e.target.value)} className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 dark:text-slate-100">
          {LAYOUTS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
      ) : <span className="text-xs text-slate-400">{LAYOUTS.find(l => l.key === display)?.label}</span>}
      {screen && canManage && menus.length > 1 ? (
        <select value={screen.cycle_menu_id || ''} onChange={e => setMenu(screen, e.target.value)} title="Which menu this screen shows" aria-label={`${name} menu`}
          className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 dark:text-slate-100 max-w-[11rem]">
          <option value="">Menu: Active menu</option>
          {menus.map(m => <option key={m.id} value={m.id}>Menu: {m.name}</option>)}
        </select>
      ) : screen?.cycle_menu_id && <span className="text-xs text-slate-400">Menu: {menus.find(m => m.id === screen.cycle_menu_id)?.name || 'Active menu'}</span>}
      <button onClick={() => copy(k, address(urlName))} title="Copy address" className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        {copied === k ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      </button>
      <a href={`/${number}${urlName ? `-${urlName}` : ''}`} target="_blank" rel="noreferrer" title="Open" className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><ExternalLink size={14} /></a>
      {screen && canManage && <button onClick={() => remove(screen)} title="Remove" className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">Digital Signage</h2>
            <p className="text-xs text-slate-500 mt-0.5">Facility number <b className="text-slate-700 dark:text-slate-200">{number ?? '—'}</b>. Each screen gets its own address; open it on the TV's browser and leave it full screen.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800">
            <ScreenRow k="default" name="Main signage (default)" urlName="" display="signage" />
            {loading ? <div className="py-6 flex justify-center"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
              : screens.map(s => <ScreenRow key={s.id} k={s.id} name={s.name} urlName={s.url_name} display={s.display} screen={s} />)}
          </div>

          {canManage && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add a screen</h3>
              {error && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={14} /> {error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Screen name</label>
                  <input value={form.name} placeholder="e.g. Main lobby"
                    onChange={e => setForm(f => ({ ...f, name: e.target.value, url_name: urlTouched ? f.url_name : toUrlName(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Address</label>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-mono text-slate-400 whitespace-nowrap">/{number}-</span>
                    <input value={form.url_name} placeholder="lobby"
                      onChange={e => { setUrlTouched(true); setForm(f => ({ ...f, url_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })) }} className={inputCls} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {LAYOUTS.map(l => (
                  <button key={l.key} type="button" onClick={() => setForm(f => ({ ...f, display: l.key }))} title={l.hint}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-medium ${form.display === l.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">The address will be <span className="font-mono text-slate-600 dark:text-slate-300">{address(toUrlName(form.url_name || form.name) || 'name')}</span>. Letters, numbers and dashes only.</p>
              <button onClick={add} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add screen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
