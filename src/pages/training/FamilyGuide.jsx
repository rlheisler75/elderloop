import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/family/${name}`

const NAV = [
  { id: 'messages', num: '01', label: 'Messages' },
  { id: 'updates',  num: '02', label: 'Resident Updates' },
  { id: 'access',   num: '03', label: 'Granting Portal Access' },
]

export default function FamilyGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Family Messaging"
        dek="A working guide to messaging families, posting resident updates, and granting Family Portal access."
        chips={['For: Supervisors, Managers, Admins', 'Where: Sidebar → Family Messaging', '3 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="messages" num="01" title="Messages"
            dek="Two-way threads with family members, organized by department."
            roleNote="Reply: Supervisor+">
            <Frame src={SHOT('messages.png')} alt="Family Messaging — Messages tab" caption="Filter by department to find the right thread faster" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click a thread on the left to open it — this also marks the family member's messages as read.</> },
              { k: 2, text: <>Reply with text, plus an optional image, PDF, or Word attachment. Double checkmarks show once the family member has read your reply.</> },
              { k: 3, text: <>By default only supervisors, managers, and admins can reply — an org admin can widen this per-user in Admin Panel → Module Access. Everyone else sees threads read-only with a "View-only access" notice.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="updates" num="02" title="Resident Updates"
            dek="Short posts about a resident's day — mood, meals, activities, milestones — that family can optionally see in their own portal.">
            <ShotsPair>
              <Frame src={SHOT('updates.png')} alt="Resident Updates feed" caption="Each update is tagged by category and shows who posted it" />
              <Frame src={SHOT('post-update-modal.png')} alt="Post Resident Update form" caption="Leave Visible to Family unchecked to keep an update staff-only" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Post Resident Update</b>, pick the resident and a category (General, Mood, Activity, Meal, Health, Photo, Milestone), and write the update.</> },
              { k: 2, text: <>A photo is optional but makes milestone and activity updates land much better with family.</> },
              { k: 3, text: <>The <b className="text-slate-900">Visible to Family</b> checkbox is the whole ballgame — checked, it appears in the resident's Family Portal; unchecked, it's an internal note only staff can see.</> },
            ]} />
            <Tip warn>There's no undo on visibility after the fact in this view — think about whether a note belongs in front of family before checking the box.</Tip>
          </SectionBlock>

          <SectionBlock id="access" num="03" title="Granting Portal Access"
            dek="Family Portal logins aren't created here — they're granted from the resident's own profile in the Directory.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How it works</h3>
            <Steps items={[
              { k: 1, text: <>Go to <b className="text-slate-900">Residents</b>, open the resident's profile, and find the <b className="text-slate-900">Family Portal Access</b> panel on the Info tab.</> },
              { k: 2, text: <>Click <b className="text-slate-900">+ Add Family Member</b>, enter their name, email, and relationship, and set which categories they can view (Medical, Dietary, Activities), plus whether they're the Primary contact.</> },
              { k: 3, text: <>Saving sends the family member a branded email with a link to set their own password — nobody has to hand off a temporary one.</> },
              { k: 4, text: <>Once in, a family member's own portal has 7 tabs: Updates, Profile, Messages, Requests (maintenance requests that flow straight into Work Orders), Photos, Activities, and Chapel.</> },
            ]} />
            <Tip>Access can be revoked the same way it was granted — from the resident's Family Portal Access panel.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Reply to a family message', 'Messages tab → click thread → reply'],
            ['Post something family can see', 'Resident Updates → Post Resident Update → check Visible to Family'],
            ['Post an internal-only note', 'Resident Updates → Post Resident Update → leave Visible to Family unchecked'],
            ['Give a family member portal access', 'Residents → resident profile → Family Portal Access'],
            ['See what a family member submitted', 'Family Portal → Requests tab (shows in Work Orders too)'],
          ]} />

          <GuideFooter label="Family Messaging Module" />
        </main>
      </div>
    </div>
  )
}
