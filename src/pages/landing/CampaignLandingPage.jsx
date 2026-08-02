import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Check } from 'lucide-react'

export default function CampaignLandingPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (slug) fetchPage() }, [slug])

  async function fetchPage() {
    const { data } = await supabase.from('landing_pages').select('*')
      .eq('slug', slug).eq('is_published', true).single()
    if (!data) { setNotFound(true); setLoading(false); return }
    setPage(data)
    setLoading(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name) { setError('Please enter your first and last name.'); return }
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase.from('leads').insert({
      organization_id: page.organization_id,
      landing_page_id: page.id,
      campaign_id: page.campaign_id,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
      inquiry_type: 'self',
      status: 'new',
      source_detail: `Landing page: ${page.title}`,
    })
    setSubmitting(false)
    if (err) { setError('Something went wrong submitting your information. Please try again.'); return }
    setSubmitted(true)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400">Loading…</div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="font-display text-xl font-semibold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-slate-500 text-sm">This page may no longer be available.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-800 mb-3">Thank You!</h2>
        <p className="text-slate-500">Someone from our team will be in touch with you shortly.</p>
        <div className="mt-6 text-xs text-slate-400">Powered by ElderLoop</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {page.hero_image_url && (
        <div className="w-full h-64 sm:h-80 bg-cover bg-center" style={{ backgroundImage: `url(${page.hero_image_url})` }} />
      )}

      <div className="bg-brand-950 px-6 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-white text-3xl sm:text-4xl font-bold" style={{ fontFamily: '"Playfair Display", serif' }}>{page.title}</h1>
          {page.subheadline && <p className="text-brand-300 text-lg mt-3">{page.subheadline}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {page.body_copy && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{page.body_copy}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 text-lg mb-4">{page.cta_text || 'Get in Touch'}</h3>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input value={form.first_name} onChange={e=>set('first_name', e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="First name *" />
            <input value={form.last_name} onChange={e=>set('last_name', e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Last name *" />
            <input type="email" value={form.email} onChange={e=>set('email', e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Email address" />
            <input type="tel" value={form.phone} onChange={e=>set('phone', e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Phone number" />
          </div>
          <textarea value={form.notes} onChange={e=>set('notes', e.target.value)} rows={3}
            className="w-full mt-3 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            placeholder="Anything you'd like us to know? (optional)" />

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full mt-4 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-2xl transition-colors">
            {submitting ? 'Submitting…' : (page.cta_text || 'Submit')}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 pb-6">Powered by ElderLoop</p>
      </div>
    </div>
  )
}
