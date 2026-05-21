import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Package, PackagePlus, PackageMinus, DollarSign,
  ClipboardList, Truck, BarChart2, QrCode
} from 'lucide-react'
import SupplyInventory from './SupplyInventory'

const TABS = [
  { key: 'inventory',  label: 'Inventory',        icon: Package,        built: true  },
  { key: 'receive',    label: 'Receive Stock',     icon: PackagePlus,    built: false },
  { key: 'issue',      label: 'Issue / Checkout',  icon: PackageMinus,   built: false },
  { key: 'cash',       label: 'Cash Sales',        icon: DollarSign,     built: false },
  { key: 'pos',        label: 'Purchase Orders',   icon: ClipboardList,  built: false },
  { key: 'vendors',    label: 'Vendors',           icon: Truck,          built: false },
  { key: 'reports',    label: 'Reports',           icon: BarChart2,      built: false },
]

function ComingSoon({ label, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-300" />
      </div>
      <p className="font-display font-semibold text-slate-600 text-lg mb-1">{label}</p>
      <p className="text-sm">This section is coming soon.</p>
    </div>
  )
}

export default function CentralSupply() {
  const { hasModule } = useAuth()
  const [tab, setTab] = useState('inventory')

  if (!hasModule('central_supply')) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">Central Supply</p>
          <p className="text-sm mt-1">This module is not enabled for your organization.</p>
        </div>
      </div>
    )
  }

  const current = TABS.find(t => t.key === tab)

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="px-6 pt-6 pb-0 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-slate-800 text-xl leading-tight">
              Central Supply
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Inventory, ordering, and supply tracking</p>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-0 overflow-x-auto -mb-px scrollbar-hide">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all flex-shrink-0 ${
                  tab === t.key
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'inventory' && <SupplyInventory />}
        {tab !== 'inventory' && current && (
          <ComingSoon label={current.label} icon={current.icon} />
        )}
      </div>
    </div>
  )
}
