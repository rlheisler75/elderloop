import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/activities/${name}`

const NAV = [
  { id: 'calendar', num: '01', label: 'Calendar View' },
  { id: 'adding',   num: '02', label: 'Adding an Activity' },
  { id: 'upcoming', num: '03', label: 'Upcoming List' },
  { id: 'print',    num: '04', label: 'Print Schedule' },
]

export default function ActivitiesGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Activities"
        dek="A working guide to the activity calendar — building the month's programming, setting up recurring classes, and getting a schedule into residents' hands."
        chips={['For: Activities staff, Supervisors, Managers', 'Where: Sidebar → Activities', '4 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="calendar" num="01" title="Calendar View"
            dek="A full month at a glance, color-coded by category, with recurring classes already expanded onto every date they occur.">
            <Frame src={SHOT('calendar-view.png')} alt="Activities month calendar" caption="July at a glance, filtered by category chips along the top" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Use the category chips (Fitness, Arts & Crafts, Games, Social, and more) to filter the calendar down to one type of programming at a time.' },
              { k: 2, text: <>Click any empty spot on a day to add an activity for that date — click an existing event pill to open and edit it.</> },
              { k: 3, text: <>A small refresh icon on an event means it's <b className="text-slate-900">recurring</b> — editing one occurrence edits the whole series, not just that day.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="adding" num="02" title="Adding an Activity"
            dek="Title, category, schedule, and where it repeats — plus control over whether it shows up for residents and on the lobby TV.">
            <Frame src={SHOT('activity-modal.png')} alt="Activity form" caption="Category, schedule, and repeat options" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Give it a title, pick a category (this sets the color used everywhere the activity appears), and set the date, time, and location.' },
              { k: 2, text: <>Toggle <b className="text-slate-900">All day event</b> for anything without a specific time slot.</> },
              { k: 3, text: <>Under <b className="text-slate-900">Repeat</b>, choose Daily, Weekly, Every 2 weeks, or Monthly for a recurring class — set a Repeat Until date, or leave it blank to repeat indefinitely.</> },
              { k: 4, text: <>Use <b className="text-slate-900">Show in Resident Portal</b> and <b className="text-slate-900">Show on Digital Signage</b> to control where it's visible — turn either off for a staff-only or internal planning entry.</> },
            ]} />
            <Tip>Deleting a recurring activity removes the whole series, not just one occurrence — there's a confirmation before it happens, but there's no way to delete a single date out of a recurring series today.</Tip>
          </SectionBlock>

          <SectionBlock id="upcoming" num="03" title="Upcoming List"
            dek="The same activities as a scannable list instead of a grid — grouped by day, showing the next three months.">
            <Frame src={SHOT('upcoming-list.png')} alt="Upcoming activities list view" caption="Grouped by date, with Today called out at the top" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Switch to <b className="text-slate-900">Upcoming</b> from the view toggle next to Calendar.</> },
              { k: 2, text: 'This is often easier than the calendar for a quick "what’s happening today" check, or for reading off a printed staff handoff sheet.' },
            ]} />
          </SectionBlock>

          <SectionBlock id="print" num="04" title="Print Schedule"
            dek="A clean, printable version of the current month's calendar — grouped by day with times, locations, and descriptions.">
            <Frame src={SHOT('print-schedule-modal.png')} alt="Print Schedule preview" caption="Preview before printing or posting" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Print Schedule</b> from the Calendar view — it uses whatever month and category filter you currently have selected.</> },
              { k: 2, text: <>Click <b className="text-slate-900">Print Schedule</b> again inside the preview to open a print-formatted version in a new tab, ready to print or post on a bulletin board.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Add a one-time event', 'Calendar → click a day → Add Activity'],
            ['Set up a recurring class', 'Add Activity → Repeat → Weekly/Monthly/etc.'],
            ['Hide something from residents', 'Add Activity → turn off Show in Resident Portal'],
            ['Check what’s happening today', 'Upcoming view'],
            ['Filter to one type of activity', 'Category chips above the calendar'],
            ['Get a printable monthly schedule', 'Print Schedule button'],
          ]} />

          <GuideFooter label="Activities Module" />
        </main>
      </div>
    </div>
  )
}
