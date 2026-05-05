// ── PATCH for WorkOrders.jsx ──────────────────────────────────
// In the WORow component, find the title/category line and add source badge.
//
// FIND this block inside WORow:
//
//   <div className="font-medium text-slate-800 text-sm">{wo.title}</div>
//   <div className="text-xs text-slate-400 mt-0.5">{cat?.label} {wo.location_detail ? `· ${wo.location_detail}` : ''}</div>
//
// REPLACE WITH:
//
//   <div className="flex items-center gap-2">
//     <span className="font-medium text-slate-800 text-sm">{wo.title}</span>
//     {wo.source === 'family' && (
//       <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full flex-shrink-0">
//         👨‍👩‍👧 Family
//       </span>
//     )}
//     {wo.source === 'resident' && (
//       <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex-shrink-0">
//         🏠 Resident
//       </span>
//     )}
//   </div>
//   <div className="text-xs text-slate-400 mt-0.5">
//     {cat?.label} {wo.location_detail ? `· ${wo.location_detail}` : ''}
//     {wo.submitted_by_name && wo.source !== 'staff' && (
//       <span className="ml-1">· Submitted by {wo.submitted_by_name}</span>
//     )}
//   </div>
//
// ─────────────────────────────────────────────────────────────
// Also in the WOModal, in the detail view (non-editing mode),
// add this after the title display to show who submitted it:
//
// FIND (inside the modal detail section, after title):
//   : <p className="text-slate-800 font-medium">{wo.title}</p>}
//
// ADD AFTER (as a new block):
//   {wo.source && wo.source !== 'staff' && (
//     <div className="mt-2 flex items-center gap-2 text-xs">
//       <span className={`px-2 py-0.5 rounded-full font-semibold ${
//         wo.source === 'family'   ? 'bg-purple-100 text-purple-700' :
//         wo.source === 'resident' ? 'bg-green-100 text-green-700'   : ''
//       }`}>
//         {wo.source === 'family' ? '👨‍👩‍👧 Submitted by Family' : '🏠 Submitted by Resident'}
//       </span>
//       {wo.submitted_by_name && <span className="text-slate-400">{wo.submitted_by_name}</span>}
//     </div>
//   )}
