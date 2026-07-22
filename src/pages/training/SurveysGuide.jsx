import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/surveys/${name}`

const NAV = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'building', num: '02', label: 'Building a Survey' },
  { id: 'results',  num: '03', label: 'Results' },
]

export default function SurveysGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Surveys"
        dek="A working guide to building surveys, sharing the public link, and reading the results."
        chips={['For: All staff (create/edit: Manager+)', 'Where: Sidebar → Surveys', '3 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="overview" num="01" title="Overview"
            dek="Every survey your community has run, published or still in draft.">
            <Frame src={SHOT('overview.png')} alt="Surveys list" caption="Copy Link only appears once a survey is published" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Each card shows Published/Draft status, type (One Time or Periodic), response count, and its date range.</> },
              { k: 2, text: <>Everyone can click <b className="text-slate-900">Results</b>; only managers and above see Edit, Publish/Unpublish, and delete.</> },
              { k: 3, text: <>Deleting a survey is a soft delete — it disappears from the list but the historical responses aren't destroyed.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="building" num="02" title="Building a Survey"
            dek="Three tabs: Details, Questions, and Settings — with seven question types to choose from."
            roleNote="Manager+">
            <ShotsPair>
              <Frame src={SHOT('new-survey-details.png')} alt="New Survey — Details tab" caption="Survey Type Periodic adds a repeat-every-N-days field" />
              <Frame src={SHOT('new-survey-questions.png')} alt="New Survey — Questions tab" caption="At least one question is required before you can save" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>On <b className="text-slate-900">Details</b>: title, description, One Time vs. Periodic, and optional start/end dates.</> },
              { k: 2, text: <>On <b className="text-slate-900">Questions</b>: choose from Star Rating, Opinion Scale (0–10), Yes/No, Multiple Choice, Checkboxes, Short Text, or Long Text. Reorder with the up/down arrows and mark any question Required.</> },
              { k: 3, text: <>On <b className="text-slate-900">Settings</b>: toggle <b className="text-slate-900">Allow Anonymous Responses</b> (no login needed via the public link) and <b className="text-slate-900">Show in Resident Portal</b> (surfaces it to logged-in residents/family directly).</> },
              { k: 4, text: <><b className="text-slate-900">Save Draft</b> keeps it unpublished; <b className="text-slate-900">Save &amp; Publish</b> makes it live and generates the shareable link.</> },
            ]} />
            <Tip>Once published, use <b>Copy Link</b> on the survey card to grab the public URL — that's what you text, email, or post for people to respond to.</Tip>
          </SectionBlock>

          <SectionBlock id="results" num="03" title="Results"
            dek="Auto-aggregated stats per question, plus a full response table.">
            <Frame src={SHOT('results.png')} alt="Survey Results modal" caption="Rating and scale questions get a numeric average; choice questions get ranked bar charts" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Top tiles show Total Responses, Completion Rate, and Avg Satisfaction — the satisfaction score only factors in rating/opinion-scale questions, not text or choice ones.</> },
              { k: 2, text: <>Expand any question to see its breakdown: numeric average and distribution for ratings, Yes/No split, ranked option counts for multiple choice/checkboxes, or a scrollable list of verbatim comments for text answers.</> },
              { k: 3, text: <>The response table below lists every individual response with respondent (or "Anonymous"), date, and completion status.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Build a new survey', 'New Survey'],
            ['Get the shareable public link', 'Publish the survey → Copy Link'],
            ['Let people respond without logging in', 'Settings tab → Allow Anonymous Responses'],
            ['Show a survey to residents/family in-app', 'Settings tab → Show in Resident Portal'],
            ['Read the results', 'Results (on any survey card)'],
          ]} />

          <GuideFooter label="Surveys Module" />
        </main>
      </div>
    </div>
  )
}
