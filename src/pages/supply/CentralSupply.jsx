import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Package, PackagePlus, PackageMinus, DollarSign,
  ClipboardList, Truck, BarChart2
} from 'lucide-react'
import SupplyInventory    from './SupplyInventory'
import SupplyReceive      from './SupplyReceive'
import SupplyIssue        from './SupplyIssue'
import SupplyCashSales    from './SupplyCashSales'
import SupplyPurchaseOrders from './SupplyPurchaseOrders'
import SupplyVendors      from './SupplyVendors'
import SupplyReports      from './SupplyReports'

const ALL_TABS = [
  { key: 'inventory', label: 'Inventory',       icon: Package,       component: SupplyInventory,       editOnly: false },
  { key: 'receive',   label: 'Receive Stock',    icon: PackagePlus,   component: SupplyReceive,         editOnly: true },
  { key: 'issue',     label: 'Issue / Checkout', icon: PackageMinus,  component: SupplyIssue,           editOnly: true },
  { key: 'cash',      label: 'Cash Sales',       icon: DollarSign,    component: SupplyCashSales,       editOnly: true },
  { key: 'pos',       label: 'Purchase Orders',  icon: ClipboardList, component: SupplyPurchaseOrders,  editOnly: false },
  { key: 'vendors',   label: 'Vendors',          icon: Truck,         component: SupplyVendors,         editOnly: false },
  { key: 'reports',   label: 'Reports',          icon: BarChart2,     component: SupplyReports,         editOnly: false },
]

export default function CentralSupply() {
  const { hasModule, canEdit } = useAuth()
  const [tab, setTab] = useState('inventory')

  // Supply staff/supervisors/managers get edit by default for central_supply;
  // org admins can grant/restrict edit access per-user via Admin Panel > Module Access.
  // View-only users see Inventory, Purchase Orders, Vendors, and Reports in read-only
  // mode; Receive/Issue/Cash Sales are pure write-workflows and are hidden entirely
  // for view-only users.
  const canEditSupply = canEdit('central_supply', ['supervisor','manager'])

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

  const TABS = ALL_TABS.filter(t => !t.editOnly || canEditSupply)
  // If the current tab is no longer visible (e.g. permission downgraded), fall back to inventory
  const current = TABS.find(t => t.key === tab) || TABS[0]
  const ActiveComponent = current?.component

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="px-6 pt-6 pb-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-xl leading-tight">Central Supply</h1>
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
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}>
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto">
        {ActiveComponent && <ActiveComponent canEdit={canEditSupply} />}
      </div>
    </div>
  )
}
