import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { Plus, Edit2, Trash2, ExternalLink, Copy, FileText, Check } from 'lucide-react'
import { Badge, Modal, Field, inputCls, selectCls } from '../ui'

const slugify = (s) => s
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

function LandingPageForm({ page, campaigns, onSave, onClose }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    title: '', subheadline: '', hero_image_url: '', body_copy: '',
    cta_text: 'Schedule a Tour', campaign_id: '', is_published: false,
    slug: '',
    ...page,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTitleChange = (v) => {
    set('title', v)
    if (!page?.id && (!form.slug || form.slug === slugify(form.title))) {
      set('slug', slugify(v))
    }
  }

  const handleSave = async () => {
    if (!form.title || !form.slug) return
    setSaving(true)
    setError('')
    const payload = {
      title: form.title,
      subheadline: form.subheadline || null,
      hero_image_url: form.hero_image_url || null,
      body_copy: form.body_copy || null,
      cta_text: form.cta_text || null,
      campaign_id: form.campaign_id || null,
      is_published: form.is_published,
      slug: form.slug,
      organization_id: profile?.organization_id,
      created_by: profile?.id,
    }
    const { error: err } = page?.id
      ? await supabase.from('landing_pages').update(payload).eq('id', page.id)
      : await supabase.from('landing_pages').insert(payload)
    setSaving(false)
    if (err) { setError(err.code === '23505' ? 'That URL slug is already taken — try another.' : err.message); return }
    onSave()
  }

  return (
    <>
      {error && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Title" required>
            <input className={inputCls} value={form.title} onChange={e=>handleTitleChange(e.target.value)} placeholder="Come Tour Our Community" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Public URL" required>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 whitespace-nowrap">elderloop.xyz/lp/</span>
              <input className={inputCls} value={form.slug} onChange={e=>set('slug', slugify(e.target.value))} placeholder="spring-open-house" />
            </div>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Subheadline">
            <input className={inputCls} value={form.subheadline} onChange={e=>set('subheadline',e.target.value)} placeholder="Assisted living, memory care, and more" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Hero Image URL">
            <input className={inputCls} value={form.hero_image_url} onChange={e=>set('hero_image_url',e.target.value)} placeholder="https://…" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Body Copy">
            <textarea className={inputCls} rows={4} value={form.body_copy} onChange={e=>set('body_copy',e.target.value)} />
          </Field>
        </div>
        <Field label="Call to Action Text">
          <input className={inputCls} value={form.cta_text} onChange={e=>set('cta_text',e.target.value)} placeholder="Schedule a Tour" />
        </Field>
        <Field label="Linked Campaign">
          <select className={selectCls} value={form.campaign_id} onChange={e=>set('campaign_id',e.target.value)}>
            <option value="">— None —</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input type="checkbox" id="is_published" checked={form.is_published} onChange={e=>set('is_published', e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <label htmlFor="is_published" className="text-sm text-slate-600 dark:text-slate-300">Published (publicly visible and accepting submissions)</label>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.title || !form.slug}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : page?.id ? 'Save Changes' : 'Create Page'}
        </button>
      </div>
    </>
  )
}

export default function LandingPagesTab({ orgId, campaigns, leads }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPage, setEditPage] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const fetchPages = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const { data } = await supabase.from('landing_pages').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
    setPages(data || [])
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchPages() }, [fetchPages])

  const leadCount = (pageId) => leads.filter(l => l.landing_page_id === pageId).length

  const togglePublish = async (page) => {
    await supabase.from('landing_pages').update({ is_published: !page.is_published }).eq('id', page.id)
    fetchPages()
  }

  const deletePage = async (id) => {
    if (!confirm('Delete this landing page? Leads already captured will stay in the pipeline.')) return
    await supabase.from('landing_pages').delete().eq('id', id)
    fetchPages()
  }

  const copyLink = (page) => {
    const url = `${window.location.origin}/lp/${page.slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(page.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{pages.length} landing page{pages.length === 1 ? '' : 's'}</p>
        <button onClick={() => { setEditPage(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> New Landing Page
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">No landing pages yet</p>
          <p className="text-slate-300 text-sm mt-1">Create a public page to start capturing leads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pages.map(page => {
            const campaign = campaigns.find(c => c.id === page.campaign_id)
            return (
              <div key={page.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={page.is_published
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}>
                        {page.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      {campaign && <span className="text-xs text-slate-400">{campaign.name}</span>}
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{page.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">/lp/{page.slug}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button onClick={() => copyLink(page)} title="Copy public link"
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                      {copiedId === page.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                    <a href={`/lp/${page.slug}`} target="_blank" rel="noreferrer" title="Preview"
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                      <ExternalLink size={14} />
                    </a>
                    <button onClick={() => { setEditPage(page); setShowForm(true) }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deletePage(page.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{leadCount(page.id)}</span> lead{leadCount(page.id) === 1 ? '' : 's'} captured
                  </p>
                  <button onClick={() => togglePublish(page)}
                    className="text-xs px-2.5 py-1 rounded-full border font-medium transition-colors text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                    {page.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editPage ? 'Edit Landing Page' : 'New Landing Page'} onClose={() => setShowForm(false)} wide>
          <LandingPageForm page={editPage} campaigns={campaigns}
            onSave={() => { setShowForm(false); fetchPages() }} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  )
}
