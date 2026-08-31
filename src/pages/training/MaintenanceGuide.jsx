import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/maintenance/${name}`

const NAV = [
  { id: 'workorders', num: '01', label: 'Work Orders' },
  { id: 'assets',     num: '02', label: 'Assets' },
  { id: 'pm',         num: '03', label: 'Preventive Maintenance' },
  { id: 'lifesafety', num: '04', label: 'Life Safety' },
  { id: 'reports',    num: '05', label: 'Reports' },
  { id: 'settings',   num: '06', label: 'Settings' },
]

export default function MaintenanceGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Maintenance"
        dek="A working guide to work orders, the asset registry, preventive maintenance, and Life Safety compliance — from a resident-reported leak to a surveyor-ready inspection report."
        chips={['For: Maintenance staff, Supervisors, Managers', 'Where: Sidebar → Maintenance', '7 tabs']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="workorders" num="01" title="Work Orders"
            dek="Every maintenance ticket — filed by staff, or submitted directly by a resident or family member — tracked from open to closed, with SLA targets, photos, and a full activity timeline.">
            <Frame src={SHOT('work-orders-list.png')} alt="Work Orders list" caption="Work order list, with overdue alert banner and live stats" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Work Order</b> — use <b className="text-slate-900">Pick a template...</b> for a common issue (leaky faucet, HVAC not heating, broken window, etc.) to auto-fill category, priority, and description, or write your own.</> },
              { k: 2, text: 'Set the location, link a resident or asset if relevant, and attach a photo — you can attach one before the ticket even exists yet.' },
              { k: 3, text: <>A ticket auto-assigns to a staff member if an <b className="text-slate-900">Auto-Assignment</b> rule exists for its category (set up in Settings) — otherwise it's Unassigned until someone picks it up.</> },
              { k: 4, text: <>Open any ticket to use the <b className="text-slate-900">Quick Actions</b> strip — Start Working, Put On Hold, Awaiting Vendor, Mark Complete, Cancel Ticket — instead of manually editing status.</> },
            ]} />
            <Frame src={SHOT('wo-detail.png')} alt="Work order detail view" caption="An existing ticket, showing linked asset, activity timeline, and comments" />
            <Tip>Every ticket's priority carries an SLA response/completion target (set in Settings). A ticket that breaches its target shows a red SLA-breach warning right in the detail view — no need to calculate it yourself.</Tip>
          </SectionBlock>

          <SectionBlock id="assets" num="02" title="Assets"
            dek="A registry of the equipment behind your building — HVAC units, generators, lifts, appliances — with service history and next-due dates.">
            <ShotsPair>
              <Frame src={SHOT('assets-registry.png')} alt="Asset Registry" caption="Asset Registry, sorted with overdue service in red" />
              <Frame src={SHOT('add-asset-modal.png')} alt="Add Asset form" caption="Adding an asset" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Asset</b> and fill in name, category, location, manufacturer/model/serial, and service dates.</> },
              { k: 2, text: <>Set <b className="text-slate-900">Next Service Due</b> so the asset shows up on the stat tiles once it's overdue or due within 30 days.</> },
              { k: 3, text: 'Link a work order or PM schedule to an asset from either of those screens — the asset’s card will then reflect real service history over time.' },
            ]} />
          </SectionBlock>

          <SectionBlock id="pm" num="03" title="Preventive Maintenance"
            dek="Recurring maintenance tasks — weekly generator tests, monthly filter changes, quarterly inspections — that generate a real work order for you with one click.">
            <ShotsPair>
              <Frame src={SHOT('pm-schedules-list.png')} alt="Preventive Maintenance schedules list" caption="Schedules, with Overdue and Due Soon badges" />
              <Frame src={SHOT('new-pm-schedule-modal.png')} alt="New PM Schedule form" caption="Setting up a recurring schedule" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Schedule</b>, name the task, optionally link an asset, and set the frequency — Weekly, Monthly, Quarterly, Annual, or Custom (every N days).</> },
              { k: 2, text: <>When a schedule comes due, click <b className="text-slate-900">Generate WO</b> — it creates a real work order (titled with a <code>[PM]</code> prefix) with the category, asset, assignee, and due date already filled in.</> },
              { k: 3, text: 'The schedule automatically advances to its next due date the moment you generate a work order from it — you never have to reschedule it by hand.' },
            ]} />
          </SectionBlock>

          <SectionBlock id="lifesafety" num="04" title="Life Safety"
            dek="Regulatory inspection tracking — fire safety, sprinklers, generators, elevators, and more — mapped to your state's actual code references, with a one-click report for surveyors.">
            <Frame src={SHOT('life-safety-overview.png')} alt="Life Safety compliance overview" caption="Compliance state, stat tiles, and inspection category cards with real code references" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Set your <b className="text-slate-900">Compliance State</b> once — every category then shows the regulatory authority and code reference that actually applies to you (NFPA, state health code, CMS Conditions of Participation, etc.).</> },
              { k: 2, text: <>Click <b className="text-slate-900">Inspect</b> on a category to open the checklist — mark each item Pass, Attn, or Fail; the overall result (Pass / Pass w/ Conditions / Fail) calculates itself from what you check.</> },
              { k: 3, text: <>Use <b className="text-slate-900">Add Custom Inspection</b> for anything not already listed — grease trap cleaning, pool safety, or a local requirement specific to your community.</> },
              { k: 4, text: <>Click <b className="text-slate-900">History</b> on any category to review past inspection records and their notes.</> },
            ]} />
            <Frame src={SHOT('conduct-inspection-modal.png')} alt="Conduct Inspection checklist" caption="Live-scoring checklist — the overall result updates as you go" />
            <Frame src={SHOT('print-surveyor-generated.png')} alt="Generated surveyor compliance report" caption="Print for Surveyor — a full report for any date range, ready to print or save as PDF" />
            <Tip>The Print for Surveyor report isn't just a list — it includes your state's regulatory reference text, a pass/fail summary, and every category's history for the date range, including categories with no records at all. It's built to hand directly to an inspector.</Tip>
          </SectionBlock>

          <SectionBlock id="reports" num="05" title="Reports"
            dek="Response and completion time by priority, workload by staff member, and category/source breakdowns — for a date range you pick — with CSV and print export.">
            <ShotsPair>
              <Frame src={SHOT('reports-overview.png')} alt="Maintenance Reports overview" caption="Response & Completion tab, with the date-range presets and summary strip" />
              <Frame src={SHOT('reports-breakdown.png')} alt="Category and Source breakdown" caption="Category & Source tab — where tickets come from and what they're about" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Pick a date range with the presets (Last 7/30/90 Days, Last Year) or <b className="text-slate-900">Custom</b> — every report and the summary strip re-run against that range.</> },
              { k: 2, text: <>Switch between the three sub-tabs: <b className="text-slate-900">Response &amp; Completion</b> (SLA performance by priority), <b className="text-slate-900">Work Load by Staff</b> (open/closed/overdue per person), and <b className="text-slate-900">Category &amp; Source</b> (what kind of work, and who's requesting it).</> },
              { k: 3, text: <>Click <b className="text-slate-900">Export CSV</b> for the full underlying ticket list (not just the summary), or <b className="text-slate-900">Print Report</b> for a formatted one-page summary of all three views — same print-to-PDF flow as the Life Safety surveyor report.</> },
            ]} />
            <Tip>Response and completion times are only as accurate as the timestamps behind them — a ticket only counts toward "Avg Response" once someone's actually assigned to it, and toward "Avg Completion" once it's marked Closed. An assigned-but-idle ticket won't show a response time until you act on it.</Tip>
          </SectionBlock>

          <SectionBlock id="settings" num="06" title="Settings"
            dek="Configure SLA response targets, automatic ticket assignment by category, and the location hierarchy used throughout the module.">
            <ShotsPair>
              <Frame src={SHOT('settings-sla-rules.png')} alt="SLA Rules settings" caption="SLA Rules — response and completion targets per priority" />
              <Frame src={SHOT('settings-auto-assign.png')} alt="Auto-Assignment settings" caption="Auto-Assignment — one default assignee per category" />
            </ShotsPair>
            <Frame src={SHOT('settings-locations.png')} alt="Location Manager" caption="Locations — the hierarchy that powers the location picker everywhere else in the module" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <><b className="text-slate-900">SLA Rules:</b> set response and completion hour targets for Urgent, High, Normal, and Low priority — these drive the SLA banners and breach warnings on every ticket.</> },
              { k: 2, text: <><b className="text-slate-900">Auto-Assignment:</b> pick a default staff member per category so new tickets route themselves — this can always be overridden on an individual ticket.</> },
              { k: 3, text: <><b className="text-slate-900">Locations:</b> build out your buildings, halls, floors, and rooms once — click the icons on hover to add a child location, edit, or remove one.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['File a maintenance issue', 'Work Orders → New Work Order'],
            ['Update a ticket’s status', 'Open the ticket → Quick Actions'],
            ['Check equipment service history', 'Assets → click a card'],
            ['Run a recurring task (filter change, generator test)', 'Preventive Maintenance → Generate WO'],
            ['Conduct a fire/life-safety inspection', 'Life Safety → Inspect'],
            ['Prepare for a state survey', 'Life Safety → Print for Surveyor'],
            ['See SLA performance or staff workload', 'Reports'],
            ['Export ticket data to Excel', 'Reports → Export CSV'],
            ['Change who tickets auto-assign to', 'Settings → Auto-Assignment'],
            ['Add a building, hall, or room', 'Settings → Locations'],
          ]} />

          <GuideFooter label="Maintenance Module" />
        </main>
      </div>
    </div>
  )
}
