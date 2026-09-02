// Dining room seating charts — a standing table/seat assignment per meal
// period (not per calendar date), so staff always know where a resident
// sits for breakfast vs. lunch vs. dinner without re-building it daily.
// Multiple dining rooms are supported (e.g. Main Dining Room, Memory Care).
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Armchair, Plus, X, Edit2, Trash2, Printer, ChevronDown, ChevronUp, Home
} from 'lucide-react'

const MEAL_PERIODS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'am_snack',  label: 'AM Snack' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'pm_snack',  label: 'PM Snack' },
  { key: 'dinner',    label: 'Dinner' },
]

export default function SeatingCharts({ orgId, dietaryProfiles, canManage }) {
  const printRef = useRef()
  const [rooms, setRooms]           = useState([])
  const [tables, setTables]         = useState([])
  const [assignments, setAssignments] = useState([])
  const [allResidents, setAllResidents] = useState([])
  const [loading, setLoading]       = useState(true)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [period, setPeriod]         = useState('lunch')
  const [showManage, setShowManage] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newTableRoom, setNewTableRoom] = useState(null)
  const [newTableLabel, setNewTableLabel] = useState('')
  const [newTableSeats, setNewTableSeats] = useState(4)
  const [error, setError]           = useState('')

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [roomsRes, tablesRes, assignRes, residentsRes] = await Promise.all([
      supabase.from('dining_rooms').select('*').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('dining_tables').select('*').eq('organization_id', orgId).order('sort_order'),
      supabase.from('dining_seat_assignments').select('*').eq('organization_id', orgId),
      supabase.from('residents').select('id, first_name, last_name, room').eq('organization_id', orgId).eq('is_active', true).order('last_name'),
    ])
    setRooms(roomsRes.data || [])
    setTables(tablesRes.data || [])
    setAssignments(assignRes.data || [])
    setAllResidents(residentsRes.data || [])
    setSelectedRoomId(prev => prev || roomsRes.data?.[0]?.id || null)
    setLoading(false)
  }

  const dietLookup = new Map((dietaryProfiles || []).map(p => [p.resident_id, p]))
  const residentLookup = new Map(allResidents.map(r => [r.id, r]))

  // ── Dining room + table management ──────────────────────────
  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return
    const { data } = await supabase.from('dining_rooms')
      .insert({ organization_id: orgId, name: newRoomName.trim() }).select().single()
    setNewRoomName('')
    if (data) { setRooms(r => [...r, data].sort((a, b) => a.name.localeCompare(b.name))); setSelectedRoomId(data.id) }
  }

  const handleDeleteRoom = async (id) => {
    if (!confirm('Delete this dining room and all its tables/seat assignments?')) return
    await supabase.from('dining_rooms').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  const handleAddTable = async (roomId) => {
    if (!newTableLabel.trim()) return
    const roomTables = tables.filter(t => t.dining_room_id === roomId)
    const { data } = await supabase.from('dining_tables').insert({
      organization_id: orgId, dining_room_id: roomId, label: newTableLabel.trim(),
      seat_count: Number(newTableSeats) || 4, sort_order: roomTables.length,
    }).select().single()
    setNewTableLabel(''); setNewTableSeats(4); setNewTableRoom(null)
    if (data) setTables(t => [...t, data])
  }

  const handleDeleteTable = async (id) => {
    if (!confirm('Delete this table and its seat assignments?')) return
    await supabase.from('dining_tables').delete().eq('id', id)
    fetchAll()
  }

  // ── Seat assignment ────────────────────────────────────────
  const getAssignment = (tableId, seatNumber) =>
    assignments.find(a => a.dining_table_id === tableId && a.seat_number === seatNumber && a.meal_period === period)

  const handleAssignSeat = async (tableId, seatNumber, residentId) => {
    setError('')
    const existing = getAssignment(tableId, seatNumber)
    if (!residentId) {
      if (existing) {
        await supabase.from('dining_seat_assignments').delete().eq('id', existing.id)
        setAssignments(a => a.filter(x => x.id !== existing.id))
      }
      return
    }
    const payload = { organization_id: orgId, dining_table_id: tableId, seat_number: seatNumber, meal_period: period, resident_id: residentId }
    if (existing) {
      const { error: err } = await supabase.from('dining_seat_assignments').update(payload).eq('id', existing.id)
      if (err) { setError('Could not update seat.'); return }
      setAssignments(a => a.map(x => x.id === existing.id ? { ...x, resident_id: residentId } : x))
    } else {
      const { data, error: err } = await supabase.from('dining_seat_assignments').insert(payload).select().single()
      if (err) {
        setError(err.code === '23505'
          ? 'That resident is already seated elsewhere for this meal — remove them from that seat first.'
          : 'Could not assign seat.')
        return
      }
      setAssignments(a => [...a, data])
    }
  }

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const roomName = rooms.find(r => r.id === selectedRoomId)?.name || 'Dining Room'
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Seating Chart - ${roomName} - ${MEAL_PERIODS.find(p => p.key === period)?.label}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 16px; }
        .tables { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .table-card { border: 1px solid #ddd; border-radius: 8px; padding: 10px; break-inside: avoid; }
        .table-label { font-weight: bold; font-size: 13px; margin-bottom: 6px; }
        .seat { font-size: 12px; padding: 2px 0; border-bottom: 1px solid #eee; }
        .empty { color: #aaa; font-style: italic; }
        select { display: none; }
        .print-only { display: inline !important; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h1>${roomName}</h1>
        <div class="sub">${MEAL_PERIODS.find(p => p.key === period)?.label} Seating Chart</div>
        <div class="tables">${content}</div>
      </body></html>`)
    win.document.close()
    win.print()
  }

  const roomTables = tables.filter(t => t.dining_room_id === selectedRoomId).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-5">
      {/* Dining Rooms & Tables management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <button onClick={() => setShowManage(s => !s)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Dining Rooms & Tables</h3>
            <span className="text-xs text-slate-400">({rooms.length})</span>
          </div>
          {showManage ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showManage && (
          <div className="mt-4 space-y-4">
            {canManage && (
              <div className="flex gap-2">
                <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="New dining room name (e.g. Memory Care Dining Room)"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <button onClick={handleAddRoom} disabled={!newRoomName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
                  <Plus size={14} /> Add Room
                </button>
              </div>
            )}
            {rooms.length === 0 ? (
              <div className="text-slate-400 text-sm py-2">No dining rooms yet — add one to start building a seating chart.</div>
            ) : rooms.map(room => (
              <div key={room.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{room.name}</div>
                  {canManage && (
                    <button onClick={() => handleDeleteRoom(room.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tables.filter(t => t.dining_room_id === room.id).map(t => (
                    <div key={t.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                      {t.label} · {t.seat_count} seats
                      {canManage && <button onClick={() => handleDeleteTable(t.id)} className="text-slate-400 hover:text-red-500 ml-1"><X size={11} /></button>}
                    </div>
                  ))}
                </div>
                {canManage && (
                  newTableRoom === room.id ? (
                    <div className="flex gap-2 items-center">
                      <input value={newTableLabel} onChange={e => setNewTableLabel(e.target.value)} placeholder="Table label (e.g. Table 1)"
                        className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <input type="number" min="1" max="20" value={newTableSeats} onChange={e => setNewTableSeats(e.target.value)} placeholder="Seats"
                        className="w-16 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <button onClick={() => handleAddTable(room.id)} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg">Add</button>
                      <button onClick={() => setNewTableRoom(null)} className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setNewTableRoom(room.id); setNewTableLabel(''); setNewTableSeats(4) }}
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Plus size={11} /> Add table</button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seating chart grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Armchair size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Seating Chart</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={selectedRoomId || ''} onChange={e => setSelectedRoomId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {MEAL_PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${period === p.key ? 'bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={handlePrint} disabled={!roomTables.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-xs">{error}</div>
        )}

        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="text-slate-400 text-sm py-6 text-center">Add a dining room above to start building a seating chart.</div>
        ) : roomTables.length === 0 ? (
          <div className="text-slate-400 text-sm py-6 text-center">No tables in this room yet — add one above.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div ref={printRef} className="contents">
              {roomTables.map(table => (
                <div key={table.id} className="table-card border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                  <div className="table-label font-medium text-slate-800 dark:text-slate-100 text-sm mb-2">{table.label}</div>
                  {Array.from({ length: table.seat_count }, (_, i) => i + 1).map(seatNum => {
                    const assignment = getAssignment(table.id, seatNum)
                    const resident = assignment ? residentLookup.get(assignment.resident_id) : null
                    const profile = assignment ? dietLookup.get(assignment.resident_id) : null
                    return (
                      <div key={seatNum} className="seat flex items-center gap-2 py-1 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <span className="text-xs text-slate-400 w-4 flex-shrink-0">{seatNum}</span>
                        {canManage && (
                          <select value={assignment?.resident_id || ''} onChange={e => handleAssignSeat(table.id, seatNum, e.target.value)}
                            className="flex-1 px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="">— empty —</option>
                            {allResidents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} {r.room ? `(Rm ${r.room})` : ''}</option>)}
                          </select>
                        )}
                        {/* Plain-text resident name: hidden on-page when the select
                            above already shows it, but the print window strips
                            <select> entirely and force-shows this via CSS instead. */}
                        <span className={`flex-1 text-xs ${canManage ? 'print-only hidden' : ''} ${resident ? 'text-slate-700 dark:text-slate-300' : 'empty text-slate-400 italic'}`}>
                          {resident ? `${resident.first_name} ${resident.last_name}` : 'empty'}
                        </span>
                        {profile?.allergens?.length > 0 && (
                          <span className="text-red-500 flex-shrink-0" title={`Allergies: ${profile.allergens.join(', ')}`}>⚠</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
