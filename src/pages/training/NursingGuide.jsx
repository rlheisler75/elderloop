import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/nursing/${name}`

const NAV = [
  { id: 'overview', num: '01', label: 'Resident List & Stats' },
  { id: 'vitals',   num: '02', label: 'Vitals' },
  { id: 'meds',     num: '03', label: 'Medications' },
  { id: 'notes',    num: '04', label: 'Care Notes' },
]

export default function NursingGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Nursing Notes"
        dek="A working guide to resident vitals, medications, and care notes — one resident at a time, built for a quick check between rounds rather than a long charting session."
        chips={['For: Nursing staff, Supervisors, Managers', 'Where: Sidebar → Nursing Notes', '4 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="overview" num="01" title="Resident List & Stats"
            dek="Pick a resident on the left to open their vitals, medications, and notes on the right. The stat tiles at the top track today's activity across the whole community.">
            <Frame src={SHOT('vitals-tab.png')} alt="Nursing Notes resident view" caption="Resident selected, showing today's vitals summary bar and the Vitals tab" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Search or scroll the resident list, then click a name to open their record.' },
              { k: 2, text: <><b className="text-slate-900">Vitals Today</b>, <b className="text-slate-900">Notes Today</b>, and <b className="text-slate-900">Flagged</b> at the top of the list count activity across the whole community, not just the selected resident — a quick way to see if anything's outstanding for the shift.</> },
              { k: 3, text: 'Once a resident is selected, the summary bar shows their most recent BP, pulse, O₂, and pain level at a glance, with the three tabs — Vitals, Medications, Notes — below it.' },
            ]} />
          </SectionBlock>

          <SectionBlock id="vitals" num="02" title="Vitals"
            dek="Blood pressure, pulse, temperature, weight, O₂ saturation, blood sugar, respirations, and pain level — with automatic BP classification and out-of-range values flagged in red.">
            <Frame src={SHOT('vitals-modal.png')} alt="Record Vitals form" caption="Recording a full vitals set, with live BP classification" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Record Vitals</b>, choose the shift, and fill in whatever was taken — every field is optional except at least one reading.</> },
              { k: 2, text: <>Blood pressure gets classified automatically as you type — <b className="text-slate-900">Normal</b>, <b className="text-slate-900">Elevated</b>, <b className="text-slate-900">High Stage 1/2</b>, or <b className="text-slate-900">Crisis</b> — right next to the input.</> },
              { k: 3, text: 'Pick a Pain Level on the 0–10 scale; it colors green, amber, or red as you go up.' },
            ]} />
            <Tip>Values outside a safe range — O₂ under 94%, temperature at or above 100.4°F, blood sugar under 70 or over 180 — are highlighted in red in the vitals history automatically, no separate alert to configure.</Tip>
          </SectionBlock>

          <SectionBlock id="meds" num="03" title="Medications"
            dek="Every active medication for a resident, split into Scheduled and PRN (as-needed) so it's obvious at a glance what's routine versus situational.">
            <ShotsPair>
              <Frame src={SHOT('medications-tab.png')} alt="Medications tab" caption="Active medications, split into Scheduled and PRN" />
              <Frame src={SHOT('medication-modal.png')} alt="Add Medication form" caption="Adding a medication" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Medication</b> and fill in name, dosage, form, route, and frequency — Indication and Prescriber are optional but useful context for the next shift.</> },
              { k: 2, text: <>Check <b className="text-slate-900">PRN (As Needed)</b> for as-needed medications — they show up in their own section instead of alongside the scheduled list.</> },
              { k: 3, text: <>Use <b className="text-slate-900">Discontinue</b> (not delete) to end a medication — it stays in the record as inactive rather than disappearing.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="notes" num="04" title="Care Notes"
            dek="Shift-by-shift documentation, categorized (Behavioral, Skin Integrity, Nutrition, Fall Risk, Wound Care, and more) with an optional flag to put something in front of a supervisor.">
            <ShotsPair>
              <Frame src={SHOT('notes-tab.png')} alt="Notes tab with a flagged note" caption="A flagged note, with its reason shown inline" />
              <Frame src={SHOT('note-modal-flagged.png')} alt="Add Care Note form with flag toggle on" caption="Flagging a note for supervisor review" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Care Note</b>, set the date, shift, and category, then document what you observed.</> },
              { k: 2, text: <>Turn on <b className="text-slate-900">Flag for supervisor review</b> for anything that needs follow-up, and give a short reason — it shows up in the community-wide Flagged count on the resident list.</> },
            ]} />
            <Tip warn>A flagged note doesn't page or notify anyone automatically — it's a visual marker. Still tell your supervisor directly for anything urgent.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Record a set of vitals', 'Select resident → Vitals → Record Vitals'],
            ['Check BP classification or an out-of-range reading', 'Vitals tab — colored automatically'],
            ['Add or discontinue a medication', 'Select resident → Medications'],
            ['Document an observation from this shift', 'Select resident → Notes → Add Care Note'],
            ['Put something in front of a supervisor', 'Add Care Note → Flag for supervisor review'],
            ['See how busy the floor has been today', 'Stat tiles above the resident list'],
          ]} />

          <GuideFooter label="Nursing Notes Module" />
        </main>
      </div>
    </div>
  )
}
