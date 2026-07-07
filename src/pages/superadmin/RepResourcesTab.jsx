import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, X, Edit2, Trash2, Loader2, ChevronUp, ChevronDown,
  Eye, EyeOff, ExternalLink, FileText
} from 'lucide-react'

const RESOURCE_TYPES = [
  { key: 'business_card', label: 'Business Card' },
  { key: 'video',         label: 'Video' },
  { key: 'training',      label: 'Training' },
  { key: 'sales_sheet',   label: 'Sales Sheet' },
  { key: 'other',         label: 'Other' },
]

const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

function ResourceModal({ resource, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:         resource?.title         || '',
    description:   resource?.description   || '',
    resource_type: resource?.resource_type  || 'business_card',
    url:           resource?.url            || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) { setError('Title and URL are required.'); return }
    setSaving(true)
    const { error: err } = resource
      ? await supabase.from('rep_resources').update(form).eq('id', resource.id)
      : await supabase.from('rep_resources').insert({ ...form, sort_order: resource?.sort_order ?? 999 })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>
            {resource ? 'Edit Resource' : 'Add Resource'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Digital Business Card" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Type</label>
            <select value={form.resource_type} onChange={e => set('resource_type', e.target.value)} className={inputCls}>
              {RESOURCE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">URL *</label>
            <input value={form.url} onChange={e => set('url', e.target.value)}
              placeholder="https://drive.google.com/..." className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputCls + ' resize-none'} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-900 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : resource ? 'Save Changes' : 'Add Resource'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RepResourcesTab() {
  const [resources, setResources] = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null) // resource | 'new' | null

  useEffect(() => { fetchResources() }, [])

  async function fetchResources() {
    setLoading(true)
    const { data } = await supabase.from('rep_resources').select('*').order('sort_order')
    setResources(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this resource? This cannot be undone.')) return
    await supabase.from('rep_resources').delete().eq('id', id)
    fetchResources()
  }

  const toggleActive = async (r) => {
    await supabase.from('rep_resources').update({ is_active: !r.is_active }).eq('id', r.id)
    fetchResources()
  }

  const move = async (index, dir) => {
    const target = index + dir
    if (target < 0 || target >= resources.length) return
    const a = resources[index]
    const b = resources[target]
    await Promise.all([
      supabase.from('rep_resources').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('rep_resources').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    fetchResources()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-xl font-semibold text-white">
            Rep Promo Materials
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage the resources reps see in their Promo Materials tab</p>
        </div>
        <button onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus size={15} /> Add Resource
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {resources.length === 0 ? (
          <div className="py-16 text-center text-slate-600">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No resources yet</p>
            <p className="text-sm mt-1">Add business cards, videos, training, or sales sheets for reps.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Order', 'Title', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((r, i) => (
                <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-500 hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
                      <button onClick={() => move(i, 1)} disabled={i === resources.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20"><ChevronDown size={14} /></button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{r.title}</span>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-400">
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    {r.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.description}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-900/50 text-brand-400 capitalize">
                      {r.resource_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleActive(r)}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                        r.is_active ? 'bg-green-900/50 text-green-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                      {r.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                      {r.is_active ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(r)}
                        className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-brand-900/30 rounded-lg transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ResourceModal
          resource={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchResources() }}
        />
      )}
    </div>
  )
}
