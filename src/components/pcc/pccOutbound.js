// Shared labels for the PointClickCare outbound queue (20261116_pcc_outbound_queue.sql).
export const PCC_KIND_LABELS = {
  progress_note:  'Progress note',
  charge:         'Charges',
  contact_update: 'Emergency contacts',
}

export const PCC_STATUS = {
  pending:   { label: 'Waiting for approval',          cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900' },
  approved:  { label: 'Approved, waiting to send',     cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900' },
  sending:   { label: 'Sending',                       cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900' },
  sent:      { label: 'Sent to PointClickCare',        cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900' },
  failed:    { label: 'Failed',                        cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' },
  cancelled: { label: 'Cancelled',                     cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
}

// Supabase RPC errors come back as { message }; show the database's own wording.
export const pccError = (e) => e?.message?.replace(/^.*?ERROR:\s*/, '') || 'Something went wrong'

export const fmtStamp = (ts) => ts
  ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : ''
