// Vendor ordering (option 1): the order document a vendor receives, as a CSV
// download or a printable page. The document comes from record_po_message()
// (20261004_vendor_ordering.sql), which also logs the send in po_messages.
// Keep the CSV layout in step with toCsv() in supabase/functions/send-purchase-order.

export const CSV_HEADER = ['Account Number', 'PO Number', 'Line', 'Item Code', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Extended']

export function orderCsv(doc) {
  const rows = (doc.lines || []).map(l => [doc.vendor?.account_number ?? '', doc.po_number, l.line, l.item_code ?? '', l.description,
    l.quantity, l.unit ?? '', l.unit_price ?? '', l.extended])
  return [CSV_HEADER, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n') + '\r\n'
}

export function downloadOrderCsv(doc) {
  const url = URL.createObjectURL(new Blob([orderCsv(doc)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${doc.po_number}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const money = (n) => n == null ? '' : `$${Number(n).toFixed(2)}`

// Opens a printable order in a new window (Print → Save as PDF)
export function printOrder(doc) {
  const shipTo = [doc.ship_to?.address, [doc.ship_to?.city, doc.ship_to?.state].filter(Boolean).join(', '), doc.ship_to?.zip].filter(Boolean).join(' ')
  const total = (doc.lines || []).reduce((s, l) => s + Number(l.extended || 0), 0)
  const rows = (doc.lines || []).map(l => `<tr><td>${l.line}</td><td class="code">${esc(l.item_code ?? '—')}</td><td>${esc(l.description)}</td>
    <td class="num">${esc(l.quantity)}</td><td>${esc(l.unit ?? '')}</td><td class="num">${money(l.unit_price)}</td><td class="num">${money(l.extended)}</td></tr>`).join('')
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return false
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.po_number)}</title>
<style>
  body{font-family:Arial,sans-serif;color:#0c2340;margin:32px;font-size:13px}
  h1{font-size:22px;margin:0 0 4px} .muted{color:#5b6b79}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}
  .box{border:1px solid #dbe3ea;border-radius:6px;padding:10px 12px}
  .box b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#5b6b79;margin-bottom:4px}
  table{width:100%;border-collapse:collapse} th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left}
  th{font-size:11px;text-transform:uppercase;color:#5b6b79;border-bottom:2px solid #dbe3ea}
  .num{text-align:right} .code{font-family:monospace}
  .total{text-align:right;margin-top:10px;font-size:14px} @media print{body{margin:12mm}}
</style></head><body>
<h1>Purchase Order ${esc(doc.po_number)}</h1>
<div class="muted">${esc(doc.ship_to?.name)} · Ordered ${esc(doc.ordered_date)}${doc.ordered_by ? ` by ${esc(doc.ordered_by)}` : ''}${doc.expected_date ? ` · Needed by ${esc(doc.expected_date)}` : ''}</div>
<div class="grid">
  <div class="box"><b>Vendor</b>${esc(doc.vendor?.name)}${doc.vendor?.account_number ? `<br>Account ${esc(doc.vendor.account_number)}` : ''}</div>
  <div class="box"><b>Ship to</b>${esc(doc.ship_to?.name)}${shipTo ? `<br>${esc(shipTo)}` : ''}${doc.ship_to?.phone ? `<br>${esc(doc.ship_to.phone)}` : ''}</div>
</div>
<table><thead><tr><th>Line</th><th>Item code</th><th>Description</th><th class="num">Qty</th><th>Unit</th><th class="num">Unit price</th><th class="num">Extended</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="total">Expected total <b>${money(total)}</b>${doc.shipping_cost ? ` + ${money(doc.shipping_cost)} shipping` : ''}</div>
${doc.notes ? `<p><b>Notes:</b> ${esc(doc.notes)}</p>` : ''}
<script>window.onload = () => window.print()</script>
</body></html>`)
  win.document.close()
  return true
}

export const CHANNEL_LABELS = { download: 'Downloaded (CSV)', print: 'Printed / PDF', email: 'Emailed', edi: 'EDI', punchout: 'Punchout', api: 'API' }
