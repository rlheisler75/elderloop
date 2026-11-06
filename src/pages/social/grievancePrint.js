// Printable grievance documents: the written response letter for one grievance
// (RSMo 198.088.3: findings and proposed remedies, plus the resident's right to
// go outside the facility) and the grievance log for state surveyors.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const para = (s) => esc(s).replace(/\n/g, '<br>')
const fmtDate = (d) => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
const person = (p) => p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : ''

export function complainantName(g) {
  if (g.complainant_type === 'resident' || !g.complainant_name) return g.residents ? person(g.residents) : (g.complainant_name || '—')
  return g.complainant_name + (g.complainant_relationship ? ` (${g.complainant_relationship})` : '')
}

// on_time | late | open_overdue | open | no_deadline
export function responseState(g, now = new Date()) {
  if (!g.written_response_due) return g.written_response_at ? 'on_time' : 'no_deadline'
  const due = new Date(g.written_response_due)
  if (g.written_response_at) return new Date(g.written_response_at) <= due ? 'on_time' : 'late'
  return now > due ? 'open_overdue' : 'open'
}

const BASE_CSS = `
  body { font-family: Arial, sans-serif; color: #0c2340; font-size: 12px; padding: 24px; }
  h1 { font-size: 18px; margin: 0; } h2 { font-size: 14px; margin: 18px 0 6px; }
  .sub { color: #5b6b79; margin: 2px 0 14px; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin: 8px 0; }
  .rights { border: 2px solid #0c2340; border-radius: 6px; padding: 10px 12px; margin-top: 18px; }
  .meta td { padding: 2px 12px 2px 0; vertical-align: top; } .meta td:first-child { color: #5b6b79; white-space: nowrap; }
  .sig { margin-top: 36px; display: flex; gap: 48px; } .sig div { border-top: 1px solid #000; padding-top: 4px; width: 220px; font-size: 11px; color: #5b6b79; }
  .foot { margin-top: 18px; font-size: 10px; color: #8b9bab; }
  @media print { body { padding: 0; } }`

function openPrint(title, css, body) {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(`<html><head><title>${esc(title)}</title><style>${BASE_CSS}${css}</style></head><body>${body}</body></html>`)
  win.document.close()
  win.focus()
  win.print()
  return true
}

export function printResponseLetter(g, { orgName, designee, dhssPhone, ombudsmanPhone }) {
  const body = `
    <h1>${esc(orgName)}</h1>
    <div class="sub">Written Response to Grievance ${esc(g.grievance_number)}</div>
    <table class="meta">
      <tr><td>To</td><td><b>${esc(complainantName(g))}</b></td></tr>
      ${g.residents ? `<tr><td>Resident</td><td>${esc(person(g.residents))}</td></tr>` : ''}
      <tr><td>Date received</td><td>${fmtDateTime(g.received_at || g.filed_at)}</td></tr>
      ${g.incident_date ? `<tr><td>Date of occurrence</td><td>${fmtDate(g.incident_date)}</td></tr>` : ''}
      <tr><td>Date of this response</td><td>${fmtDate(g.written_response_at || new Date().toISOString())}</td></tr>
    </table>
    <h2>Your concern</h2><div class="box">${para(g.description)}</div>
    <h2>What we found</h2><div class="box">${para(g.findings) || '&nbsp;'}</div>
    <h2>What we will do</h2><div class="box">${para(g.proposed_remedies) || '&nbsp;'}</div>
    <div class="rights">
      <b>Your rights.</b> You do not have to use this grievance process first, and you may contact any of these at any time,
      without fear of retaliation:
      <ul style="margin:6px 0 0 18px; padding:0">
        <li>Missouri Department of Health and Senior Services (DHSS)${dhssPhone ? `: <b>${esc(dhssPhone)}</b>` : ''}</li>
        <li>Missouri Long-Term Care Ombudsman Program${ombudsmanPhone ? `: <b>${esc(ombudsmanPhone)}</b>` : ''}</li>
        <li>Anyone else outside the facility</li>
      </ul>
    </div>
    <div class="sig"><div>${esc(designee || 'Grievance designee')}, Grievance Designee</div><div>Received by (complainant), date</div></div>
    <div class="foot">Provided under RSMo § 198.088.3. Printed ${fmtDateTime(new Date().toISOString())} · ElderLoop</div>`
  return openPrint(`Grievance ${g.grievance_number} response`, '', body)
}

