import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/supply/${name}`

const NAV = [
  { id: 'inventory', num: '01', label: 'Inventory' },
  { id: 'receive',   num: '02', label: 'Receive Stock' },
  { id: 'issue',     num: '03', label: 'Issue / Checkout' },
  { id: 'cash',      num: '04', label: 'Cash Sales' },
  { id: 'pos',       num: '05', label: 'Purchase Orders' },
  { id: 'vendors',   num: '06', label: 'Vendors' },
  { id: 'reports',   num: '07', label: 'Reports' },
  { id: 'charges',   num: '08', label: 'Resident Charges' },
]

export default function SupplyGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Central Supply"
        dek="A working guide to the supply catalog — receiving stock, issuing it to departments or residents, ringing up cash sales, and ordering more from vendors."
        chips={['For: Supply staff, Supervisors, Managers', 'Where: Sidebar → Central Supply', '7 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="inventory" num="01" title="Inventory"
            dek="The master catalog of every supply item — quantity on hand against par level, cost, and a color-coded status that flags what needs reordering.">
            <Frame src={SHOT('inventory.png')} alt="Central Supply Inventory tab" caption="Status is calculated automatically from Par Level and Reorder Point — it isn't set by hand" />
            <Frame src={SHOT('add-item-modal.png')} alt="Add Supply Item form" caption="Resident-chargeable must be checked for an item to appear in Issue/Checkout's resident billing flow" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Item</b> and fill in Item Name and Category (required), plus barcode/SKU, unit of measure, par level, reorder point, cost, and — if it's sold to employees — a Cash Sale Price.</> },
              { k: 2, text: <>Check <b className="text-slate-900">Resident-chargeable</b> only for items that should show up when issuing supplies against a resident's account.</> },
              { k: 3, text: <>Use the status filters (<b className="text-slate-900">Alert</b>, <b className="text-slate-900">Low</b>, <b className="text-slate-900">In Stock</b>) to see what needs attention — status is computed automatically, never set manually.</> },
              { k: 4, text: <>Click <b className="text-slate-900">Item Labels</b> to print barcode labels for shelves, or <b className="text-slate-900">Resident IDs</b> to print QR ID badges residents' items can be scanned against during Issue/Checkout.</> },
            ]} />
            <Tip>Quantity On Hand on this form is only for entering starting stock — once an item is live, its quantity updates automatically from Receive, Issue, and Cash Sale transactions, not by editing the item directly.</Tip>
          </SectionBlock>

          <SectionBlock id="receive" num="02" title="Receive Stock"
            dek="Log supplies coming into the building, either against an open purchase order or as a manual, ad-hoc receipt.">
            <Frame src={SHOT('receive.png')} alt="Receive Stock tab" caption="Receive from PO pre-fills remaining quantities from that order's line items" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Choose <b className="text-slate-900">Manual Receive</b> for stock that didn't come from a PO, or <b className="text-slate-900">Receive from PO</b> to pull in a submitted order's remaining lines.</> },
              { k: 2, text: <>Search or <b className="text-slate-900">Scan</b> each item's barcode to add it, then confirm quantity (and cost, in Manual mode).</> },
              { k: 3, text: <>Click <b className="text-slate-900">Receive</b> to post — quantity on hand increases immediately, and a receiving PO auto-advances to Partially Received or Received once all its lines are in.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="issue" num="03" title="Issue / Checkout"
            dek="Give supplies out to a department, or charge them against a specific resident for tracking purposes.">
            <Frame src={SHOT('issue.png')} alt="Issue / Checkout search results" caption="Resident mode only shows items marked Resident-chargeable in the catalog" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Toggle between <b className="text-slate-900">Department</b> and <b className="text-slate-900">Resident</b> — Department mode picks from a fixed list (Nursing, Housekeeping, Dietary, and more); Resident mode searches by name/room or a scanned ID badge.</> },
              { k: 2, text: <>Search or scan items to add them, and adjust quantity — a line flags <b className="text-slate-900">Over stock!</b> if you request more than what's on hand, though it won't block the issue.</> },
              { k: 3, text: <>Click <b className="text-slate-900">Issue</b> to post — quantity on hand decreases immediately.</> },
            ]} />
            <Tip>Charging an item to a resident here records it for reporting and audit purposes only — it does not create a billing charge on the resident's account automatically.</Tip>
          </SectionBlock>

          <SectionBlock id="cash" num="04" title="Cash Sales"
            dek="Ring up an over-the-counter sale when an employee buys a supply item for personal use — only items with a Cash Sale Price show up here.">
            <Frame src={SHOT('cash-sales.png')} alt="Cash Sales tab" caption="Buyer is a staff member from Profiles, not a resident" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Search for the <b className="text-slate-900">Buyer (Staff)</b>, then search or scan items into the cart — price defaults to the catalog's Cash Sale Price but can be edited per sale.</> },
              { k: 2, text: <>Enter <b className="text-slate-900">Amount Tendered</b> — Change Due calculates live.</> },
              { k: 3, text: <>Click <b className="text-slate-900">Complete Sale</b> to post it and open a printable receipt.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="pos" num="05" title="Purchase Orders"
            dek="Create and track formal orders placed with vendors, then receive them — in full or partially — as boxes arrive.">
            <Frame src={SHOT('purchase-orders.png')} alt="Purchase Orders tab" caption="Status flows Draft → Submitted → Partially Received → Received" />
            <Frame src={SHOT('new-po-modal.png')} alt="New Purchase Order form" caption="Stock Reorder pulls items straight from the catalog with cost pre-filled" />
            <Frame src={SHOT('po-detail.png')} alt="Purchase Order detail view" caption="Send to vendor at the top; receive lines individually, or use Receive All to close out the whole order" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New PO</b> and choose <b className="text-slate-900">Stock Reorder</b> (pulls items from the catalog) or <b className="text-slate-900">Non-Stock/One-Time</b> (free-text description, no catalog link).</> },
              { k: 2, text: <>Pick a vendor, set order and expected dates, add line items, then <b className="text-slate-900">Save as Draft</b> or <b className="text-slate-900">Submit PO</b> right away.</> },
              { k: 3, text: <>Open a submitted PO and use <b className="text-slate-900">Receive All</b>, or receive lines one at a time as shipments arrive partially.</> },
              { k: 4, text: <>Made a mistake receiving? Use <b className="text-slate-900">Reverse</b> on a line to undo it — this backs the quantity back out of inventory.</> },
            ]} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Approval</h3>
            <p className="text-[15px] text-slate-700 mb-6">An order whose lines plus shipping go over the community's approval limit ($1,000 unless your Org Admin changed it in Org Settings) goes to <b className="text-slate-900">Awaiting Approval</b> when you submit it. So does any order charged to a department that is already over its monthly budget. The Administrator or an Org Admin approves it or sends it back.</p>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Sending it to the vendor</h3>
            <Steps items={[
              { k: 1, text: <>Open a submitted order. The <b className="text-slate-900">Send to vendor</b> panel shows <b className="text-slate-900">Not sent yet</b> until it goes out.</> },
              { k: 2, text: <>Choose <b className="text-slate-900">Download CSV</b> or <b className="text-slate-900">Print / Save PDF</b> to send it yourself (vendor portal, fax), or enter the vendor's order email and click <b className="text-slate-900">Email order</b>. Tick <b className="text-slate-900">Copy me</b> to get a copy.</> },
              { k: 3, text: <>Emailed orders come from ElderLoop with the CSV attached, and the vendor's replies go to you. Every send is listed under the panel, and the order then shows <b className="text-slate-900">Sent</b>.</> },
            ]} />
            <Tip>The order lists each item's <b className="text-slate-900">SKU / Item #</b> as the vendor's item code for the item's Preferred Vendor, so set it to the number that vendor uses.</Tip>
          </SectionBlock>

          <SectionBlock id="vendors" num="06" title="Vendors"
            dek="The supplier directory that feeds the Preferred Vendor field on items and the vendor picker on new purchase orders.">
            <Frame src={SHOT('vendors.png')} alt="Vendors tab" caption="Lead time is informational — shown for reference, not used in date math elsewhere" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Vendor</b> and fill in name (the only required field), contact info, account number, and typical lead time in days.</> },
              { k: 2, text: <>Under <b className="text-slate-900">Ordering</b>, set the vendor's <b className="text-slate-900">Order email</b> (blank uses their main email) and <b className="text-slate-900">How orders are sent</b>: <b className="text-slate-900">Download or print, and send it myself</b>, or <b className="text-slate-900">Email from ElderLoop</b>.</> },
              { k: 3, text: <>Mark a vendor inactive instead of deleting it if you stop ordering from them — inactive vendors hide from pickers but stay attached to past POs.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="reports" num="07" title="Reports"
            dek="Dashboards for stock health, usage patterns, and spending over a selectable 7/30/90-day window — all read-only.">
            <Frame src={SHOT('reports.png')} alt="Reports Overview" caption="Usage by Category and Usage by Department break down what's moving" />
            <Frame src={SHOT('reports-transactions.png')} alt="Reports Transaction History" caption="Every receive, issue, cash sale, and adjustment, filterable by type" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Switch the time window (7d / 30d / 90d) to see Inventory Value, Items Issued, Items Received, and Cash Sales for that period.</> },
              { k: 2, text: <>Check <b className="text-slate-900">Low Stock</b> for a filtered list of everything at or below its reorder point.</> },
              { k: 3, text: <>Use <b className="text-slate-900">Transaction History</b> as an audit trail — every movement is logged with date, item, type, quantity change, and who performed it.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="charges" num="08" title="Resident Charges"
            dek="Chargeable items issued to residents, so each one gets billed. Shown to the Central Supply Manager and Org Admins.">
            <Frame src={SHOT('resident-charges.png')} alt="Resident Charges tab" caption="Billable leakage at the top, then this month's charges that still need billing" />
            <Steps items={[
              { k: 1, text: <>Pick the month. <b className="text-slate-900">Not billed</b> shows what still needs billing; <b className="text-slate-900">All charges</b> shows everything.</> },
              { k: 2, text: <>Bill them in your own billing system (ElderLoop doesn't keep resident accounts). <b className="text-slate-900">Export CSV</b> gives you the list.</> },
              { k: 3, text: <>Tick what you billed, optionally add an invoice or batch number, and click <b className="text-slate-900">Mark billed</b>.</> },
            ]} />
            <p className="text-[15px] text-slate-700 mb-6"><b className="text-slate-900">Billable leakage</b> at the top shows chargeable items that were issued but never charged or not yet billed. Lines marked <b className="text-slate-900">No price</b> have no sale price; set one in Inventory. The <a href="/training/budgets" className="text-brand-700 font-semibold hover:underline">Budgets</a> guide explains how supply spending counts toward budgets.</p>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Add a new supply item', 'Inventory → Add Item'],
            ['Print shelf labels or resident ID badges', 'Inventory → Item Labels / Resident IDs'],
            ['Log stock coming in', 'Receive Stock'],
            ['Give supplies to a department or resident', 'Issue / Checkout'],
            ['Ring up an employee purchase', 'Cash Sales'],
            ['Order more from a vendor', 'Purchase Orders → New PO'],
            ['See what needs reordering', 'Reports → Low Stock'],
            ['Send an order to the vendor', 'Purchase Orders → open the order → Send to vendor'],
            ['Bill resident supply charges', 'Resident Charges → Mark billed'],
          ]} />

          <GuideFooter label="Central Supply Module" />
        </main>
      </div>
    </div>
  )
}
