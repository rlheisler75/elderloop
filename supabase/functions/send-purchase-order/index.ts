// Email a submitted purchase order to the vendor (vendor ordering, option 1).
// The caller's own login records the send through record_po_message(), which checks
// who may order and that the order is submitted, and freezes exactly what was sent in
// po_messages. The email carries an HTML summary and the order as a CSV attachment;
// replies go to the person who sent it. The po_messages row is then marked sent or
// failed (with Resend's error), so a rejected send never fails silently.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

const FROM_ADDRESS = 'info@elderloop.xyz'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const money = (n: unknown) => n == null ? '' : `$${Number(n).toFixed(2)}`

type Line = { line: number; item_code: string | null; description: string; quantity: number; unit: string; unit_price: number | null; extended: number }
type Doc = {
  po_number: string; ordered_date: string; expected_date: string | null; notes: string | null; shipping_cost: number | null
  vendor: { name: string; account_number: string | null }
  ship_to: { name: string; address: string | null; city: string | null; state: string | null; zip: string | null; phone: string | null }
  ordered_by: string | null; ordered_by_email: string | null; lines: Line[]
}

// Same layout as src/lib/vendorOrder.js (the Download CSV button)
function toCsv(d: Doc) {
  const head = ['Account Number', 'PO Number', 'Line', 'Item Code', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Extended']
  const rows = d.lines.map(l => [d.vendor.account_number ?? '', d.po_number, l.line, l.item_code ?? '', l.description,
    l.quantity, l.unit ?? '', l.unit_price ?? '', l.extended])
  return [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n') + '\r\n'
}

function toHtml(d: Doc) {
  const shipTo = [d.ship_to.address, [d.ship_to.city, d.ship_to.state].filter(Boolean).join(', '), d.ship_to.zip].filter(Boolean).join(' ')
  const total = d.lines.reduce((s, l) => s + Number(l.extended || 0), 0)
  const rows = d.lines.map(l => `<tr>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${l.line}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-family:monospace">${esc(l.item_code ?? '—')}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${esc(l.description)}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${esc(l.quantity)} ${esc(l.unit ?? '')}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${money(l.unit_price)}</td></tr>`).join('')
  return `<div style="font-family:Arial,sans-serif;max-width:680px;color:#0c2340">
  <h2 style="font-size:20px;margin:0 0 4px">Purchase order ${esc(d.po_number)}</h2>
  <p style="margin:0 0 16px;color:#5b6b79">${esc(d.ship_to.name)}${d.vendor.account_number ? ` · Account ${esc(d.vendor.account_number)}` : ''}</p>
  <table style="font-size:14px;margin:0 0 16px">
    <tr><td style="color:#5b6b79;padding-right:12px">Ordered</td><td>${esc(d.ordered_date)}${d.ordered_by ? ` by ${esc(d.ordered_by)}` : ''}</td></tr>
    ${d.expected_date ? `<tr><td style="color:#5b6b79;padding-right:12px">Needed by</td><td>${esc(d.expected_date)}</td></tr>` : ''}
    <tr><td style="color:#5b6b79;padding-right:12px">Ship to</td><td>${esc(d.ship_to.name)}${shipTo ? `, ${esc(shipTo)}` : ''}${d.ship_to.phone ? ` · ${esc(d.ship_to.phone)}` : ''}</td></tr>
  </table>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <thead><tr style="text-align:left;color:#5b6b79">
      <th style="padding:6px 8px;border-bottom:2px solid #dbe3ea">Line</th><th style="padding:6px 8px;border-bottom:2px solid #dbe3ea">Item code</th>
      <th style="padding:6px 8px;border-bottom:2px solid #dbe3ea">Description</th><th style="padding:6px 8px;border-bottom:2px solid #dbe3ea;text-align:right">Qty</th>
      <th style="padding:6px 8px;border-bottom:2px solid #dbe3ea;text-align:right">Expected price</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:14px;margin:12px 0 0;text-align:right">Expected total ${money(total)}${d.shipping_cost ? ` + ${money(d.shipping_cost)} shipping` : ''}</p>
  ${d.notes ? `<p style="font-size:14px;margin:16px 0 0"><b>Notes:</b> ${esc(d.notes)}</p>` : ''}
  <p style="font-size:12px;color:#8b9bab;margin:24px 0 0">The order is attached as a CSV. Please confirm by replying to this email${d.ordered_by ? ` (it goes to ${esc(d.ordered_by)})` : ''}. Sent from ElderLoop.</p>
</div>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return respond({ success: false, error: 'POST only' }, 405)
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return respond({ success: false, error: 'Email is not configured' }, 500)

  const authHeader = req.headers.get('Authorization') ?? ''
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: { user } } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!user) return respond({ success: false, error: 'Unauthorized' }, 401)

  let body: { po_id?: string; to?: string; cc_me?: boolean }
  try { body = await req.json() } catch { return respond({ success: false, error: 'Invalid request' }, 400) }
  const to = String(body.to ?? '').trim()
  if (!body.po_id) return respond({ success: false, error: 'Missing order' }, 400)
  if (!EMAIL_RE.test(to)) return respond({ success: false, error: 'Enter a valid vendor email address' })

  // Permission, order status, and the frozen copy of what's sent all happen here, as the caller
  const { data: rec, error: recErr } = await userClient.rpc('record_po_message', { p_po: body.po_id, p_channel: 'email', p_recipient: to })
  if (recErr) return respond({ success: false, error: recErr.message })
  const { message_id: messageId, payload } = (rec as { message_id: string; payload: Doc }[])[0]
  const doc = payload

  const csv = toCsv(doc)
  const fromName = `${doc.ship_to.name} via ElderLoop`.replace(/[<>"]/g, '')
  const cc = body.cc_me && user.email && user.email !== to ? [user.email] : undefined
  const replyTo = user.email ?? doc.ordered_by_email ?? undefined

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${fromName} <${FROM_ADDRESS}>`,
      to: [to], ...(cc ? { cc } : {}), ...(replyTo ? { reply_to: replyTo } : {}),
      subject: `Purchase order ${doc.po_number} from ${doc.ship_to.name}`,
      html: toHtml(doc),
      attachments: [{ filename: `${doc.po_number}.csv`, content: btoa(unescape(encodeURIComponent(csv))) }],
    }),
  })
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500)
    console.error('send-purchase-order: Resend rejected', res.status, detail)
    await admin.from('po_messages').update({ status: 'failed', error: `Resend ${res.status}: ${detail}`, processed_at: new Date().toISOString() }).eq('id', messageId)
    return respond({ success: false, error: 'The email could not be sent. Try again, or download the order and send it yourself.' })
  }
  // external_ref is kept for the vendor's own reference (an EDI acknowledgment later)
  await admin.from('po_messages').update({ status: 'sent', processed_at: new Date().toISOString() }).eq('id', messageId)
  return respond({ success: true, message_id: messageId })
})
