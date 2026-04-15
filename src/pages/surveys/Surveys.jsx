import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, Copy, Check,
  Star, ToggleLeft, List, AlignLeft, Hash,
  ChevronRight, BarChart3, Send, Eye, Link,
  CheckSquare, Circle, ArrowUp, ArrowDown,
  ClipboardList, TrendingUp, Users, MessageSquare,
  ChevronDown, ChevronUp, Printer
} from 'lucide-react'

// ── Question type definitions ──────────────────────────────────
const QUESTION_TYPES = [
  { key: 'rating',        label: 'Star Rating',     icon: Star,          desc: '1–5 or 1–10 stars' },
  { key: 'opinion_scale', label: 'Opinion Scale',   icon: Hash,          desc: '0–10 slider' },
  { key: 'binary',        label: 'Yes / No',        icon: ToggleLeft,    desc: 'Simple yes or no' },
  { key: 'radio',         label: 'Multiple Choice', icon: Circle,        desc: 'Pick one option' },
  { key: 'checkbox',      label: 'Checkboxes',      icon: CheckSquare,   desc: 'Pick multiple options' },
  { key: 'text',          label: 'Short Text',      icon: AlignLeft,     desc: 'One line answer' },
  { key: 'textarea',      label: 'Long Text',       icon: List,          desc: 'Paragraph answer' },
]

const getQType = (key) => QUESTION_TYPES.find(t => t.key === key) || QUESTION_TYPES[0]

const fmt = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// ── Star display ───────────────────────────────────────────────
function Stars({ value, max = 5, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button key={i} type="button"
          onMouseEnter={() => onChange && setHover(i + 1)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(i + 1)}
          className={`transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'}`}>
          <Star size={22} className={`${(hover || value) > i ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} transition-colors`} />
        </button>
      ))}
    </div>
  )
}

