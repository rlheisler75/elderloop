import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Star, Check, ChevronRight } from 'lucide-react'

function Stars({ value, max = 5, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-2">
      {Array.from({ length: max }).map((_, i) => (
        <button key={i} type="button"
          onMouseEnter={() => setHover(i + 1)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i + 1)}
          className="transition-all hover:scale-110">
          <Star size={28} className={`${(hover || value) > i ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} transition-colors`} />
        </button>
      ))}
    </div>
  )
}

function OpinionScale({ value, onChange }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>Not at all (0)</span><span>Extremely (10)</span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 11 }).map((_, i) => (
          <button key={i} type="button" onClick={() => onChange(i)}
            className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all ${value === i ? 'bg-brand-600 border-brand-600 text-white scale-110' : 'border-slate-200 text-slate-500 hover:border-brand-300'}`}>
            {i}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SurveyPublic() {
  const { token } = useParams()
  const [survey, setSurvey]     = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]   = useState({})
  const [responderName, setResponderName] = useState('')
  const [responderEmail, setResponderEmail] = useState('')
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]       = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { if (token) fetchSurvey() }, [token])

  async function fetchSurvey() {
    const { data: s } = await supabase.from('surveys').select('*')
      .eq('public_token', token).eq('is_published', true).eq('is_active', true).single()

    if (!s) { setNotFound(true); setLoading(false); return }

    const { data: q } = await supabase.from('survey_questions').select('*')
      .eq('survey_id', s.id).order('sort_order')

    setSurvey(s)
    setQuestions(q || [])
    setLoading(false)
  }

  const setAnswer = (questionId, value) => {
    setAnswers(a => ({ ...a, [questionId]: value }))
  }

  const handleSubmit = async () => {
    // Check required questions
    const missing = questions.filter(q => q.is_required && answers[q.id] == null)
    if (missing.length) { setError(`Please answer all required questions (${missing.length} remaining)`); return }

    setSubmitting(true)

    // Calculate overall score (avg of numeric answers as %)
    const numericAnswers = questions.filter(q => ['rating','opinion_scale'].includes(q.type))
      .map(q => {
        const val = answers[q.id]
        const max = q.type === 'opinion_scale' ? 10 : (q.max_rating || 5)
        return val != null ? (val / max) * 100 : null
      }).filter(v => v != null)

    const overallScore = numericAnswers.length
      ? numericAnswers.reduce((a, b) => a + b, 0) / numericAnswers.length
      : null

    // Create response
    const { data: response, error: rErr } = await supabase.from('survey_responses').insert({
      survey_id:        survey.id,
      organization_id:  survey.organization_id,
      respondent_name:  responderName || null,
      respondent_email: responderEmail || null,
      respondent_type:  'anonymous',
      status:           'completed',
      overall_score:    overallScore,
      submitted_at:     new Date().toISOString(),
    }).select().single()

    if (rErr || !response) { setError('Failed to submit. Please try again.'); setSubmitting(false); return }

    // Insert answers
    const answerRows = questions.map(q => {
      const val = answers[q.id]
      const row = { response_id: response.id, question_id: q.id }
      if (['rating','opinion_scale'].includes(q.type)) row.rating_value = val
      else if (q.type === 'binary') row.boolean_value = val
      else if (['text','textarea'].includes(q.type)) row.text_value = val
      else if (['radio','checkbox'].includes(q.type)) row.selected_options = Array.isArray(val) ? val : (val ? [val] : [])
      return row
    }).filter(r => answers[r.question_id] != null)

    if (answerRows.length) await supabase.from('survey_answers').insert(answerRows)

    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400">Loading survey...</div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="font-display text-xl font-semibold text-slate-800 mb-2">Survey Not Found</h2>
        <p className="text-slate-500 text-sm">This survey may have ended or the link is invalid.</p>
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
        <p className="text-slate-500">Your response has been recorded. We appreciate your feedback.</p>
        <div className="mt-6 text-xs text-slate-400">Powered by ElderLoop</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="bg-brand-950 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="text-brand-400 text-xs font-medium mb-1">ElderLoop Survey</div>
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Playfair Display", serif' }}>{survey.title}</h1>
          {survey.description && <p className="text-brand-300 text-sm mt-2">{survey.description}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Respondent info (optional) */}
        {survey.allow_anonymous && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Your Information <span className="text-slate-400 font-normal">(optional)</span></h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={responderName} onChange={e => setResponderName(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Your name" />
              <input type="email" value={responderEmail} onChange={e => setResponderEmail(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Email address" />
            </div>
          </div>
        )}

        {/* Questions */}
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start gap-2 mb-4">
              <span className="text-xs font-bold text-brand-600 bg-brand-50 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{q.question}</p>
                {q.is_required && <span className="text-xs text-red-500 font-medium">* Required</span>}
              </div>
            </div>

            {q.type === 'rating' && (
              <Stars value={answers[q.id] || 0} max={q.max_rating || 5} onChange={v => setAnswer(q.id, v)} />
            )}
            {q.type === 'opinion_scale' && (
              <OpinionScale value={answers[q.id]} onChange={v => setAnswer(q.id, v)} />
            )}
            {q.type === 'binary' && (
              <div className="flex gap-3">
                {['Yes', 'No'].map(opt => (
                  <button key={opt} type="button" onClick={() => setAnswer(q.id, opt === 'Yes')}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${answers[q.id] === (opt === 'Yes') && answers[q.id] != null ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {q.type === 'radio' && (
              <div className="space-y-2">
                {(q.options || []).map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt ? 'bg-brand-50 border-brand-300' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${answers[q.id] === opt ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`} />
                    <span className="text-sm text-slate-700" onClick={() => setAnswer(q.id, opt)}>{opt}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === 'checkbox' && (
              <div className="space-y-2">
                {(q.options || []).map(opt => {
                  const selected = (answers[q.id] || []).includes(opt)
                  const toggle = () => {
                    const curr = answers[q.id] || []
                    setAnswer(q.id, selected ? curr.filter(o => o !== opt) : [...curr, opt])
                  }
                  return (
                    <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'bg-brand-50 border-brand-300' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}>
                        {selected && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm text-slate-700" onClick={toggle}>{opt}</span>
                    </label>
                  )
                })}
              </div>
            )}
            {q.type === 'text' && (
              <input value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Your answer..." />
            )}
            {q.type === 'textarea' && (
              <textarea value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Your answer..." />
            )}
          </div>
        ))}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-900/20">
          {submitting ? 'Submitting...' : <><Check size={18} /> Submit Survey</>}
        </button>

        <p className="text-center text-xs text-slate-400 pb-6">Powered by ElderLoop · Your response is confidential</p>
      </div>
    </div>
  )
}
