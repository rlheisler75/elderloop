// How a resident's home reads on screen.
// Independent Living: `room` is the house or apartment number and `unit` the
// street or building, so "36 Bethany Drive" or "Apt 101-A · Northwoods
// A-Building" (no "Room" in front). Everyone else: "Room 103-1", where the
// part after the dash is the bed, the same room-bed form PointClickCare uses.
// Pass { withUnit: true } to add the hall/unit for non-IL residents.
export function residentPlace(r, { withUnit = false } = {}) {
  if (!r) return ''
  const room = String(r.room ?? '').trim()
  const unit = String(r.unit ?? '').trim()
  if (r.care_level === 'independent') {
    if (!room) return unit
    if (!unit) return room
    return /building/i.test(unit) ? `Apt ${room} · ${unit}` : `${room} ${unit}`
  }
  if (!room) return withUnit ? unit : ''
  return withUnit && unit ? `Room ${room} · ${unit}` : `Room ${room}`
}

// Room and bed are kept together in `room` as "103-1". These split and join
// them for the resident form (beds are 1 or 2; Independent Living has none).
export function splitRoomBed(room, careLevel) {
  const m = careLevel !== 'independent' && String(room ?? '').match(/^(.*\d)-([12])$/)
  return m ? { room: m[1], bed: m[2] } : { room: room ?? '', bed: '' }
}

export function joinRoomBed(room, bed, careLevel) {
  const base = String(room ?? '').trim()
  return base && bed && careLevel !== 'independent' ? `${base}-${bed}` : base
}
