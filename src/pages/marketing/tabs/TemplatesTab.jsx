import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { Plus, Edit2, Trash2, FileText } from 'lucide-react'
import { Modal, Field, inputCls } from '../ui'

function TemplateForm({ template, onSave, onClose }) {
  const { profile } = useAuth()
  const [name, setName] = useState(template?.name || '')
  const [subject, setSubject] = useState(template?.subject || '')
  const [body, setBody] = useState(template?.body || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name || !subject || !body) { setError('Name, subject, and body are all required.'); return }
    setSaving(true)
    setError('')
    const payload = { name, subject, body, organization_id: profile?.organization_id, created_by: profile?.id }
    const { error: err } = template?.id
      ? await supabase.from('email_templates').update(payload).eq('id', template.id)
      : await supabase.from('email_templates').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
  }

  return (
    <>
      {error && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>}
      <div className="space-y-4">
        <Field label="Template Name" required>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Spring Open House Invite" />
        </Field>
        <Field label="Subject" required>
          <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Come tour our community this spring" />
        </Field>
        <Field label="Body" required>
          <textarea className={inputCls} rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="Hi {{first_name}}, ..." />
          <p className="text-xs text-slate-400 mt-1.5">
            Merge tags: <code>{'{{first_name}}'}</code> <code>{'{{last_name}}'}</code> <code>{'{{prospect_first_name}}'}</code>
          </p>
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : template?.id ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </>
  )
}

export default function TemplatesTab({ orgId }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTemplate, setEditTemplate] = useState(null)

  const fetchTemplates = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('email_templates').select('*').eq('organization_id', orgId).order('name')
    setTemplates(data || [])
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return
    await supabase.from('email_templates').delete().eq('id', id)
    fetchTemplates()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{templates.length} template{templates.length === 1 ? '' : 's'} · available when composing a campaign email</p>
        <button onClick={() => { setEditTemplate(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">No email templates yet</p>
          <p className="text-slate-300 text-sm mt-1">Save a subject and body once, reuse it across campaigns</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{t.name}</h3>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button onClick={() => { setEditTemplate(t); setShowForm(true) }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteTemplate(t.id)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 truncate">{t.subject}</p>
              <p className="text-xs text-slate-400 line-clamp-2">{t.body}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editTemplate ? 'Edit Template' : 'New Template'} onClose={() => setShowForm(false)} wide>
          <TemplateForm template={editTemplate}
            onSave={() => { setShowForm(false); fetchTemplates() }} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  )
}
