// Table-shape diagrams for the seating chart's "Table layout" view. Each shape
// places seat 1 at the top and numbers the rest clockwise. buildTableSVG
// returns plain SVG markup so the screen and the print window draw the same
// picture; seatBoxes gives the seat rectangles so the screen can lay its
// seat pickers over them.

export const TABLE_SHAPES = [
  { key: 'square',    label: 'Square' },
  { key: 'round',     label: 'Round' },
  { key: 'horseshoe', label: 'Horseshoe' },
  { key: 'l_right',   label: 'L (right)' },
  { key: 'l_left',    label: 'L (left)' },
]

const W = 132   // seat box
const H = 46
const G = 10    // gap between seats
const D = 10    // gap between a seat and the table edge
const T = 70    // arm width for horseshoe and L tables
const PAD = 4

// Seats spread evenly along a straight run, from (x1,y1) toward (x2,y2)
const along = (count, x1, y1, x2, y2) =>
  Array.from({ length: count }, (_, j) => {
    const t = (j + 0.5) / count
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }
  })

// Hands out n seats one at a time to the sides in priority order, skipping
// any side that has hit its cap
function deal(n, sides) {
  const counts = Object.fromEntries(sides.map(s => [s.key, 0]))
  let given = 0
  while (given < n) {
    let progressed = false
    for (const s of sides) {
      if (given >= n) break
      if (s.max != null && counts[s.key] >= s.max) continue
      counts[s.key]++; given++; progressed = true
    }
    if (!progressed) break
  }
  return counts
}

const span = (count, size) => Math.max(count, 1) * (size + G) + G

function square(n) {
  const c = deal(n, [{ key: 'top' }, { key: 'bottom' }, { key: 'right' }, { key: 'left' }])
  const s = Math.max(span(Math.max(c.top, c.bottom), W), span(Math.max(c.left, c.right), H), 90)
  const seats = [
    ...along(c.top, 0, -D - H / 2, s, -D - H / 2),
    ...along(c.right, s + D + W / 2, 0, s + D + W / 2, s),
    ...along(c.bottom, s, s + D + H / 2, 0, s + D + H / 2),
    ...along(c.left, -D - W / 2, s, -D - W / 2, 0),
  ]
  return { body: `<rect x="0" y="0" width="${s}" height="${s}" rx="6"/>`, label: { x: s / 2, y: s / 2 }, seats, box: [0, 0, s, s] }
}

function round(n) {
  const r = Math.max(60, n * 17)   // just far enough apart that neighbors don't overlap
  const rx = r + D + W / 2, ry = r + D + H / 2
  const seats = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: rx * Math.cos(a), y: ry * Math.sin(a) }
  })
  return { body: `<circle cx="0" cy="0" r="${r}"/>`, label: { x: 0, y: 0 }, seats, box: [-r, -r, r, r] }
}

// Open side at the bottom; residents sit around the outside
function horseshoe(n) {
  const c = deal(n, [{ key: 'top' }, { key: 'right' }, { key: 'left' }])
  const w = Math.max(span(c.top, W), 2 * T + 120)
  const h = Math.max(span(Math.max(c.left, c.right), H), T + 120)
  const seats = [
    ...along(c.top, 0, -D - H / 2, w, -D - H / 2),
    ...along(c.right, w + D + W / 2, 0, w + D + W / 2, h),
    ...along(c.left, -D - W / 2, h, -D - W / 2, 0),
  ]
  const body = `<path d="M0 0H${w}V${h}H${w - T}V${T}H${T}V${h}H0Z"/>`
  return { body, label: { x: w / 2, y: T / 2 }, seats, box: [0, 0, w, h] }
}

// The upright arm on the left with the foot running right along the bottom,
// like the letter L. Seats go on the outside and in the inside corner.
function lRight(n) {
  const c = deal(n, [
    { key: 'top', max: 1 }, { key: 'end', max: 1 },
    { key: 'left' }, { key: 'bottom' }, { key: 'innerV' }, { key: 'innerH' },
  ])
  const notchH = D + H + G   // keeps inside-corner seats clear of each other
  const notchW = D + W + G
  const lh = Math.max(span(c.left, H), T + notchH + span(c.innerV, H) - G, T + 140)
  const lw = Math.max(span(c.bottom, W), T + notchW + span(c.innerH, W) - G, T + 160)
  const seats = [
    ...along(c.top, 0, -D - H / 2, T, -D - H / 2),
    ...along(c.innerV, T + D + W / 2, 0, T + D + W / 2, lh - T - notchH),
    ...along(c.innerH, T + notchW, lh - T - D - H / 2, lw, lh - T - D - H / 2),
    ...along(c.end, lw + D + W / 2, lh - T, lw + D + W / 2, lh),
    ...along(c.bottom, lw, lh + D + H / 2, 0, lh + D + H / 2),
    ...along(c.left, -D - W / 2, lh, -D - W / 2, 0),
  ]
  const body = `<path d="M0 0H${T}V${lh - T}H${lw}V${lh}H0Z"/>`
  return { body, label: { x: T / 2, y: lh - T / 2 }, seats, box: [0, 0, lw, lh] }
}

