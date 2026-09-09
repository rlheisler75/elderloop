import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, Edit2, Trash2, ChevronRight, ChevronDown, Tag, Lock } from 'lucide-react'

const slugify = (label) => label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now()

// ── Add/Edit Modal ────────────────────────────────────────────
function CategoryModal({ cat, parentId, parentLabel, orgId, onClose, onSaved }) {
  const isNew = !cat
  const [label, setLabel] = useState(cat?.label || '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async () => {
    if (!label.trim()) { setError('Name is required'); return }
    setSaving(true)
    const { error: err } = isNew
      ? await supabase.from('wo_categories').insert({
          organization_id: orgId,
          parent_id: parentId || null,
          key: slugify(label),
          label: label.trim(),
          is_custom: true,
          sort_order: 999,
        })
      : await supabase.from('wo_categories').update({ label: label.trim() }).eq('id', cat.id)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">
            {isNew ? (parentId ? `Add Subcategory to ${parentLabel}` : 'Add Category') : 'Edit'}
          </h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {parentId ? 'Subcategory Name *' : 'Category Name *'}
            </label>
            <input value={label} onChange={e => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100"
              placeholder="e.g. Roofing, Water Heater..." autoFocus />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Add' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category Row ──────────────────────────────────────────────
function CategoryRow({ cat, children, canManage, onEdit, onAddChild, onDelete }) {
  const [open, setOpen] = useState(false)
  const [confirmDel, setConfirm] = useState(false)
  const hasChildren = children.length > 0
  const isGlobal = !cat.organization_id

  return (
    <>
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 group transition-colors">
        {hasChildren ? (
          <button onClick={() => setOpen(o => !o)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <Tag size={14} className="flex-shrink-0 text-brand-600" />
        <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{cat.label}</span>

        {isGlobal ? (
          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full font-medium flex items-center gap-1">
            <Lock size={10} /> Starter
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 rounded-full font-medium">Custom</span>
        )}

        {canManage && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onAddChild(cat)}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-brand-600 rounded transition-colors" title="Add subcategory">
              <Plus size={13} />
            </button>
            {!isGlobal && (
              <>
                <button onClick={() => onEdit(cat)}
                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-brand-600 rounded transition-colors" title="Edit">
                  <Edit2 size={13} />
                </button>
                {confirmDel ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => onDelete(cat)} className="px-2 py-0.5 bg-red-600 text-white text-xs rounded font-medium">Delete</button>
                    <button onClick={() => setConfirm(false)} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirm(true)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 rounded transition-colors" title="Delete">
                    <Trash2 size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {open && hasChildren && (
        <div style={{ paddingLeft: '24px' }}>
          {children.map(child => (
            <div key={child.id} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 group transition-colors">
              <span className="w-4 flex-shrink-0" />
              <Tag size={12} className="flex-shrink-0 text-slate-400" />
              <span className="flex-1 text-sm text-slate-600 dark:text-slate-400">{child.label}</span>
              {!child.organization_id ? (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full font-medium flex items-center gap-1">
                  <Lock size={10} /> Starter
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 rounded-full font-medium">Custom</span>
              )}
              {canManage && child.organization_id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(child)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-brand-600 rounded transition-colors" title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => onDelete(child)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 rounded transition-colors" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Main CategoryManager ────────────────────────────────────────
export default function CategoryManager({ orgId }) {
  const { profile, hasDepartmentAccess } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null) // null | { cat, parentId, parentLabel }

  const canManage = ['org_admin', 'ceo', 'super_admin'].includes(profile?.role) || hasDepartmentAccess('maintenance', 'manager')

  useEffect(() => { if (orgId) fetchCategories() }, [orgId])

  async function fetchCategories() {
    const { data } = await supabase
      .from('wo_categories').select('*')
      .or(`organization_id.is.null,organization_id.eq.${orgId}`)
      .eq('is_active', true)
      .order('sort_order')
    setCategories(data || [])
    setLoading(false)
  }

  async function handleDelete(cat) {
    await supabase.from('wo_categories').update({ is_active: false }).eq('id', cat.id)
    fetchCategories()
  }

  const topLevel = useMemo(() => categories.filter(c => !c.parent_id), [categories])
  const childrenOf = (id) => categories.filter(c => c.parent_id === id)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Tag size={16} className="text-brand-600" /> Work Order Categories
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            The starter set is shared and can't be edited. Add your own categories and subcategories below — they only apply to your organization.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setModal({ cat: null, parentId: null, parentLabel: null })}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading categories...</div>
        ) : (
          <div className="p-2">
            {topLevel.map(cat => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                children={childrenOf(cat.id)}
                canManage={canManage}
                onEdit={c => setModal({ cat: c, parentId: null, parentLabel: null })}
                onAddChild={parent => setModal({ cat: null, parentId: parent.id, parentLabel: parent.label })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {!canManage && (
        <p className="text-xs text-slate-400 mt-3">Only an Org Admin or a Maintenance Manager can add or edit categories.</p>
      )}

      {modal !== null && (
        <CategoryModal
          cat={modal.cat}
          parentId={modal.parentId}
          parentLabel={modal.parentLabel}
          orgId={orgId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchCategories() }}
        />
      )}
    </div>
  )
}
