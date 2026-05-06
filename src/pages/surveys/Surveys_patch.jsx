// ─────────────────────────────────────────────────────────────────
// PATCH 1 of 3 — Add profile to useAuth and derive role constants
// ─────────────────────────────────────────────────────────────────
// FIND:
export default function Surveys() {
  const { organization } = useAuth()

// REPLACE WITH:
export default function Surveys() {
  const { profile, organization } = useAuth()

  // Progressive access: supervisor = view + copy link only; manager+ = full
  const canManage     = ['manager','ceo','org_admin','super_admin'].includes(profile?.role)
  const canViewSurveys = ['supervisor','manager','ceo','org_admin','super_admin'].includes(profile?.role)


// ─────────────────────────────────────────────────────────────────
// PATCH 2 of 3 — Gate the "New Survey" header button
// ─────────────────────────────────────────────────────────────────
// FIND:
        <button onClick={() => { setEditSurvey(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> New Survey
        </button>

// REPLACE WITH:
        {canManage && (
          <button onClick={() => { setEditSurvey(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> New Survey
          </button>
        )}


// ─────────────────────────────────────────────────────────────────
// PATCH 3 of 3 — Gate the per-survey action buttons
// ─────────────────────────────────────────────────────────────────
// FIND:
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {s.is_published && <CopyLinkButton token={s.public_token} />}
                    <button onClick={() => setViewResults(s)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                      <BarChart3 size={12} /> Results
                    </button>
                    <button onClick={() => { setEditSurvey(s); setShowModal(true) }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleTogglePublish(s)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${s.is_published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {s.is_published ? <><Eye size={12} /> Unpublish</> : <><Send size={12} /> Publish</>}
                    </button>
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

// REPLACE WITH:
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {/* Supervisor + manager: copy link (published surveys only) */}
                    {s.is_published && <CopyLinkButton token={s.public_token} />}

                    {/* Supervisor + manager: view results */}
                    <button onClick={() => setViewResults(s)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                      <BarChart3 size={12} /> Results
                    </button>

                    {/* Manager+ only: edit, publish/unpublish, delete */}
                    {canManage && (
                      <>
                        <button onClick={() => { setEditSurvey(s); setShowModal(true) }}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => handleTogglePublish(s)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${s.is_published ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                          {s.is_published ? <><Eye size={12} /> Unpublish</> : <><Send size={12} /> Publish</>}
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
