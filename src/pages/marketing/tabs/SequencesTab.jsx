import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { Plus, Edit2, Trash2, Zap, Users, Layers } from 'lucide-react'
import { Badge, Modal, Field, inputCls } from '../ui'

// ── Sequence Form (with inline step builder) ───────────────────

function SequenceForm({ sequence, onSave, onClose }) {
  const { profile } = useAuth()
  const [name, setName] = useState(sequence?.name || '')
  const [description, setDescription] = useState(sequence?.description || '')
  const [isActive, setIsActive] = useState(sequence?.is_active ?? true)
  const [isRepeating, setIsRepeating] = useState(sequence?.is_repeating ?? false)
  const [repeatIntervalDays, setRepeatIntervalDays] = useState(sequence?.repeat_interval_days || 30)
  const [steps, setSteps] = useState(sequence?.id ? [] : [{ delay_days: 0, subject: '', body: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sequence?.id) return
    supabase.from('nurture_sequence_steps').select('*').eq('sequence_id', sequence.id).order('step_order', { ascending: true })
      .then(({ data }) => setSteps((data || []).map(s => ({ delay_days: s.delay_days, subject: s.subject, body: s.body }))))
  }, [sequence?.id])

  const addStep = () => setSteps(s => [...s, { delay_days: (Number(s[s.length - 1]?.delay_days) || 0) + 3, subject: '', body: '' }])
  const updateStep = (i, k, v) => setSteps(s => s.map((st, idx) => idx === i ? { ...st, [k]: v } : st))
  const removeStep = (i) => setSteps(s => s.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!name || steps.length === 0 || steps.some(s => !s.subject || !s.body)) {
      setError("Name and every step's subject/body are required.")
      return
    }
    setSaving(true)
    setError('')
    const orgId = profile?.organization_id
    const payload = {
      name, description: description || null, is_active: isActive,
      is_repeating: isRepeating, repeat_interval_days: isRepeating ? (Number(repeatIntervalDays) || 30) : null,
      organization_id: orgId, created_by: profile?.id,
    }
    const { data: seq, error: seqErr } = sequence?.id
      ? await supabase.from('nurture_sequences').update(payload).eq('id', sequence.id).select().single()
      : await supabase.from('nurture_sequences').insert(payload).select().single()
    if (seqErr) { setSaving(false); setError(seqErr.message); return }

    if (sequence?.id) {
      await supabase.from('nurture_sequence_steps').delete().eq('sequence_id', seq.id)
    }
    const stepRows = steps.map((s, i) => ({
      organization_id: orgId, sequence_id: seq.id, step_order: i,
      delay_days: Number(s.delay_days) || 0, subject: s.subject, body: s.body,
    }))
    const { error: stepErr } = await supabase.from('nurture_sequence_steps').insert(stepRows)
    setSaving(false)
    if (stepErr) { setError(stepErr.message); return }
    onSave()
  }

  return (
    <>
      {error && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>}
      <div className="grid grid-cols-1 gap-4 mb-2">
        <Field label="Sequence Name" required>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="No-Tour Follow-Up" />
        </Field>
        <Field label="Description">
          <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Nudges leads who haven't booked a tour" />
        </Field>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input type="checkbox" id="seq_active" checked={isActive} onChange={e => setIsActive(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <label htmlFor="seq_active" className="text-sm text-slate-600 dark:text-slate-300">Active (enrolled leads will receive sends)</label>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <input type="checkbox" id="seq_repeating" checked={isRepeating} onChange={e => setIsRepeating(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <label htmlFor="seq_repeating" className="text-sm text-slate-600 dark:text-slate-300">Repeat the last step indefinitely (e.g. a recurring waitlist check-in)</label>
      </div>
      {isRepeating && (
        <div className="mb-5 ml-6">
          <Field label="Repeat every (days)">
            <input className={`${inputCls} w-32`} type="number" min="1" value={repeatIntervalDays} onChange={e => setRepeatIntervalDays(e.target.value)} />
          </Field>
          <p className="text-xs text-slate-400 mt-1.5">
            After the last step below, it keeps resending that same step on this interval until the lead converts, is lost/disqualified, or opts out.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-brand-600">Step {i + 1}</span>
              {steps.length > 1 && (
                <button onClick={() => removeStep(i)} className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Send After (days)">
                <input className={inputCls} type="number" min="0" value={step.delay_days} onChange={e => updateStep(i, 'delay_days', e.target.value)} />
              </Field>
              <Field label="Subject">
                <input className={inputCls} value={step.subject} onChange={e => updateStep(i, 'subject', e.target.value)} placeholder="Still thinking about a tour?" />
              </Field>
            </div>
            <Field label="Body">
              <textarea className={inputCls} rows={3} value={step.body} onChange={e => updateStep(i, 'body', e.target.value)} placeholder="Hi {{first_name}}, ..." />
            </Field>
          </div>
        ))}
      </div>
      <button onClick={addStep} className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Step</button>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : sequence?.id ? 'Save Changes' : 'Create Sequence'}
        </button>
      </div>
    </>
  )
}

// ── Sequences Tab ────────────────────────────────────────────

export default function SequencesTab({ orgId }) {
  const [sequences, setSequences] = useState([])
  const [stepCounts, setStepCounts] = useState({})
  const [enrollCounts, setEnrollCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSeq, setEditSeq] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data: seqs } = await supabase.from('nurture_sequences').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
    setSequences(seqs || [])
    if (seqs?.length) {
      const ids = seqs.map(s => s.id)
      const [{ data: steps }, { data: enrolls }] = await Promise.all([
        supabase.from('nurture_sequence_steps').select('sequence_id').in('sequence_id', ids),
        supabase.from('lead_sequence_enrollments').select('sequence_id').in('sequence_id', ids).eq('status', 'active'),
      ])
      const sc = {}; (steps || []).forEach(s => { sc[s.sequence_id] = (sc[s.sequence_id] || 0) + 1 })
      const ec = {}; (enrolls || []).forEach(e => { ec[e.sequence_id] = (ec[e.sequence_id] || 0) + 1 })
      setStepCounts(sc); setEnrollCounts(ec)
    } else {
      setStepCounts({}); setEnrollCounts({})
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleActive = async (seq) => {
    await supabase.from('nurture_sequences').update({ is_active: !seq.is_active }).eq('id', seq.id)
    fetchAll()
  }

  const deleteSequence = async (id) => {
    if (!confirm('Delete this sequence? Active enrollments will stop sending.')) return
    await supabase.from('nurture_sequences').delete().eq('id', id)
    fetchAll()
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
        <p className="text-sm text-slate-500">{sequences.length} sequence{sequences.length === 1 ? '' : 's'} · runs automatically every 15 minutes</p>
        <button onClick={() => { setEditSeq(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> New Sequence
        </button>
      </div>

      {sequences.length === 0 ? (
        <div className="text-center py-20">
          <Zap size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">No nurture sequences yet</p>
          <p className="text-slate-300 text-sm mt-1">Build a multi-step email drip and enroll leads from the pipeline</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sequences.map(seq => (
            <div key={seq.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={seq.is_active
                      ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}>
                      {seq.is_active ? 'Active' : 'Paused'}
                    </Badge>
                    {seq.is_repeating && (
                      <Badge color="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900">
                        Repeats every {seq.repeat_interval_days}d
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{seq.name}</h3>
                  {seq.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{seq.description}</p>}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => { setEditSeq(seq); setShowForm(true) }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteSequence(seq.id)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1"><Layers size={11} />Steps</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mt-0.5">{stepCounts[seq.id] || 0}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1"><Users size={11} />Enrolled</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mt-0.5">{enrollCounts[seq.id] || 0}</p>
                </div>
              </div>

              <button onClick={() => toggleActive(seq)}
                className="text-xs px-2.5 py-1 rounded-full border font-medium transition-colors text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                {seq.is_active ? 'Pause' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editSeq ? 'Edit Sequence' : 'New Sequence'} onClose={() => setShowForm(false)} wide>
          <SequenceForm sequence={editSeq}
            onSave={() => { setShowForm(false); fetchAll() }} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  )
}
