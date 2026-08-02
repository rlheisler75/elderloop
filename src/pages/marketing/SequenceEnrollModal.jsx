import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Zap, X } from 'lucide-react'
import { Modal, selectCls } from './ui'

export default function SequenceEnrollModal({ lead, onClose }) {
  const { profile } = useAuth()
  const [sequences, setSequences] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    const [{ data: seqs }, { data: enr }] = await Promise.all([
      supabase.from('nurture_sequences').select('*').eq('organization_id', lead.organization_id).eq('is_active', true).order('name'),
      supabase.from('lead_sequence_enrollments').select('*, sequence:nurture_sequences(name)').eq('lead_id', lead.id).order('created_at', { ascending: false }),
    ])
    setSequences(seqs || [])
    setEnrollments(enr || [])
    setLoading(false)
  }, [lead.id, lead.organization_id])

  useEffect(() => { refetch() }, [refetch])

  const enroll = async () => {
    if (!selected) return
    setSaving(true)
    const { data: firstStep } = await supabase.from('nurture_sequence_steps')
      .select('delay_days').eq('sequence_id', selected).order('step_order', { ascending: true }).limit(1).maybeSingle()
    const now = new Date()
    const nextSendAt = new Date(now.getTime() + (firstStep?.delay_days || 0) * 86400000).toISOString()
    await supabase.from('lead_sequence_enrollments').insert({
      organization_id: lead.organization_id, lead_id: lead.id, sequence_id: selected,
      status: 'active', current_step: 0, enrolled_at: now.toISOString(), next_send_at: nextSendAt,
      created_by: profile?.id,
    })
    setSaving(false)
    setSelected('')
    refetch()
  }

  const exitEnrollment = async (id) => {
    await supabase.from('lead_sequence_enrollments').update({ status: 'exited', exited_reason: 'manual' }).eq('id', id)
    refetch()
  }

  const activeEnrollments = enrollments.filter(e => e.status === 'active')
  const pastEnrollments = enrollments.filter(e => e.status !== 'active')
  const enrolledSequenceIds = new Set(activeEnrollments.map(e => e.sequence_id))
  const available = sequences.filter(s => !enrolledSequenceIds.has(s.id))

  const STATUS_LABEL = { completed: 'Completed', exited: 'Exited' }

  return (
    <Modal title={`Sequences — ${lead.first_name} ${lead.last_name}`} onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeEnrollments.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Currently Enrolled</p>
              <div className="space-y-2">
                {activeEnrollments.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-brand-50/60 dark:bg-brand-950/30 rounded-xl border border-brand-100 dark:border-brand-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap size={14} className="text-brand-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{e.sequence?.name}</p>
                        <p className="text-xs text-slate-400">Step {e.current_step + 1} · next send {e.next_send_at ? new Date(e.next_send_at).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                    <button onClick={() => exitEnrollment(e.id)} title="Remove from sequence"
                      className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Enroll In</p>
            {available.length === 0 ? (
              <p className="text-sm text-slate-400">No other active sequences available.</p>
            ) : (
              <div className="flex items-center gap-2">
                <select className={selectCls} value={selected} onChange={e => setSelected(e.target.value)}>
                  <option value="">— Select a sequence —</option>
                  {available.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={enroll} disabled={!selected || saving}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap">
                  {saving ? 'Enrolling…' : 'Enroll'}
                </button>
              </div>
            )}
          </div>

          {pastEnrollments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">History</p>
              <div className="space-y-1.5">
                {pastEnrollments.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>{e.sequence?.name}</span>
                    <span>{STATUS_LABEL[e.status] || e.status}{e.exited_reason ? ` (${e.exited_reason.replace(/_/g, ' ')})` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
