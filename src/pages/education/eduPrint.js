// Printables for Education: the QR check-in poster for the classroom, the
// paper sign-in sheet (for anyone who can't scan), and the compliance report.
import QRCode from 'qrcode'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
export const fmtDay = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''
export const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function openPrint(title, css, body) {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(`<html><head><title>${esc(title)}</title><style>
    body { font-family: Arial, sans-serif; color: #0c2340; padding: 24px; font-size: 12px; }
    h1 { margin: 0; font-size: 20px; } .sub { color: #5b6b79; margin: 4px 0 14px; }
    .foot { margin-top: 16px; font-size: 10px; color: #8b9bab; }
    @media print { body { padding: 0; } }
    ${css}</style></head><body>${body}</body></html>`)
  win.document.close()
  // Images (the QR code) must load before printing; print once, whichever comes first
  let printed = false
  const go = () => { if (printed) return; printed = true; win.focus(); win.print() }
  win.onload = go
  setTimeout(go, 600)
  return true
}

export function checkinUrl(token) {
  return `${window.location.origin}/app/education/checkin?t=${token}`
}

export async function printQrPoster(session, token, orgName) {
  const url = checkinUrl(token)
  const img = await QRCode.toDataURL(url, { width: 900, margin: 1, errorCorrectionLevel: 'M' })
  const when = [fmtDay(session.session_date), fmtTime(session.start_time)].filter(Boolean).join(' · ')
  openPrint(`Check-in: ${session.title}`, `
    @page { size: portrait; margin: 0.6in; }
    .wrap { text-align: center; } .t { font-size: 34px; font-weight: bold; margin: 18px 0 6px; }
    .w { font-size: 18px; color: #334155; } .qr { width: 5.5in; height: 5.5in; margin: 22px auto 12px; display: block; }
    .how { font-size: 18px; margin-top: 8px; } .small { font-size: 11px; color: #64748b; margin-top: 18px; word-break: break-all; }`, `
    <div class="wrap">
      <h1>${esc(orgName)}</h1>
      <div class="t">${esc(session.title)}</div>
      <div class="w">${esc(when)}${session.location ? ` · ${esc(session.location)}` : ''}</div>
      <img class="qr" src="${img}" alt="Check-in QR code">
      <div class="how"><b>Scan with your phone camera to check in.</b><br>Sign in to ElderLoop if asked.</div>
      <div class="how" style="font-size:14px;color:#475569;margin-top:10px">Check-in opens 30 minutes before the class and closes 1 hour after it starts.<br>Can't scan? Sign the paper sheet.</div>
      <div class="small">${esc(url)}</div>
    </div>`)
}

export function printSignInSheet(session, roster, orgName, deptLabel) {
  const when = [fmtDay(session.session_date), fmtTime(session.start_time)].filter(Boolean).join(' · ')
  const rows = roster.map((p, i) => `
    <tr><td>${i + 1}</td><td>${esc(p.last_name)}, ${esc(p.first_name)}</td><td>${esc(deptLabel(p))}</td><td></td><td></td></tr>`).join('')
  const blanks = Array.from({ length: 8 }, () => '<tr><td></td><td></td><td></td><td></td><td></td></tr>').join('')
  openPrint(`Sign-in: ${session.title}`, `
    @page { size: portrait; margin: 0.5in; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f1f5f9; text-align: left; font-size: 10px; text-transform: uppercase; padding: 6px; border: 1px solid #cbd5e1; }
    td { border: 1px solid #cbd5e1; padding: 0 6px; height: 26px; font-size: 11.5px; }`, `
    <h1>${esc(orgName)}</h1>
    <div class="sub"><b>${esc(session.title)}</b> · ${esc(when)} · ${Number(session.hours)} hour${Number(session.hours) === 1 ? '' : 's'}${session.instructor ? ` · Instructor: ${esc(session.instructor)}` : ''}${session.location ? ` · ${esc(session.location)}` : ''}</div>
    <table>
      <colgroup><col style="width:5%"><col style="width:32%"><col style="width:18%"><col style="width:33%"><col style="width:12%"></colgroup>
      <thead><tr><th>#</th><th>Name</th><th>Department</th><th>Signature</th><th>Time in</th></tr></thead>
      <tbody>${rows}${blanks}</tbody>
    </table>
    <div style="margin-top:28px;display:flex;gap:48px"><div style="border-top:1px solid #000;width:240px;padding-top:4px;font-size:11px;color:#64748b">Instructor signature</div></div>
    <div class="foot">${roster.length} expected · Printed ${new Date().toLocaleString()} · ElderLoop Education</div>`)
}

export function printCompliance(rows, { orgName, year, requirements }) {
  const tr = rows.map(r => `
    <tr>
      <td>${esc(r.name)}${r.inactive ? ' <small>(former)</small>' : ''}</td>
      <td>${esc(r.dept)}</td>
      <td>${r.hours}</td>
      <td>${r.reqs.map(q => `<div class="${q.met ? 'ok' : 'bad'}">${q.met ? '✓' : '✗'} ${esc(q.name)}${q.missing.length ? ` <small>(${esc(q.missing.join('; '))})</small>` : ''}</div>`).join('') || '—'}</td>
      <td>${r.owed || ''}</td>
    </tr>`).join('')
  openPrint(`In-service compliance ${year}`, `
    @page { size: landscape; margin: 0.4in; }
    table { width: 100%; border-collapse: collapse; } th { background: #f1f5f9; text-align: left; font-size: 10px; text-transform: uppercase; padding: 5px 6px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 11px; } small { color: #64748b; }
    .ok { color: #16a34a; } .bad { color: #dc2626; font-weight: bold; }`, `
    <h1>${esc(orgName)}</h1>
    <div class="sub">In-Service Compliance · ${year}${requirements.length ? ` · Requirements: ${esc(requirements.map(q => q.name).join(', '))}` : ''}</div>
    <table>
      <colgroup><col style="width:22%"><col style="width:14%"><col style="width:8%"><col style="width:46%"><col style="width:10%"></colgroup>
      <thead><tr><th>Name</th><th>Department</th><th>Hours</th><th>Requirements</th><th>Makeups owed</th></tr></thead>
      <tbody>${tr || '<tr><td colspan="5">No staff.</td></tr>'}</tbody>
    </table>
    <div class="foot">Hours count sessions attended plus completed makeups (credited with the missed session's hours). Printed ${new Date().toLocaleString()} · ElderLoop Education</div>`)
}
