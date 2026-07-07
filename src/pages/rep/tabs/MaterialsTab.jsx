import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Loader2, ExternalLink, CreditCard, Video, GraduationCap, FileText, Link as LinkIcon } from 'lucide-react'

const TYPE_CONFIG = {
  business_card: { label: 'Business Cards', icon: CreditCard,   color: 'text-brand-600',  bg: 'bg-brand-50' },
  video:         { label: 'Videos',         icon: Video,        color: 'text-purple-600', bg: 'bg-purple-50' },
  training:      { label: 'Training',       icon: GraduationCap, color: 'text-amber-600',  bg: 'bg-amber-50' },
  sales_sheet:   { label: 'Sales Sheets',   icon: FileText,     color: 'text-green-600',  bg: 'bg-green-50' },
  other:         { label: 'Other',          icon: LinkIcon,     color: 'text-slate-500',  bg: 'bg-slate-100' },
}

export default function MaterialsTab() {
  const [resources, setResources] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('rep_resources')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      setResources(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  const grouped = {}
  resources.forEach(r => {
    if (!grouped[r.resource_type]) grouped[r.resource_type] = []
    grouped[r.resource_type].push(r)
  })

  if (resources.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
        <FileText size={32} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">No promo materials yet</p>
        <p className="text-sm mt-1">Your admin hasn't added any marketing resources.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, items]) => {
        const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other
        const Icon = cfg.icon
        return (
          <div key={type}>
            <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
              <Icon size={15} className={cfg.color} /> {cfg.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(r => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-brand-200 hover:shadow-md transition-all group">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                        <span className="truncate">{r.title}</span>
                        <ExternalLink size={11} className="text-slate-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
                      </div>
                      {r.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{r.description}</p>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
