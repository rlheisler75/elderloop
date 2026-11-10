import { Frame, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/education/${name}`

const NAV = [
  { id: 'mine',         num: '01', label: 'My In-services' },
  { id: 'sessions',     num: '02', label: 'Adding an In-Service' },
  { id: 'attendance',   num: '03', label: 'Taking Attendance' },
  { id: 'makeups',      num: '04', label: 'Makeups' },
  { id: 'compliance',   num: '05', label: 'Compliance' },
  { id: 'requirements', num: '06', label: 'Yearly Requirements' },
]

const B = ({ children }) => <b className="text-slate-900">{children}</b>

export default function EducationGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Education"
        dek="A working guide to in-services — scheduling them, signing in by QR code, marking attendance, tracking makeups, and showing that every employee met their yearly training."
        chips={['For: All staff, Staff Development, Managers, the Administrator', 'Where: Sidebar → Education', '6 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="mine" num="01" title="My In-services" roleNote="Everyone"
            dek="Your own training record: CE hours this year, any makeups you owe, and every in-service you were expected at.">
            <Frame src={SHOT('my-in-services.png')} alt="My In-services tab" caption="Hours this year, makeups owed, and each session with your status" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Signing in at a session</h3>
            <Steps items={[
              { k: 1, text: <>At the in-service, scan the <B>QR poster</B> with your phone camera. Sign in to ElderLoop if it asks.</> },
              { k: 2, text: <>You'll see <B>You're checked in</B> with the session name, and you're marked Present.</> },
              { k: 3, text: <>Check-in is open from <B>30 minutes before</B> the start to <B>1 hour after</B> it (all day if the session has no start time). Outside that window, or without a phone, sign the paper sign-in sheet instead.</> },
            ]} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Reading your record</h3>
            <Steps items={[
              { k: 1, text: <>Open <B>Education</B> in the sidebar. Most staff land on <B>My In-services</B>.</> },
              { k: 2, text: <>The tiles show your <B>CE hours</B> for the year and <B>Makeups owed</B>. If yearly requirements are set, each one shows <B>On track</B> or <B>Behind</B> with what's missing.</> },
              { k: 3, text: <>Each session shows Present, Absent, Excused, Made up, or Not marked yet.</> },
            ]} />
            <Tip>Scanned but it said "Not checked in"? Tell the instructor. They can mark you Present by hand.</Tip>
          </SectionBlock>

          <SectionBlock id="sessions" num="02" title="Adding an In-Service" roleNote="Staff Development"
            dek="Each in-service records its date, CE hours, who must attend, and the topics it covers.">
            <Frame narrow src={SHOT('new-in-service.png')} alt="New In-Service form" caption="Who must attend decides who is expected; topics count toward yearly requirements" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <B>New In-Service</B> and give it a title, date, start time, <B>CE hours</B>, instructor and location.</> },
              { k: 2, text: <>Pick the <B>Type</B>: Mandatory, Department, New-hire orientation, Makeup session, or <B>Educational activity</B> (optional: it earns hours but never puts anyone on the makeup list).</> },
              { k: 3, text: <>Under <B>Who must attend</B>, choose <B>Everyone employed that day</B> or <B>Only some departments</B>. People hired after the date, or who left before it, aren't expected.</> },
              { k: 4, text: <>Add <B>Topics</B> (Dementia care, Abuse &amp; neglect, Infection prevention…) by clicking a suggestion or typing your own. Topics are how a session counts toward yearly requirements.</> },
            ]} />
            <Frame src={SHOT('sessions.png')} alt="Sessions tab" caption="Every in-service with its Present, Absent, Excused and unmarked counts" />
          </SectionBlock>

          <SectionBlock id="attendance" num="03" title="Taking Attendance" roleNote="Staff Development & Managers"
            dek="Open a session from the Sessions tab to print its QR poster or sign-in sheet and mark who came.">
            <Frame src={SHOT('session-attendance.png')} alt="Session attendance" caption="P, A and E for each person; QR check-ins show up here on their own" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Before the session, click <B>Print QR poster</B> and put it by the door. Click <B>Sign-in sheet</B> for a paper list of everyone expected.</> },
              { k: 2, text: <>People who scan the poster are marked Present automatically, with "checked in by QR" under their name.</> },
              { k: 3, text: <>Mark anyone else with <B>P</B> (Present), <B>A</B> (Absent) or <B>E</B> (Excused). Tap a letter again to clear it. <B>All P</B> or <B>All A</B> marks everyone not yet marked.</> },
              { k: 4, text: <>Someone came who wasn't required? They appear under <B>Also attended</B> and still earn the hours.</> },
            ]} />
            <Tip>Department Managers can mark their own people. Staff Development and the Administrator can mark everyone.</Tip>
          </SectionBlock>

          <SectionBlock id="makeups" num="04" title="Makeups" roleNote="Staff Development & Managers"
            dek="Anyone marked Absent or Excused at a session they were required to attend goes on the makeup list until it's recorded.">
            <Frame src={SHOT('makeups.png')} alt="Makeups tab" caption="Who owes what, and Record makeup when it's done" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Open the <B>Makeups</B> tab. The count on the tab is how many are still owed.</> },
              { k: 2, text: <>When someone makes it up, click <B>Record makeup</B>, enter the date, and pick how: <B>Read and sign</B>, <B>Makeup session</B>, or Other.</> },
              { k: 3, text: <>A recorded makeup earns the original session's CE hours and topics, and drops off the list. Finished ones are under <B>Completed makeups</B>.</> },
            ]} />
            <Tip>Holding a makeup class? Add it as an in-service with Type <B>Makeup session</B> and pick the missed session under <B>Makeup for</B>. Afterwards, use Record makeup for each person who came.</Tip>
          </SectionBlock>

          <SectionBlock id="compliance" num="05" title="Compliance" roleNote="Staff Development, Managers, Administrator"
            dek="Hours, requirements met, and makeups owed for every employee, by year — ready to print for a surveyor.">
            <Frame src={SHOT('compliance.png')} alt="Compliance tab" caption="Filter by year and department, or check Behind only" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Pick the <B>year</B> and a <B>department</B>, or leave All departments.</> },
              { k: 2, text: <>Check <B>Behind only</B> to see just the people missing hours, missing a topic, or owing a makeup.</> },
              { k: 3, text: <>Click <B>Print</B> for a report of exactly what's on screen.</> },
            ]} />
            <Tip>Former employees stay on the report for the years they worked, marked "(former)", so past years stay complete.</Tip>
          </SectionBlock>

          <SectionBlock id="requirements" num="06" title="Yearly Requirements" roleNote="Education settings"
            dek="What each person needs each calendar year: a number of hours, required topics, or both.">
            <Frame narrow src={SHOT('new-requirement.png')} alt="New requirement form" caption="Example: nurse aides need 12 hours a year, including dementia care and abuse prevention" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Open <B>Requirements</B> and click <B>Add requirement</B>.</> },
              { k: 2, text: <>Name it and pick the departments it applies to. Pick none and it applies to everyone.</> },
              { k: 3, text: <>Enter <B>Hours per year</B> and any <B>Required topics</B>. A topic is met when the person attends, or makes up, a session tagged with it.</> },
            ]} />
            <Tip>Federal rules require at least 12 hours a year for nurse aides, including dementia management and abuse prevention training (42 CFR 483.95). Check your state's rules for other roles.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Sign in at an in-service', 'Scan the QR poster with your phone'],
            ['See my hours and makeups', 'Education → My In-services'],
            ['Schedule an in-service', 'Education → New In-Service'],
            ['Print the QR poster or sign-in sheet', 'Sessions → open the session'],
            ['Mark attendance', 'Open the session → P / A / E'],
            ['Record a makeup', 'Makeups → Record makeup'],
            ['Show who is behind', 'Compliance → Behind only → Print'],
            ['Set yearly training rules', 'Requirements → Add requirement'],
          ]} />

          <GuideFooter label="Education Module" />
        </main>
      </div>
    </div>
  )
}