const STATE_LABEL = { on_time: 'On time', late: 'Late', open_overdue: 'Overdue', open: 'Not yet given', no_deadline: '—' }

export function printGrievanceLog(rows, { orgName, from, to, categories, statuses, designee, responseDays }) {
  const counts = rows.reduce((a, g) => { a[responseState(g)]++; return a }, { on_time: 0, late: 0, open_overdue: 0, open: 0, no_deadline: 0 })
  const label = (list, key) => list.find(x => x.key === key)?.label || key || '—'
  const tr = rows.map(g => `
    <tr>
      <td>${esc(g.grievance_number)}</td>
      <td>${fmtDate(g.received_at || g.filed_at)}${g.incident_date ? `<br><small>Occurred ${fmtDate(g.incident_date)}${g.filed_late ? ' · filed late' : ''}</small>` : ''}</td>
      <td>${esc(complainantName(g))}${g.residents && g.complainant_type !== 'resident' ? `<br><small>Re: ${esc(person(g.residents))}</small>` : ''}</td>
      <td>${esc(label(categories, g.category))}</td>
      <td>${para(g.description)}</td>
      <td>${fmtDate(g.written_response_due)}</td>
      <td>${g.written_response_at ? fmtDate(g.written_response_at) : '—'}<br><small class="st-${responseState(g)}">${STATE_LABEL[responseState(g)]}</small>${g.oral_explanation_needed ? `<br><small>Oral: ${g.oral_explanation_at ? fmtDate(g.oral_explanation_at) : 'needed'}</small>` : ''}</td>
      <td>${para(g.findings)}${g.proposed_remedies ? `<br><b>Remedy:</b> ${para(g.proposed_remedies)}` : ''}${g.resolution ? `<br><b>Outcome:</b> ${para(g.resolution)}` : ''}</td>
      <td>${esc(label(statuses, g.status))}${g.resolved_at ? `<br><small>${fmtDate(g.resolved_at)}</small>` : ''}</td>
    </tr>`).join('')
  const css = `
    @page { size: landscape; margin: 0.4in; }
    table.log { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; }
    .log th { background: #f1f5f9; text-align: left; font-size: 9.5px; text-transform: uppercase; padding: 5px 6px; border-bottom: 2px solid #e2e8f0; }
    .log td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 10.5px; word-wrap: break-word; }
    .log small { color: #64748b; } .st-late, .st-open_overdue { color: #dc2626; font-weight: bold; } .st-on_time { color: #16a34a; }
    .sum span { display: inline-block; margin-right: 16px; }`
  const body = `
    <h1>${esc(orgName)}</h1>
    <div class="sub">Grievance Log · ${fmtDate(from)} to ${fmtDate(to)}${designee ? ` · Grievance designee: ${esc(designee)}` : ''}</div>
    <div class="sum">
      <span><b>${rows.length}</b> grievances</span>
      ${responseDays ? `<span>Written response within ${responseDays} days: <b>${counts.on_time}</b> on time, <b>${counts.late}</b> late, <b>${counts.open_overdue}</b> overdue, <b>${counts.open}</b> not yet due</span>` : ''}
    </div>
    <table class="log">
      <colgroup><col style="width:8%"><col style="width:9%"><col style="width:11%"><col style="width:8%"><col style="width:20%"><col style="width:7%"><col style="width:9%"><col style="width:20%"><col style="width:8%"></colgroup>
      <thead><tr><th>Number</th><th>Received</th><th>Complainant</th><th>Category</th><th>Concern</th><th>Response due</th><th>Response given</th><th>Findings / remedy / outcome</th><th>Status</th></tr></thead>
      <tbody>${tr || '<tr><td colspan="9" style="color:#94a3b8">No grievances in this period.</td></tr>'}</tbody>
    </table>
    <div class="foot">Complete record of complaints and grievances kept under RSMo § 198.088.3(5). Printed ${fmtDateTime(new Date().toISOString())} · ElderLoop</div>`
  return openPrint(`Grievance log ${from} to ${to}`, css, body)
}
