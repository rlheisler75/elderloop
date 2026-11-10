import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/maintenance/${name}`

const NAV = [
  { id: 'workorders', num: '01', label: 'Work Orders' },
  { id: 'assets',     num: '02', label: 'Assets' },
  { id: 'pm',         num: '03', label: 'Preventive Maintenance' },
  { id: 'walkthroughs', num: '03b', label: 'Unit Walkthroughs' },
  { id: 'lifesafety', num: '04', label: 'Life Safety' },
  { id: 'reports',    num: '05', label: 'Reports' },
  { id: 'costs',    num: '05b', label: 'Costs' },
  { id: 'settings',   num: '06', label: 'Settings' },
  { id: 'ai',         num: '07', label: 'AI Assist' },
]

export default function MaintenanceGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Maintenance"
        dek="A working guide to work orders, the asset registry, preventive maintenance, and Life Safety compliance — from a resident-reported leak to a surveyor-ready inspection report."
        chips={['For: Maintenance staff, Supervisors, Managers', 'Where: Sidebar → Maintenance', '7 tabs', 'AI Assist available']}
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
              { k: 2, text: 'Set the location, link a resident or asset if relevant, and attach a photo — you can attach one before the ticket even exists yet. Picking a resident fills in where they live; picking a location fills in (or offers) the residents who live there.' },
              { k: 3, text: <>A ticket auto-assigns to a staff member if an <b className="text-slate-900">Auto-Assignment</b> rule exists for its category (set up in Settings) — otherwise it's Unassigned until someone picks it up.</> },
              { k: 4, text: <>Open any ticket to use the <b className="text-slate-900">Quick Actions</b> strip — Start Working, Put On Hold, Awaiting Vendor, Mark Complete, Cancel Ticket — instead of manually editing status.</> },
              { k: 5, text: <>Job needs more than one person? A Supervisor or Manager can add <b className="text-slate-900">Additional Techs</b> on the ticket. <b className="text-slate-900">Assigned To</b> stays the lead (reports, SLA and hand-off follow the lead); the extra techs see the job under My jobs. The list shows <b className="text-slate-900">+1</b>, +2… next to the lead's name.</> },
            ]} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Finding jobs</h3>
            <Steps items={[
              { k: 1, text: <>The tabs across the top pick which jobs you see: <b className="text-slate-900">My jobs</b> (assigned to you, including as an additional tech), <b className="text-slate-900">My incomplete work</b>, <b className="text-slate-900">Open queue</b> (nobody assigned yet), and <b className="text-slate-900">All jobs</b>. Supervisors and Managers start on All jobs; everyone else starts on My jobs.</> },
              { k: 2, text: <>Use the Status filter for <b className="text-slate-900">Incomplete</b>, <b className="text-slate-900">Overdue</b> (past due or past its SLA), or <b className="text-slate-900">Closed</b>, which lists the newest completed jobs first with a Completed column. The <b className="text-slate-900">Assigned to</b> filter pulls every job for one person. The overdue banner's <b className="text-slate-900">View all</b> shows every overdue job.</> },
              { k: 3, text: <>Search looks through the whole history, not just open jobs: title, description, location, who asked, and WO number. Locations show the address first (for example "3190 Circle Lane" or "101-B Northwoods B-Building"); hover to see the full path.</> },
              { k: 4, text: <><b className="text-slate-900">Print List</b> prints exactly what's on screen, filters and search included, one line per job. Filter to one tech's incomplete work and print it for their day.</> },
            ]} />
            <Tip>Work order numbers count up per community. A community that came from Work Hub picks up where its old numbers left off.</Tip>
            <Frame src={SHOT('wo-detail.png')} alt="Work order detail view" caption="An existing ticket, showing linked asset, activity timeline, and comments" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Closing out a job</h3>
            <Frame narrow src={SHOT('close-out.png')} alt="Close this job form" caption="Mark Complete asks for the work type, labor hours, parts bought, and vendor cost" />
            <p className="text-[15px] text-slate-700 mb-6"><b className="text-slate-900">Mark Complete</b> opens <b className="text-slate-900">Close this job</b>. Pick Planned, Routine repair, or Emergency, enter labor hours, parts bought for this job, and any vendor cost, then click <b className="text-slate-900">Close job</b>. Parts taken from Central Supply stock are already counted when issued, so leave them out. These numbers feed the Costs tab.</p>
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
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Asset labels</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Print Labels</b> to print QR labels for any or all assets, or <b className="text-slate-900">Label</b> on one asset’s card to print just that one. Pick the label size (2.5" × 1", 4" × 2", or 4" × 3") and the number of copies, then <b className="text-slate-900">Print</b>.</> },
              { k: 2, text: <>Stick the label on the equipment. Anyone on staff can scan it with their phone camera, or with <b className="text-slate-900">Scan Asset</b> at the top of Work Orders.</> },
              { k: 3, text: <>Scanning opens that asset: its <b className="text-slate-900">work order history</b> (tap one to open it) and a <b className="text-slate-900">New Work Order</b> button that starts a ticket with the asset already linked and its location filled in.</> },
            ]} />
            <Tip>Maintenance staff see every work order for the asset; other staff, such as a housekeeper reporting a broken dryer, see only the ones they filed. If they aren’t signed in yet, the label takes them to sign in first, then straight to the asset. Labels keep working after you rename or move an asset, so you only print them for new equipment.</Tip>
          </SectionBlock>

          <SectionBlock id="pm" num="03" title="Preventive Maintenance"
            dek="Recurring maintenance tasks — weekly generator tests, monthly filter changes, quarterly inspections — that turn into real work orders on their own when they come due.">
            <ShotsPair>
              <Frame src={SHOT('pm-schedules-list.png')} alt="Preventive Maintenance schedules list" caption="Schedules, with Overdue and Due Soon badges" />
              <Frame src={SHOT('new-pm-schedule-modal.png')} alt="New PM Schedule form" caption="Setting up a recurring schedule" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Schedule</b>, name the task, optionally link an asset, and set the frequency — Weekly, Monthly, Quarterly, Annual, or Custom (every N days).</> },
              { k: 2, text: <>Early each morning ElderLoop creates a work order for every schedule that has come due — titled with a <code>[PM]</code> prefix, with the category, asset, assignee, and due date already filled in. Need it sooner? Click <b className="text-slate-900">Generate WO</b> to create it now.</> },
              { k: 3, text: 'The schedule then moves to its next due date on the calendar (the 1st stays the 1st), so you never reschedule it by hand.' },
            ]} />
          </SectionBlock>

          <SectionBlock id="walkthroughs" num="03b" title="Unit Walkthroughs" roleNote="Work Orders edit"
            dek="Move-in, move-out and periodic inspections of Independent Living units, done by Maintenance under Property Mgmt, with a work order one click away.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Open <b className="text-slate-900">Property Mgmt</b> in the sidebar. Maintenance sees only the <b className="text-slate-900">Walkthroughs</b> tab: no rents, leases or tenant details.</> },
              { k: 2, text: <>Click <b className="text-slate-900">New Walkthrough</b>, pick the unit and type, and work through the room-by-room checklist. Mark each item Good, Fair, Poor, Damaged or Missing and add notes.</> },
              { k: 3, text: <>On the saved walkthrough, click <b className="text-slate-900">Create work order</b>. The ticket opens with the unit's location filled in and every Fair, Poor, Damaged or Missing item listed in the description.</> },
              { k: 4, text: <>The walkthrough card then shows the work order number and its status. Click it to jump straight to the ticket.</> },
            ]} />
            <Tip>The Property Manager sees the same walkthroughs, so a move-out inspection, its repairs and any damage charges stay together.</Tip>
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

          <SectionBlock id="costs" num="05b" title="Costs" roleNote="Maintenance Manager+"
            dek="Parts and vendor spend from closed jobs against the Maintenance budget, plus how much of the work was planned.">
            <Frame src={SHOT('costs.png')} alt="Maintenance Costs tab" caption="Budget status, emergency vendor spend, reactive share, and PM completion by month" />
            <Steps items={[
              { k: 1, text: <>Pick the month with the arrows. The card on the left shows spend against the Maintenance budget and per resident day.</> },
              { k: 2, text: <><b className="text-slate-900">Reactive share</b> is routine and emergency cost compared with planned work; it should fall as preventive maintenance takes hold. <b className="text-slate-900">PM completion</b> is planned jobs due that month that were closed.</> },
              { k: 3, text: <><b className="text-slate-900">Repair or replace</b> flags assets whose lifetime repairs have reached half their replacement cost. Set purchase and replacement cost on the asset for it to work.</> },
            ]} />
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
              { k: 4, text: <><b className="text-slate-900">Import</b> (Managers): bring in work order history from a Work Hub CSV export. Old WO numbers are kept; locations, workers, requestors, residents and categories are matched, and anything unmatched goes into the work order notes. Running the same file again skips jobs already imported.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="ai" num="07" title="AI Assist" roleNote="AI Add-on"
            dek="Type what's wrong in your own words and let AI suggest the category, priority, and a clear description for the technician — you review everything before the ticket is saved.">
            <Frame narrow src={SHOT('ai-suggest.png')} alt="AI suggestion on a new work order" caption="A loose handrail comes back Safety / Urgent, with a suggested description and a keep-residents-safe line" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Work Order</b> and type a <b className="text-slate-900">Title</b> and <b className="text-slate-900">Description</b> the way you'd say it out loud — "handrail loose east hall by 112" is fine.</> },
              { k: 2, text: <>Click <b className="text-slate-900">Suggest category, priority &amp; description</b> under the Description box. In a few seconds the Category and Priority fields fill in, with a one-line reason for the priority.</> },
              { k: 3, text: <>A <b className="text-slate-900">Suggested description</b> appears below — a clear write-up for the technician, including a keep-residents-safe line for urgent hazards. Click <b className="text-slate-900">Use this description</b> to replace yours, or ignore it. <b className="text-slate-900">Undo</b> puts your original text back.</> },
              { k: 4, text: 'Check the fields, change anything you disagree with, and save the ticket as usual.' },
            ]} />
            <Tip>The AI weighs risks to older adults heavily — fall hazards, gas smells, flooding, and no heat or cooling come back <b className="text-slate-900">Urgent</b>, while paint scuffs and bulbs come back Low. It only uses what you typed and never invents room numbers or causes; a vague ticket gets a short description, not a guess. You always have the final say.</Tip>
            <div className="mt-4" />
            <Tip warn>The button only appears when your community has the AI Add-on and Maintenance AI is turned on (Admin Panel → AI Add-on). If you don't see it, ask your administrator.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['File a maintenance issue', 'Work Orders → New Work Order'],
            ['Let AI fill in category, priority & description', 'New Work Order → Suggest category, priority & description'],
            ['Update a ticket’s status', 'Open the ticket → Quick Actions'],
            ['Check equipment service history', 'Assets → click a card, or scan its label'],
            ['Print QR labels for equipment', 'Assets → Print Labels'],
            ['Report a problem with a labeled machine', 'Scan the label → New Work Order'],
            ['See just your jobs, or the unassigned queue', 'Work Orders → My jobs / Open queue'],
            ['Put more than one tech on a job', 'Open the ticket → Additional Techs'],
            ["Print one tech's open work", 'Assigned to + Incomplete filters → Print List'],
            ['Run a recurring task now instead of waiting', 'Preventive Maintenance → Generate WO'],
            ['Inspect an IL unit and open repairs from it', 'Property Mgmt → Walkthroughs → Create work order'],
            ['Conduct a fire/life-safety inspection', 'Life Safety → Inspect'],
            ['Prepare for a state survey', 'Life Safety → Print for Surveyor'],
            ['See SLA performance or staff workload', 'Reports'],
            ['Export ticket data to Excel', 'Reports → Export CSV'],
            ['Change who tickets auto-assign to', 'Settings → Auto-Assignment'],
            ['Add a building, hall, or room', 'Settings → Locations'],
            ['Bring in Work Hub history', 'Settings → Import'],
          ]} />

          <GuideFooter label="Maintenance Module" />
        </main>
      </div>
    </div>
  )
}
