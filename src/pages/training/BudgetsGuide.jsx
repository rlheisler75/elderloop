import { Link } from 'react-router-dom'
import { Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

// Text first; screenshots are added in the screenshot pass (public/training/budgets/).
const NAV = [
  { id: 'what',     num: '01', label: 'What it is & who sees it' },
  { id: 'set',      num: '02', label: 'Setting budgets' },
  { id: 'month',    num: '03', label: 'Reading this month' },
  { id: 'alerts',   num: '04', label: 'Alerts & approvals' },
  { id: 'spend',    num: '05', label: 'Getting spend right' },
  { id: 'manual',   num: '06', label: 'Off-system purchases & census' },
  { id: 'reports',  num: '07', label: 'Department cost reports' },
  { id: 'charges',  num: '08', label: 'Resident charges' },
]

const B = ({ children }) => <b className="text-slate-900">{children}</b>
const H3 = ({ children }) => <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">{children}</h3>
const P = ({ children }) => <p className="text-[15px] text-slate-700 mb-6">{children}</p>
const GuideLink = ({ to, children }) => <Link to={to} className="text-brand-700 font-semibold hover:underline">{children}</Link>

export default function BudgetsGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Manager Training"
        title="Budgets"
        dek="Monthly budgets for Dietary, Housekeeping, Central Supply, and Maintenance, with spending counted automatically from orders, stock issued, and closed work orders, plus the cost reports in each department."
        chips={['For: Department Managers, the Administrator, Org Admins', 'Where: Sidebar → Budgets', 'Budgets add-on']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="what" num="01" title="What it is & who sees it"
            dek="Each budget department gets one budget per calendar month. ElderLoop adds up what was spent and shows whether the month is on track.">
            <H3>Who sees budgets</H3>
            <Steps items={[
              { k: '•', text: <><B>Department Managers</B> of Dietary, Housekeeping, Central Supply, and Maintenance see their own department.</> },
              { k: '•', text: <><B>The Administrator</B> and <B>Org Admins</B> see every department.</> },
              { k: '•', text: <><B>Corporate</B> users see each of their communities in the Corporate Portal.</> },
            ]} />
            <P>Employees and Supervisors never see budget dollars, and the Budgets page doesn't appear in their sidebar.</P>
            <H3>Where it comes from</H3>
            <P>Budgets is an add-on. It's included with the Professional plan and for Enterprise communities, and is $79 a month on Essential or Plus. An Org Admin turns it on in <B>Admin Panel → Billing</B>. See <GuideLink to="/training/admin-setup">Admin Setup</GuideLink>.</P>
            <Tip>There's no community-wide total on purpose. Central stock shows up once when it's bought and again when it's issued to a department, so adding the departments together would count it twice.</Tip>
          </SectionBlock>

          <SectionBlock id="set" num="02" title="Setting budgets" roleNote="Administrator / Org Admin"
            dek="A whole year at a time, one row of twelve months per department.">
            <Steps items={[
              { k: 1, text: <>Open <B>Budgets → Set budgets</B>. Use the arrows to pick the year.</> },
              { k: 2, text: <>For each department, either type each month, type an <B>Annual $</B> amount and click <B>Spread evenly</B>, or click <B>Start from (last year) actuals</B> to fill in what was really spent each month last year.</> },
              { k: 3, text: <>Click <B>Save</B> on that department's row. Each department saves on its own.</> },
            ]} />
            <P>Leave a month blank to keep it as it is. When an annual amount doesn't divide evenly, the leftover cents go in December so the year adds up exactly.</P>
            <H3>Communities in a chain</H3>
            <P>When a community belongs to a corporation, the corporate office sets its budgets from the Corporate Portal, and the community has no Set budgets tab. Instead the Administrator uses <B>Budgets → Change requests → Request a change</B>: pick the department and month, enter the new monthly budget and a reason (at least 10 characters), and click <B>Send request</B>. The request shows as pending until Corporate approves or declines it, with their note.</P>
            <Tip>A standalone community gets the same budget tools for itself that a corporate office has for its chain.</Tip>
          </SectionBlock>

          <SectionBlock id="month" num="03" title="Reading this month"
            dek="Budgets → This month shows one card per department. Use the arrows at the top to look at other months.">
            <Steps items={[
              { k: '•', text: <><B>Spent of budget</B>, the big number, and a bar. The thin line on the bar marks the budget; the dark marker is where the month is <B>projected</B> to end at today's pace.</> },
              { k: '•', text: <>A status chip: <B>On track</B>, <B>Watch</B> (80% spent, or projected to go over), <B>Over budget</B> (100% spent), or <B>No budget set</B>.</> },
              { k: '•', text: <><B>Projected month-end</B>: what's been spent ÷ days so far × days in the month. Past months show the <B>Month total</B> instead.</> },
              { k: '•', text: <><B>Daily spend to land on budget</B>: how much you can spend per day for the rest of the month and still finish on budget.</> },
              { k: '•', text: <><B>Per resident day</B>: spending ÷ resident days from the nightly census.</> },
            ]} />
            <P>Click <B>Where the money went</B> on a card to see spending by category and source: purchase orders, shipping, stock issued from Central Supply, off-system purchases, and closed work orders.</P>
          </SectionBlock>

          <SectionBlock id="alerts" num="04" title="Alerts & approvals"
            dek="ElderLoop checks every day and tells the right person before a department runs over.">
            <Steps items={[
              { k: '•', text: <><B>On pace to go over</B> (from the 5th of the month, while under 80% spent): bell and email to the department Manager.</> },
              { k: '•', text: <><B>80% spent</B>: bell to the Manager.</> },
              { k: '•', text: <><B>90% spent</B>: bell and email to the Manager.</> },
              { k: '•', text: <><B>Over budget</B> (100%): bell and email to the Manager <B>and</B> the Administrator.</> },
            ]} />
            <P>Each alert is sent once per department per month. If spending jumps past several lines in one day, only the highest one is sent. A department with no Manager sends its alerts to the Administrator and Org Admins. Alerts that went out show as chips on the department's card, with the date.</P>
            <H3>When a department is over budget</H3>
            <P>Every new purchase order charged to that department goes to <B>Awaiting Approval</B> when it's submitted, whatever the amount, until the next month starts. The Administrator or an Org Admin approves it or sends it back.</P>
            <Tip>Emails go only to people who have email notifications turned on in their Settings.</Tip>
          </SectionBlock>

          <SectionBlock id="spend" num="05" title="Getting spend right" roleNote="Managers"
            dek="Spending is counted automatically, so the budget is only as accurate as how items and orders are labeled.">
            <H3>Supply items</H3>
            <P>In <B>Central Supply → Inventory</B>, each item has a <B>Budget department</B> and a <B>Spend category</B> (Food, Linen, Chemicals, Paper, and so on).</P>
            <Steps items={[
              { k: '•', text: <>An item with a budget department (for example, groceries set to Dietary) counts toward that department <B>when it's ordered</B>.</> },
              { k: '•', text: <>An item left as <B>Central stock</B> counts toward Central Supply when it's ordered, and toward a department <B>when it's issued</B> to that department.</> },
              { k: '•', text: <>The spend category drives the department reports: Food cost per resident day only counts Food, and the Linen report only counts Linen.</> },
            ]} />
            <H3>Purchase orders</H3>
            <P>Only <B>submitted</B> orders count; drafts don't. On a purchase order, <B>Charge to budget</B> covers free-text lines and shipping. Lines for catalog items always follow the item's own budget department.</P>
            <H3>Work orders</H3>
            <P>When Maintenance clicks <B>Mark Complete</B>, a close-out form asks for <B>Labor hours</B>, <B>Parts bought ($)</B>, and <B>Vendor cost ($)</B>. Parts and vendor cost count toward the Maintenance budget on the day the job closes. Labor hours are recorded but never priced. Enter only parts bought for that job; parts taken from Central Supply stock were already counted when they were issued.</P>
            <Tip warn>If a department's spending looks too low, the usual cause is items with no budget department or spend category, or orders still sitting as drafts.</Tip>
          </SectionBlock>

          <SectionBlock id="manual" num="06" title="Off-system purchases & census"
            dek="Record anything bought outside ElderLoop, and keep the resident count right so per-day figures are correct.">
            <H3>Off-system purchases</H3>
            <Steps items={[
              { k: 1, text: <>Open <B>Budgets → Off-system purchases</B> and click <B>Record a purchase</B>.</> },
              { k: 2, text: <>Pick the department and category, then enter the date, amount, what was bought, and where (optional). Click <B>Save</B>.</> },
            ]} />
            <P>Use it for a grocery run, a card purchase, or a local hardware store. Department Managers record purchases for their own department; Org Admins for any department. A wrong entry can be removed with the × on its row.</P>
            <H3>Census</H3>
            <P>The resident count is recorded automatically every night from active residents. The <B>Census</B> panel under the department cards shows the latest count, resident days this month, and days recorded. If a day is wrong (a discharge entered late, for example), the Administrator or an Org Admin clicks <B>Correct a day</B>, enters the residents and occupied rooms, and gives a reason. Corrected days are never overwritten by the nightly count.</P>
          </SectionBlock>

          <SectionBlock id="reports" num="07" title="Department cost reports"
            dek="Each budget department has a cost report inside its own module, visible to the people who can see that department's budget.">
            <H3>Dietary → Cost Report: Food Cost per Resident Day</H3>
            <Steps items={[
              { k: '•', text: <><B>Food cost per resident day</B>, with the change from last month.</> },
              { k: '•', text: <><B>All Dietary spend per resident day</B> against the budget per day (the monthly budget ÷ average daily census × days in the month).</> },
              { k: '•', text: <><B>Food spend</B> and <B>Waste share of food spend</B>, from the food waste log.</> },
              { k: '•', text: <>A six-month trend and the top items by spend.</> },
            ]} />
            <H3>Maintenance → Costs</H3>
            <Steps items={[
              { k: '•', text: <><B>Emergency vendor spend</B>, <B>Reactive share</B> of job costs (routine and emergency vs. planned), <B>PM completion</B>, and jobs closed with labor hours.</> },
              { k: '•', text: <><B>Repair or replace</B>: assets are flagged <B>Replace?</B> when lifetime repairs reach 50% of the replacement cost. Add a replacement cost and expected life to assets on the Assets tab to see this.</> },
            ]} />
            <P>A falling reactive share over time is the measured payoff of preventive maintenance.</P>
            <H3>Housekeeping → Linen</H3>
            <Steps items={[
              { k: 1, text: <>Housekeepers log linen pulled from service: item, quantity, date, and reason (Torn, Stained, Worn out, Lost, Other). Mistakes are marked <B>Entered in error</B>, never deleted.</> },
              { k: 2, text: <>The Housekeeping Manager sets <B>linen in circulation</B> with the pencil on the Linen loss rate tile.</> },
              { k: 3, text: <>The report shows <B>Linen per occupied room day</B>, <B>Chemical units per occupied room day</B> (counted in units so a price change can't hide overuse), the loss rate, and the value of discarded linen.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="charges" num="08" title="Resident charges" roleNote="Central Supply Manager"
            dek="Central Supply → Resident Charges lists chargeable items issued to residents, so nothing goes unbilled.">
            <Steps items={[
              { k: 1, text: <>Pick the month. <B>Not billed</B> shows what still needs billing; <B>All charges</B> shows everything.</> },
              { k: 2, text: <>Bill the charges in your own billing system. ElderLoop doesn't keep resident accounts. Use <B>Export CSV</B> to take the list with you.</> },
              { k: 3, text: <>Tick the charges you billed, optionally enter an invoice or batch number, and click <B>Mark billed</B>.</> },
            ]} />
            <P>The <B>Billable leakage</B> panel shows the value of chargeable items issued, how much was never charged or not yet billed, and the leakage rate. Lines marked <B>No price</B> have no sale price and aren't counted; set prices in Inventory.</P>
            <Tip>The Central Supply Manager and Org Admins mark charges billed.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['See this month', 'Budgets → This month'],
            ['Set the year\'s budgets', 'Budgets → Set budgets'],
            ['Ask Corporate for a change', 'Budgets → Change requests → Request a change'],
            ['Record a cash or card purchase', 'Budgets → Off-system purchases → Record a purchase'],
            ['Fix a census day', 'Budgets → Census → Correct a day'],
            ['Set an item\'s budget department', 'Central Supply → Inventory → edit item'],
            ['Food cost per resident day', 'Dietary → Cost Report'],
            ['Maintenance costs, repair or replace', 'Maintenance → Costs'],
            ['Log discarded linen', 'Housekeeping → Linen'],
            ['Bill resident supply charges', 'Central Supply → Resident Charges'],
          ]} />

          <GuideFooter label="Budgets" />
        </main>
      </div>
    </div>
  )
}
