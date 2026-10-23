import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, Check } from 'lucide-react'
import { Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, GuideFooter } from './TrainingComponents'

// Onboarding aids for a new community: Go-Live Checklist (Org Admin), Administrator
// Quick Start (NHA), Manager Quick Cards, FAQ. All printable. Checklist ticks are a
// per-browser convenience (localStorage), never a record.

const B = ({ children }) => <b className="text-slate-900">{children}</b>
const P = ({ children }) => <p className="text-[15px] text-slate-700 mb-4">{children}</p>
const GuideLink = ({ to, children }) => <Link to={to} className="text-brand-700 font-semibold hover:underline">{children}</Link>

function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 mb-6 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-white">
      <Printer size={14} /> Print
    </button>
  )
}

function useTicks(key) {
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } }
  const [ticks, setTicks] = useState(read)
  const toggle = (id) => setTicks(t => {
    const next = { ...t, [id]: !t[id] }
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* private mode */ }
    return next
  })
  return [ticks, toggle]
}

function Checklist({ items, ticks, toggle, prefix }) {
  return (
    <ul className="space-y-2 mb-6">
      {items.map((it, i) => {
        const id = `${prefix}-${i}`
        const on = !!ticks[id]
        return (
          <li key={id}>
            <button onClick={() => toggle(id)} className="w-full flex items-start gap-3 text-left group">
              <span className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${on ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white group-hover:border-brand-400'}`}>
                {on && <Check size={13} className="text-white" />}
              </span>
              <span className={`text-[15px] ${on ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{it}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 break-inside-avoid">
      <h3 className="font-display font-bold text-slate-900 mb-3">{title}</h3>
      <div className="text-[14px] text-slate-700 space-y-2">{children}</div>
    </div>
  )
}

function Page({ eyebrow, title, dek, chips, nav, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead eyebrow={eyebrow} title={title} dek={dek} chips={chips} />
      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={nav} />
        <main className="min-w-0">
          <PrintButton />
          {children}
          <GuideFooter label={title} />
        </main>
      </div>
    </div>
  )
}

// ── Go-Live Checklist ────────────────────────────────────────────────────────
const GOLIVE = [
  { id: 'community', num: '01', label: 'Community setup', when: '2+ weeks before', items: [
    <>Org Settings: community name, logo, and <B>regulatory state</B>, so the compliance references match your state.</>,
    <>Org Settings: turn on the modules you'll use. A lock means your plan doesn't include it (Upgrade) or it needs a signed BAA (Needs BAA).</>,
    <>Health information: Nursing, Social Services, and Incident Reports stay off until the BAA is signed and ElderLoop turns on health data. Contact ElderLoop to schedule it.</>,
    <>Ask ElderLoop to turn on <B>two-factor sign-in</B> for the community.</>,
    <>Check the approval limits in Org Settings: purchase orders ($1,000 by default) and overtime hours.</>,
    <>Billing: plan is right, and add-ons (AI, Budgets) are on if you bought them.</>,
  ]},
  { id: 'lists', num: '02', label: 'Lists & roles', when: '2 weeks before', items: [
    <>Lists & Pick Lists: departments, job titles, and the other pick lists match how your community talks.</>,
    <><B>Role Templates</B>: for each role, set every module to Edit, View Only, or off. Managers who should look but not touch outside their department get View Only.</>,
    <>Celebrations: check the staff appreciation weeks you want to mark.</>,
  ]},
  { id: 'staff', num: '03', label: 'Staff logins', when: '1–2 weeks before', items: [
    <>Add every staff member in Admin Panel → Users with a role <B>and their department & level</B> (Employee, Supervisor, Manager). Someone with no department sees only their own items.</>,
    <>Whoever supervises a department from another job (for example, the Director of Social Services over Transportation) gets that department added too, at Supervisor or Manager.</>,
    <>Make the Administrator a <B>Platform Admin</B> only if they'll manage users and settings.</>,
    <>Module Access by User: set any exceptions (No Access, or Edit for one person).</>,
    <>Staff set their own passwords from the email link. Resend for anyone who didn't get it.</>,
    <>Admin Panel → Users → 2FA column: everyone marked <B>Setup due</B> sets up two-factor on their first sign-in.</>,
  ]},
  { id: 'residents', num: '04', label: 'Residents & families', when: '1 week before', items: [
    <>Import residents (CSV or Excel) and spot-check rooms, care levels, and contacts.</>,
    <>Record text-message consent from the move-in paperwork (Directory → resident → Agreed to receive … by text). Only where they agreed.</>,
    <>Link family members to residents and send Family Portal invitations.</>,
    <>Send Resident Portal invitations to Independent Living residents who want one.</>,
    <>Share the <GuideLink to="/training/portal">Family & Resident Portal</GuideLink> guide with families (welcome letter or link).</>,
  ]},
  { id: 'departments', num: '05', label: 'Department readiness', when: '1 week before', items: [
    <>Maintenance: assets entered, preventive maintenance schedules set, Life Safety items in place.</>,
    <>Housekeeping: inspection areas and checklists set.</>,
    <>Central Supply: items have a budget department, spend category, and SKU / Item #; vendors have an order email.</>,
    <>Dietary: diet profiles entered and the cycle menu approved.</>,
    <>Transportation: vehicles added and at least one person in the Transportation department (ride requests go to them).</>,
    <>Budgets add-on: each department's monthly budgets set; Housekeeping sets linen in circulation.</>,
  ]},
  { id: 'day', num: '06', label: 'Go-live day', when: 'Day one', items: [
    <>Post a welcome announcement on the board.</>,
    <>Send a test broadcast to yourself by in-app, email, and text.</>,
    <>Each department manager signs in and checks their screens (the <GuideLink to="/training/manager-cards">Manager Quick Cards</GuideLink> help).</>,
    <>The Administrator reads the <GuideLink to="/training/administrator">Administrator Quick Start</GuideLink>.</>,
  ]},
  { id: 'week', num: '07', label: 'First week', when: 'Days 2–7', items: [
    <>2FA column: no one still <B>Setup due</B> in a required role.</>,
    <>Anyone saying "I can't see it": check their department & level first, then their Role Template.</>,
    <>Work orders, ride requests, and family messages are being answered.</>,
    <>Budgets: the census is recording each night (Budgets → Census).</>,
  ]},
]

export function GoLiveChecklist() {
  const [ticks, toggle] = useTicks('elderloop-golive-checklist')
  const total = GOLIVE.reduce((s, g) => s + g.items.length, 0)
  const done = Object.values(ticks).filter(Boolean).length
  return (
    <Page eyebrow="ElderLoop Onboarding" title="Go-Live Checklist"
      dek="Everything to have in place before a community starts using ElderLoop, in the order that goes smoothest."
      chips={['For: Org Admin / setup person', `${done} of ${total} done`, 'Ticks are saved in this browser']}
      nav={GOLIVE.map(g => ({ id: g.id, num: g.num, label: g.label }))}>
      {GOLIVE.map(g => (
        <SectionBlock key={g.id} id={g.id} num={g.num} title={g.label} dek={g.when}>
          <Checklist items={g.items} ticks={ticks} toggle={toggle} prefix={g.id} />
        </SectionBlock>
      ))}
      <Tip>Step-by-step help for each item is in the <Link to="/training/admin-setup" className="font-semibold underline">Admin Setup</Link> guide.</Tip>
    </Page>
  )
}

// ── Administrator Quick Start ────────────────────────────────────────────────
const NHA_NAV = [
  { id: 'role',      num: '01', label: 'Your role' },
  { id: 'daily',     num: '02', label: 'Every day' },
  { id: 'approvals', num: '03', label: 'Approvals' },
  { id: 'incidents', num: '04', label: 'Incidents & state reports' },
  { id: 'emergency', num: '05', label: 'Emergency Edit' },
  { id: 'budgets',   num: '06', label: 'Budgets' },
]

export function AdministratorQuickStart() {
  return (
    <Page eyebrow="ElderLoop Onboarding" title="Administrator Quick Start"
      dek="For the Nursing Home Administrator: what you see, what you approve, and what to do when a department needs you to step in."
      chips={['For: The Administrator (NHA)', 'About 10 minutes', 'Two-factor sign-in required']}
      nav={NHA_NAV}>
      <SectionBlock id="role" num="01" title="Your role" dek="You see every department and approve. Each department's team edits its own records.">
        <P>You can read everything in the community. You approve purchase orders, menus, and budgets; you close incidents and decide state reporting; you act as grievance official. Day-to-day records (work orders, inspections, notes, menus) are changed by the department that owns them. A bar at the top of department screens reminds you of this.</P>
        <P>You can still file a work order or IT ticket, post announcements and broadcasts, message families, and request a ride like anyone else. If you also need to manage users and settings, your Org Admin can make you a <B>Platform Admin</B>.</P>
        <Tip>Two-factor sign-in is required for your role. See <Link to="/training/two-factor" className="font-semibold underline">Two-Factor Sign-In</Link>.</Tip>
      </SectionBlock>
      <SectionBlock id="daily" num="02" title="Every day" dek="Start on the Administrator Dashboard.">
        <P>Your dashboard shows key numbers, Central Supply, and live status across the community. The <B>bell</B> brings you budget alerts when a department goes over. Approvals don't ring the bell, so check Central Supply → Purchase Orders for <B>Awaiting Approval</B> and Incident Reports for <B>State report due</B> each day.</P>
      </SectionBlock>
      <SectionBlock id="approvals" num="03" title="Approvals" dek="Things wait for you; nothing goes out until you act.">
        <P><B>Purchase orders.</B> An order over the approval limit ($1,000 unless changed), or any order for a department that's over budget, shows <B>Awaiting Approval</B> in Central Supply → Purchase Orders. Open it and click <B>Approve &amp; submit</B>, or <B>Send back</B> for changes.</P>
        <P><B>Cycle menus.</B> In Dietary, open the menu and click <B>Approve Menu</B>. The approval and date are recorded.</P>
        <P><B>Budgets.</B> In a standalone community you set budgets yourself (Budgets → Set budgets). In a chain, corporate sets them and you ask with <B>Request a change</B>.</P>
      </SectionBlock>
      <SectionBlock id="incidents" num="04" title="Incidents & state reports" dek="You (or an Org Admin) decide state reporting and close incidents.">
        <P>Each incident has a <B>State Reporting</B> panel (42 CFR 483.12). Record when the allegation became known, then decide: <B>Not reportable</B>, <B>Yes, within 2 hours</B> (abuse or serious bodily injury), or <B>Yes, within 24 hours</B>. The clock shows the deadline, and investigation results are due within 5 working days. Incidents marked <B>State report due</B> need you first.</P>
        <Tip warn>Decide quickly. If it involves alleged abuse or a serious injury, the state must hear within 2 hours of when it became known.</Tip>
      </SectionBlock>
      <SectionBlock id="emergency" num="05" title="Emergency Edit" dek="When a department can't do it and it can't wait.">
        <P>Click <B>Emergency Edit</B> in the bar at the top, give a reason (at least 10 characters, for example "Night supervisor out sick, correcting tonight's documentation"), and start it. For 24 hours you can change any department record. Every change is logged and your Org Admin is notified. Click <B>End now</B> when you're done. It never opens users or settings.</P>
      </SectionBlock>
      <SectionBlock id="budgets" num="06" title="Budgets" dek="With the Budgets add-on.">
        <P>Budgets shows each department's month: spent, projected, and per resident day. You get a bell and email when a department goes over. You also correct the census on the Budgets page when a day is wrong. See <GuideLink to="/training/budgets">Budgets</GuideLink>.</P>
      </SectionBlock>
    </Page>
  )
}

// ── Manager Quick Cards ──────────────────────────────────────────────────────
const CARDS_NAV = [
  { id: 'everyone',  num: '01', label: 'Every manager' },
  { id: 'cards',     num: '02', label: 'Department cards' },
]

export function ManagerQuickCards() {
  return (
    <Page eyebrow="ElderLoop Onboarding" title="Manager Quick Cards"
      dek="One card per department: what your team does, what only you do, and where to look. Print the ones you need."
      chips={['For: Department Managers & Supervisors', 'Print one card per department']}
      nav={CARDS_NAV}>
      <SectionBlock id="everyone" num="01" title="Every manager" dek="True in every department.">
        <Card title="Your team and levels">
          <p><B>Employees</B> do the daily work and see their own items. <B>Supervisors</B> work the whole department and correct entries. <B>Managers</B> own settings, lists, and deletes.</p>
          <p>Outside your department you may be <B>View Only</B>: you can look but not change. You can always file a work order or IT ticket.</p>
          <p>Someone can't see something? Check their department & level with your Org Admin.</p>
          <p>Clinical and incident records are never deleted. Use <B>Entered in error</B> instead.</p>
        </Card>
      </SectionBlock>
      <SectionBlock id="cards" num="02" title="Department cards" dek="Your daily, weekly, and monthly checks.">
        <Card title="Maintenance">
          <p><B>Daily:</B> the work order queue; assign and triage new jobs. Employees see their jobs plus the open queue and can claim jobs.</p>
          <p><B>Closing a job:</B> labor hours, parts bought, and vendor cost on the close-out form.</p>
          <p><B>Only Managers:</B> PM schedules, settings, deletes. <B>Monthly:</B> Maintenance → Costs (reactive share, PM completion, repair or replace).</p>
          <p><GuideLink to="/training/maintenance">Maintenance guide</GuideLink></p>
        </Card>
        <Card title="Dietary">
          <p><B>Daily:</B> meal tickets, Cook's Count, special requests; staff log food waste.</p>
          <p><B>Supervisors:</B> diet profiles, seating, applying physician diet orders. Physician orders are seen by Dietary Supervisors+, Nursing, and Social Services.</p>
          <p><B>Only the Manager:</B> menus, recipes, food budget. <B>Monthly:</B> Cost Report → Food Cost per Resident Day.</p>
          <p><GuideLink to="/training/dietary">Dietary guide</GuideLink></p>
        </Card>
        <Card title="Housekeeping">
          <p><B>Daily:</B> housekeepers record their own inspections and log discarded linen.</p>
          <p><B>Supervisors:</B> correct any inspection; mark IL cleaning visits billed.</p>
          <p><B>Only the Manager:</B> areas, checklists, deletes, linen in circulation. <B>Monthly:</B> Linen tab (cost per room day, loss rate).</p>
          <p><GuideLink to="/training/housekeeping">Housekeeping guide</GuideLink></p>
        </Card>
        <Card title="Central Supply">
          <p><B>Daily:</B> receive, issue, count stock; every movement is logged.</p>
          <p><B>Only the Manager:</B> items, prices, vendors, purchase orders. Orders over the limit wait for the Administrator.</p>
          <p><B>Monthly:</B> Resident Charges → bill and Mark billed; check Billable leakage.</p>
          <p><GuideLink to="/training/central-supply">Central Supply guide</GuideLink></p>
        </Card>
        <Card title="Nursing">
          <p><B>Daily:</B> notes, vitals, and medications under your own name; flag notes for supervisor review.</p>
          <p><B>Supervisors:</B> correct any note. <B>DON:</B> medication lists.</p>
          <p><B>Rides:</B> Transportation → Request a Ride for appointments.</p>
          <p><GuideLink to="/training/nursing">Nursing guide</GuideLink></p>
        </Card>
        <Card title="Social Services">
          <p><B>Daily:</B> your caseload plus unassigned residents: case notes, mood tracking, goals.</p>
          <p><B>Supervisors:</B> see everyone and assign caseloads. <B>Director:</B> closes grievances with the Administrator.</p>
          <p><GuideLink to="/training/social-services">Social Services guide</GuideLink></p>
        </Card>
        <Card title="Activities & Chapel">
          <p><B>Daily:</B> staff take attendance. <B>Supervisors:</B> run the calendar and services. <B>Managers:</B> deletes.</p>
          <p>Activities reports are for the Activities department and the Administrator / Org Admins.</p>
          <p><GuideLink to="/training/activities">Activities guide</GuideLink></p>
        </Card>
        <Card title="Transportation">
          <p><B>Daily:</B> the Requests tab: Schedule or Decline ride requests from Nursing and residents. Print the Trip Sheet for drivers.</p>
          <p>Only the Transportation department schedules or changes trips; everyone else is view only. <B>Managers:</B> vehicles and deletes.</p>
          <p><GuideLink to="/training/transportation">Transportation guide</GuideLink></p>
        </Card>
        <Card title="Budgets (Managers of budget departments)">
          <p>Budgets shows your department's month. Alerts reach you at on-pace-to-go-over, 80%, 90%, and 100%. Record cash or card purchases under Off-system purchases.</p>
          <p><GuideLink to="/training/budgets">Budgets guide</GuideLink></p>
        </Card>
      </SectionBlock>
    </Page>
  )
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  { id: 'access', num: '01', label: 'Access & sign-in', qa: [
    ['I can\'t see a module my coworker sees.', 'What you see depends on your role and your department & level. Ask your Org Admin to check both in Admin Panel → Users.'],
    ['It says "View only".', 'Your role can look at this module but not change it, because it isn\'t your department. If you need to make changes, your Org Admin can give you Edit for that module.'],
    ['I lost my phone and can\'t get my code.', 'Ask your Org Admin to reset your two-factor sign-in, then set up your new phone when you next sign in.'],
    ['I didn\'t get the invitation email.', 'Check spam for a message from info@elderloop.xyz. Your Org Admin can resend it, or use Forgot password? on the sign-in page.'],
    ['I got signed out.', 'ElderLoop signs you out after a period of no activity to protect resident information. Sign in again.'],
  ]},
  { id: 'records', num: '02', label: 'Records', qa: [
    ['How do I delete a note I made by mistake?', 'Clinical, incident, and case notes are never deleted. Use Entered in error; the original stays on file, marked.'],
    ['Why can\'t I change an approved order?', 'Order lines change only while the order is a draft. Ask the Administrator to send it back, or start a new order.'],
    ['Who closes an incident?', 'The Administrator or an Org Admin. Supervisors in the department investigate.'],
  ]},
  { id: 'orders', num: '03', label: 'Orders & budgets', qa: [
    ['My order says Awaiting Approval.', 'It\'s over the approval limit, or the department is over its budget this month. The Administrator approves it or sends it back.'],
    ['Why is my department\'s spending so low?', 'Usually items without a budget department or spend category, or orders still in draft. See the Budgets guide.'],
    ['Do I see the budget?', 'Department Managers of Dietary, Housekeeping, Central Supply, and Maintenance, the Administrator, and Org Admins do. Employees and Supervisors don\'t.'],
  ]},
  { id: 'rides', num: '04', label: 'Rides', qa: [
    ['How do I get a resident to an appointment?', 'Nursing staff: Transportation → Request a Ride. Residents: Rides in the resident portal. Transportation sets the pickup time.'],
    ['Why can\'t I schedule a trip?', 'Only the Transportation department schedules trips. Everyone else sees the calendar as view only.'],
  ]},
  { id: 'messages', num: '05', label: 'Messages & texts', qa: [
    ['Why didn\'t someone get my text?', 'Texts go only to people who agreed and have a mobile number on file. Everyone else gets the in-app and email versions.'],
    ['Can I text about a resident\'s health?', 'No. Texts, emails, and notifications never include health information. Use the care team\'s notes in ElderLoop.'],
    ['How does someone stop texts?', 'Reply STOP to any text, or turn off Text Messages in Settings (portal: My Account → Notifications).'],
  ]},
  { id: 'families', num: '06', label: 'Families & residents', qa: [
    ['A family member sees "No Residents Linked".', 'Their login isn\'t linked to a resident yet. An Org Admin links them under Family Links (see Admin Setup → Residents & families).'],
    ['What can a resident see in the portal?', 'Only their own requests, rides, meals, and RSVPs, plus community announcements, activities, and chapel.'],
  ]},
]

export function OnboardingFAQ() {
  return (
    <Page eyebrow="ElderLoop Onboarding" title="FAQ"
      dek="Quick answers to the questions staff ask most in the first weeks."
      chips={['For: Everyone', 'Ask your Org Admin if it isn\'t here']}
      nav={FAQ.map(g => ({ id: g.id, num: g.num, label: g.label }))}>
      {FAQ.map(g => (
        <SectionBlock key={g.id} id={g.id} num={g.num} title={g.label}>
          <dl className="space-y-4 mb-6">
            {g.qa.map(([q, a]) => (
              <div key={q} className="break-inside-avoid">
                <dt className="font-semibold text-slate-900 text-[15px]">{q}</dt>
                <dd className="text-[15px] text-slate-700 mt-1">{a}</dd>
              </div>
            ))}
          </dl>
        </SectionBlock>
      ))}
    </Page>
  )
}