// ── Opinion Scale ──────────────────────────────────────────────
function OpinionScale({ value, onChange }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>Not at all</span><span>Extremely</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 11 }).map((_, i) => (
          <button key={i} type="button" onClick={() => onChange && onChange(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${value === i ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-500 hover:border-brand-300'}`}>
            {i}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Question Builder ───────────────────────────────────────────
function QuestionBuilder({ questions, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [form, setForm] = useState({ question: '', type: 'rating', max_rating: 5, is_required: false, options: ['Option A', 'Option B'] })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const resetForm = () => setForm({ question: '', type: 'rating', max_rating: 5, is_required: false, options: ['Option A', 'Option B'] })

  const handleAdd = () => {
    if (!form.question.trim()) return
    const q = { ...form, id: `new_${Date.now()}`, sort_order: questions.length }
    onChange([...questions, q])
    resetForm(); setAdding(false)
  }

  const handleEdit = (idx) => {
    setEditIdx(idx); setForm({ ...questions[idx] }); setAdding(false)
  }

  const handleSaveEdit = () => {
    const updated = [...questions]
    updated[editIdx] = { ...form }
    onChange(updated); setEditIdx(null); resetForm()
  }

  const handleDelete = (idx) => {
    onChange(questions.filter((_, i) => i !== idx))
  }

  const move = (idx, dir) => {
    const arr = [...questions]
    const target = idx + dir
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]]
    arr.forEach((q, i) => q.sort_order = i)
    onChange(arr)
  }

  const addOption = () => set('options', [...(form.options || []), `Option ${(form.options?.length || 0) + 1}`])
  const removeOption = (i) => set('options', form.options.filter((_, idx) => idx !== i))
  const updateOption = (i, v) => { const o = [...form.options]; o[i] = v; set('options', o) }

  const renderForm = () => (
    <div className="border-2 border-brand-300 bg-brand-50 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Question *</label>
          <textarea value={form.question} onChange={e => set('question', e.target.value)} rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            placeholder="Enter your question..." />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Question Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {QUESTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        {form.type === 'rating' && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Max Stars</label>
            <select value={form.max_rating} onChange={e => set('max_rating', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value={5}>5 stars</option>
              <option value={10}>10 stars</option>
            </select>
          </div>
        )}
      </div>

      {/* Options for radio/checkbox */}
      {['radio','checkbox'].includes(form.type) && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Options</label>
          <div className="space-y-2">
            {(form.options || []).map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input value={opt} onChange={e => updateOption(i, e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={`Option ${i + 1}`} />
                <button onClick={() => removeOption(i)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
            <button onClick={addOption}
              className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-1">
              <Plus size={12} /> Add Option
            </button>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_required} onChange={e => set('is_required', e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
        <span className="text-sm text-slate-600">Required question</span>
      </label>

      <div className="flex justify-end gap-2">
        <button onClick={() => { resetForm(); setAdding(false); setEditIdx(null) }}
          className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
        <button onClick={editIdx !== null ? handleSaveEdit : handleAdd}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
          {editIdx !== null ? 'Save Question' : 'Add Question'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {questions.map((q, idx) => {
        const QIcon = getQType(q.type).icon
        if (editIdx === idx) return <div key={q.id || idx}>{renderForm()}</div>
        return (
          <div key={q.id || idx} className="flex items-start gap-3 p-4 bg-white border border-slate-100 rounded-xl group hover:border-brand-200 transition-all">
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => move(idx, -1)} className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors"><ArrowUp size={13} /></button>
              <button onClick={() => move(idx, 1)} className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors"><ArrowDown size={13} /></button>
            </div>
            <div className="w-7 h-7 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <QIcon size={14} className="text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800 text-sm">{q.question}</span>
                {q.is_required && <span className="text-red-500 text-xs font-bold">*</span>}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {getQType(q.type).label}
                {q.type === 'rating' && ` · ${q.max_rating} stars`}
                {['radio','checkbox'].includes(q.type) && q.options?.length > 0 && ` · ${q.options.length} options`}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(idx)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"><Edit2 size={13} /></button>
              <button onClick={() => handleDelete(idx)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
            </div>
          </div>
        )
      })}

      {adding && renderForm()}

      {!adding && editIdx === null && (
        <button onClick={() => setAdding(true)}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-2">
          <Plus size={15} /> Add Question
        </button>
      )}
    </div>
  )
}

// ── Survey Form Modal ──────────────────────────────────────────
function SurveyModal({ survey, onClose, onSave }) {
  const { profile } = useAuth()
  const isNew = !survey
  const [form, setForm] = useState({
    title:          survey?.title          || '',
    description:    survey?.description    || '',
    survey_type:    survey?.survey_type    || 'one_time',
    recur_days:     survey?.recur_days     || '',
    start_date:     survey?.start_date     || '',
    end_date:       survey?.end_date       || '',
    allow_anonymous:survey?.allow_anonymous ?? true,
    show_in_portal: survey?.show_in_portal ?? true,
  })
  const [questions, setQuestions] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [tab, setTab]       = useState('details')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (survey?.id) {
      supabase.from('survey_questions').select('*').eq('survey_id', survey.id).order('sort_order')
        .then(({ data }) => setQuestions(data || []))
    }
  }, [survey?.id])

  const handleSave = async (publish = false) => {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (questions.length === 0) { setError('Add at least one question'); setTab('questions'); return }
    setSaving(true)

    const payload = {
      ...form,
      organization_id: profile.organization_id,
      created_by: profile.id,
      is_published: publish || survey?.is_published || false,
      recur_days: form.recur_days ? parseInt(form.recur_days) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      updated_at: new Date().toISOString(),
    }

    let surveyId = survey?.id
    let err

    if (survey?.id) {
      ({ error: err } = await supabase.from('surveys').update(payload).eq('id', survey.id))
    } else {
      const { data, error: insErr } = await supabase.from('surveys').insert({ ...payload, is_active: true }).select().single()
      err = insErr; surveyId = data?.id
    }

    if (err || !surveyId) { setError(err?.message || 'Failed to save'); setSaving(false); return }

    // Save questions
    await supabase.from('survey_questions').delete().eq('survey_id', surveyId)
    if (questions.length) {
      await supabase.from('survey_questions').insert(
        questions.map((q, i) => ({
          survey_id:   surveyId,
          sort_order:  i,
          question:    q.question,
          type:        q.type,
          options:     q.options || null,
          max_rating:  q.max_rating || 5,
          is_required: q.is_required || false,
        }))
      )
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{isNew ? 'New Survey' : 'Edit Survey'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-100 flex-shrink-0">
          {[{ key: 'details', label: 'Details' }, { key: 'questions', label: `Questions (${questions.length})` }, { key: 'settings', label: 'Settings' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {tab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Survey Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Resident Satisfaction Survey Q2 2026" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Tell respondents what this survey is about..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Survey Type</label>
                  <select value={form.survey_type} onChange={e => set('survey_type', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="one_time">One Time</option>
                    <option value="periodic">Periodic (Repeating)</option>
                  </select>
                </div>
                {form.survey_type === 'periodic' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Repeat Every (days)</label>
                    <input type="number" value={form.recur_days} onChange={e => set('recur_days', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g. 30" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
            </div>
          )}

          {tab === 'questions' && (
            <QuestionBuilder questions={questions} onChange={setQuestions} />
          )}

          {tab === 'settings' && (
            <div className="space-y-4">
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${form.allow_anonymous ? 'bg-brand-50 border-brand-200' : 'border-slate-200'}`}>
                <input type="checkbox" checked={form.allow_anonymous} onChange={e => set('allow_anonymous', e.target.checked)} className="w-4 h-4 rounded text-brand-600 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-800 text-sm">Allow Anonymous Responses</div>
                  <div className="text-xs text-slate-400 mt-0.5">Anyone with the public link can respond without logging in. Name and email are optional.</div>
                </div>
              </label>
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${form.show_in_portal ? 'bg-brand-50 border-brand-200' : 'border-slate-200'}`}>
                <input type="checkbox" checked={form.show_in_portal} onChange={e => set('show_in_portal', e.target.checked)} className="w-4 h-4 rounded text-brand-600 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-800 text-sm">Show in Resident Portal</div>
                  <div className="text-xs text-slate-400 mt-0.5">Logged-in residents and family members will see this survey in their portal.</div>
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:border-slate-300 transition-colors disabled:opacity-50">
              Save Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              <Send size={14} /> {saving ? 'Saving...' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Public Survey Link Copy ────────────────────────────────────
function CopyLinkButton({ token }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/survey/${token}`
  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
      {copied ? <><Check size={12} className="text-green-500" /> Copied!</> : <><Link size={12} /> Copy Link</>}
    </button>
  )
}

// ── Survey Results Modal ───────────────────────────────────────
function SurveyResults({ survey, onClose }) {
  const [responses, setResponses] = useState([])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [expandQ, setExpandQ]     = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [rRes, qRes] = await Promise.all([
      supabase.from('survey_responses').select('*').eq('survey_id', survey.id).order('submitted_at', { ascending: false }),
      supabase.from('survey_questions').select('*').eq('survey_id', survey.id).order('sort_order'),
    ])
    const respList = rRes.data || []
    const qList    = qRes.data || []
    setResponses(respList)
    setQuestions(qList)

    if (respList.length) {
      const { data: ans } = await supabase.from('survey_answers')
        .select('*').in('response_id', respList.map(r => r.id))
      setAnswers(ans || [])
    }
    setLoading(false)
  }

  // Aggregate answers per question
  const getQuestionStats = (q) => {
    const qAnswers = answers.filter(a => a.question_id === q.id)
    if (!qAnswers.length) return null

    if (q.type === 'rating' || q.type === 'opinion_scale') {
      const vals = qAnswers.map(a => a.rating_value).filter(v => v != null)
      const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      return { type: 'numeric', avg: avg.toFixed(1), max: q.max_rating || (q.type === 'opinion_scale' ? 10 : 5), count: vals.length, values: vals }
    }
    if (q.type === 'binary') {
      const yes = qAnswers.filter(a => a.boolean_value === true).length
      const no  = qAnswers.filter(a => a.boolean_value === false).length
      return { type: 'binary', yes, no, total: yes + no }
    }
    if (q.type === 'radio' || q.type === 'checkbox') {
      const counts = {}
      qAnswers.forEach(a => {
        const opts = a.selected_options || []
        opts.forEach(o => { counts[o] = (counts[o] || 0) + 1 })
      })
      return { type: 'options', counts, total: qAnswers.length }
    }
    if (q.type === 'text' || q.type === 'textarea') {
      return { type: 'text', values: qAnswers.map(a => a.text_value).filter(Boolean) }
    }
    return null
  }

  const completionRate = responses.length > 0
    ? Math.round((responses.filter(r => r.status === 'completed').length / responses.length) * 100)
    : 0

  const avgScore = responses.length > 0
    ? (responses.reduce((a, r) => a + (parseFloat(r.overall_score) || 0), 0) / responses.length).toFixed(0)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">{survey.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="text-center py-10 text-slate-400">Loading results...</div>
          ) : responses.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">No responses yet</p>
              <p className="text-sm mt-1">Share the survey link to start collecting responses.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Responses', value: responses.length, color: 'text-brand-600', bg: 'bg-brand-50' },
                  { label: 'Completion Rate', value: `${completionRate}%`, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Avg Satisfaction', value: avgScore > 0 ? `${avgScore}%` : '—', color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                    <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Per-question results */}
              {questions.map(q => {
                const stats = getQuestionStats(q)
                const QIcon = getQType(q.type).icon
                const isExpanded = expandQ === q.id
                return (
                  <div key={q.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                    <button onClick={() => setExpandQ(isExpanded ? null : q.id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <QIcon size={15} className="text-brand-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 text-sm">{q.question}</div>
                        <div className="text-xs text-slate-400">{getQType(q.type).label}</div>
                      </div>
                      {stats && (
                        <div className="text-sm font-semibold text-brand-600 flex-shrink-0">
                          {stats.type === 'numeric' && `${stats.avg} / ${stats.max}`}
                          {stats.type === 'binary' && `${Math.round(stats.yes / stats.total * 100)}% Yes`}
                          {stats.type === 'text' && `${stats.values.length} comment${stats.values.length !== 1 ? 's' : ''}`}
                        </div>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                    </button>

                    {isExpanded && stats && (
                      <div className="border-t border-slate-100 p-4 bg-slate-50">
                        {stats.type === 'numeric' && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-slate-500">Average: <strong className="text-slate-800">{stats.avg} / {stats.max}</strong></span>
                              <span className="text-xs text-slate-400">{stats.count} response{stats.count !== 1 ? 's' : ''}</span>
                            </div>
                            {/* Distribution bars */}
                            <div className="space-y-1.5">
                              {Array.from({ length: stats.max }).map((_, i) => {
                                const val = i + 1
                                const cnt = stats.values.filter(v => v === val).length
                                const pct = stats.count > 0 ? Math.round(cnt / stats.count * 100) : 0
                                return (
                                  <div key={val} className="flex items-center gap-2 text-xs">
                                    <span className="w-4 text-slate-500 text-right">{val}</span>
                                    <div className="flex-1 h-5 bg-slate-200 rounded overflow-hidden">
                                      <div className="h-full bg-brand-500 rounded transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-8 text-slate-500">{cnt}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        {stats.type === 'binary' && (
                          <div className="flex gap-4">
                            {[{ label: 'Yes', val: stats.yes, color: 'bg-green-500' }, { label: 'No', val: stats.no, color: 'bg-red-400' }].map(b => (
                              <div key={b.label} className="flex-1 text-center p-4 bg-white rounded-xl border border-slate-200">
                                <div className="text-2xl font-bold text-slate-800">{b.val}</div>
                                <div className="text-xs text-slate-500 mt-1">{b.label}</div>
                                <div className="text-xs font-medium mt-0.5" style={{ color: b.label === 'Yes' ? '#16a34a' : '#dc2626' }}>
                                  {stats.total > 0 ? Math.round(b.val / stats.total * 100) : 0}%
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {stats.type === 'options' && (
                          <div className="space-y-2">
                            {Object.entries(stats.counts).sort((a, b) => b[1] - a[1]).map(([opt, cnt]) => (
                              <div key={opt} className="flex items-center gap-2 text-sm">
                                <span className="flex-1 text-slate-700 truncate">{opt}</span>
                                <div className="w-32 h-4 bg-slate-200 rounded overflow-hidden">
                                  <div className="h-full bg-brand-500 rounded" style={{ width: `${Math.round(cnt / stats.total * 100)}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 w-8">{cnt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {stats.type === 'text' && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {stats.values.map((v, i) => (
                              <div key={i} className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 italic">
                                "{v}"
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Individual responses */}
              <div>
                <h3 className="font-display font-semibold text-slate-700 mb-3">All Responses</h3>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Respondent</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map(r => (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-800">{r.respondent_name || 'Anonymous'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{fmt(r.submitted_at)}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 capitalize">{r.respondent_type}</td>
                          <td className="px-4 py-3 text-sm font-medium text-brand-600">{r.overall_score != null ? `${parseFloat(r.overall_score).toFixed(0)}%` : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Surveys Page ──────────────────────────────────────────
export default function Surveys() {
  const { organization } = useAuth()
  const [surveys, setSurveys]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editSurvey, setEditSurvey] = useState(null)
  const [viewResults, setViewResults] = useState(null)
  const [responseCounts, setResponseCounts] = useState({})

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('surveys').select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setSurveys(data || [])

    // Get response counts
    if (data?.length) {
      const { data: counts } = await supabase.from('survey_responses')
        .select('survey_id')
        .in('survey_id', data.map(s => s.id))
      const countMap = {}
      counts?.forEach(c => { countMap[c.survey_id] = (countMap[c.survey_id] || 0) + 1 })
      setResponseCounts(countMap)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this survey and all its responses?')) return
    await supabase.from('surveys').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  const handleTogglePublish = async (survey) => {
    await supabase.from('surveys').update({ is_published: !survey.is_published }).eq('id', survey.id)
    fetchAll()
  }

  const filtered = surveys.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()))

  const stats = {
    total:     surveys.length,
    published: surveys.filter(s => s.is_published).length,
    responses: Object.values(responseCounts).reduce((a, b) => a + b, 0),
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Surveys</h1>
          <p className="text-slate-500 text-sm mt-0.5">Build surveys, collect responses, analyze results</p>
        </div>
        <button onClick={() => { setEditSurvey(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> New Survey
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Surveys',   value: stats.total,     color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Published',       value: stats.published, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Total Responses', value: stats.responses, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search surveys..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {/* Survey list */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No surveys yet</p>
          <p className="text-sm mt-1">Click "New Survey" to build your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const count = responseCounts[s.id] || 0
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-display font-semibold text-slate-800">{s.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{s.survey_type.replace('_', ' ')}</span>
                    </div>
                    {s.description && <p className="text-xs text-slate-500 mb-2 line-clamp-1">{s.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Users size={11} /> {count} response{count !== 1 ? 's' : ''}</span>
                      {s.start_date && <span>Starts {fmt(s.start_date)}</span>}
                      {s.end_date && <span>Ends {fmt(s.end_date)}</span>}
                      {s.survey_type === 'periodic' && s.recur_days && <span>Every {s.recur_days} days</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {s.is_published && <CopyLinkButton token={s.public_token} />}
                    <button onClick={() => setViewResults(s)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                      <BarChart3 size={12} /> Results
                    </button>
                    <button onClick={() => { setEditSurvey(s); setShowModal(true) }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleTogglePublish(s)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${s.is_published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {s.is_published ? <><Eye size={12} /> Unpublish</> : <><Send size={12} /> Publish</>}
                    </button>
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <SurveyModal survey={editSurvey}
          onClose={() => { setShowModal(false); setEditSurvey(null) }}
          onSave={() => { setShowModal(false); setEditSurvey(null); fetchAll() }} />
      )}
      {viewResults && (
        <SurveyResults survey={viewResults} onClose={() => setViewResults(null)} />
      )}
    </div>
  )
}