// L (left) is L (right) flipped side to side. Flipping turns clockwise into
// counter-clockwise, so seat 1 stays put and the rest run in reverse.
function lLeft(n) {
  const g = lRight(n)
  const lw = g.box[2]
  const flip = p => ({ x: lw - p.x, y: p.y })
  const flipped = g.seats.map(flip)
  return {
    body: `<g transform="translate(${lw} 0) scale(-1 1)">${g.body}</g>`,
    label: flip(g.label),
    seats: flipped.length ? [flipped[0], ...flipped.slice(1).reverse()] : [],
    box: g.box,
  }
}

const BUILDERS = { square, round, horseshoe, l_right: lRight, l_left: lLeft }

// Seat centers plus the drawing's bounds, shifted so everything starts at 0,0
export function tableLayout(shape, seatCount) {
  const g = (BUILDERS[shape] || square)(seatCount)
  const xs = [g.box[0], g.box[2], ...g.seats.flatMap(s => [s.x - W / 2, s.x + W / 2])]
  const ys = [g.box[1], g.box[3], ...g.seats.flatMap(s => [s.y - H / 2, s.y + H / 2])]
  const minX = Math.min(...xs) - PAD, minY = Math.min(...ys) - PAD
  const maxX = Math.max(...xs) + PAD, maxY = Math.max(...ys) + PAD
  return {
    width: maxX - minX, height: maxY - minY, dx: -minX, dy: -minY,
    body: g.body, label: g.label, seats: g.seats,
  }
}

// Seat rectangles as percentages of the drawing, for laying controls over it
export function seatBoxes(layout) {
  return layout.seats.map(s => ({
    left: ((s.x + layout.dx - W / 2) / layout.width) * 100,
    top: ((s.y + layout.dy - H / 2) / layout.height) * 100,
    width: (W / layout.width) * 100,
    height: (H / layout.height) * 100,
  }))
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
const clip = (s, max) => (s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s)

// The full name stays in the seat's hover tooltip
function fitName(first, last, max = 13) {
  const full = `${first} ${last}`
  if (full.length <= max) return full
  const short = `${first?.[0] || ''}. ${last}`
  return clip(short, max)
}

// seats: [{ number, first, last, prefs, allergy }] in seat-number order;
// first is empty for an open seat. Colors fall back to print-friendly values
// when the CSS variables aren't set.
export function buildTableSVG(layout, label, seats) {
  const seatSvg = layout.seats.map((p, i) => {
    const s = seats[i] || { number: i + 1 }
    const x = p.x - W / 2, y = p.y - H / 2
    const filled = !!s.first
    const name = filled ? fitName(s.first, s.last) : 'empty'
    const tip = filled ? `${s.first} ${s.last}${s.prefs ? ` — ${s.prefs}` : ''}${s.allergy ? ` — Allergies: ${s.allergy}` : ''}` : `Seat ${s.number}: empty`
    const nameY = s.prefs ? y + 19 : y + H / 2 + 4.5
    return `<g><title>${esc(tip)}</title>
      <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="8" fill="var(--seat-bg,#fff)" stroke="var(--seat-line,#cbd5e1)"/>
      <circle cx="${x + 15}" cy="${y + H / 2}" r="10" fill="var(--seat-num-bg,#134e5e)"/>
      <text x="${x + 15}" y="${y + H / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${s.number}</text>
      <text x="${x + 31}" y="${nameY}" font-size="12.5" font-weight="${filled ? 600 : 400}" font-style="${filled ? 'normal' : 'italic'}" fill="${filled ? 'var(--seat-text,#1e293b)' : 'var(--seat-muted,#94a3b8)'}">${esc(name)}</text>
      ${s.prefs ? `<text x="${x + 31}" y="${y + 35}" font-size="10.5" fill="var(--seat-pref,#0369a1)">${esc(clip(s.prefs, 19))}</text>` : ''}
      ${s.allergy ? `<text x="${x + W - 8}" y="${y + 15}" text-anchor="end" font-size="12" fill="#dc2626">⚠</text>` : ''}
    </g>`
  }).join('')
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif" style="display:block">
    <g transform="translate(${layout.dx} ${layout.dy})">
      <g fill="var(--table-bg,#e2e8f0)" stroke="var(--table-line,#94a3b8)" stroke-width="2">${layout.body}</g>
      <text x="${layout.label.x}" y="${layout.label.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--table-text,#334155)">${esc(clip(label, 14))}</text>
      ${seatSvg}
    </g>
  </svg>`
}
