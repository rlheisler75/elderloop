import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/dietary/${name}`

const NAV = [
  { id: 'profiles',  num: '01', label: 'Resident Profiles' },
  { id: 'editing',   num: '02', label: 'Editing a Profile' },
  { id: 'tickets',   num: '03', label: 'Meal Tickets' },
  { id: 'menus',     num: '04', label: 'Cycle Menus' },
  { id: 'grid',      num: '05', label: 'Building the Weekly Grid' },
  { id: 'count',     num: '06', label: "Cook's Count" },
  { id: 'items',     num: '07', label: 'Menu Items Catalog' },
  { id: 'waste',     num: '08', label: 'Food Waste Tracking' },
  { id: 'cost',      num: '09', label: 'Cost & Budget Reporting' },
  { id: 'orders',    num: '10', label: 'Meal Delivery Orders' },
  { id: 'physician', num: '11', label: 'Physician Diet Orders' },
]

export default function DietaryGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Dietary"
        dek="A working guide to resident dietary profiles, meal tickets, and cycle menus — what each screen is for, how to use it day-to-day, and how the smart substitution system decides what actually gets served."
        chips={['For: Dietary staff, Supervisors, Managers', 'Where: Sidebar → Dietary', '11 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="profiles" num="01" title="Resident Profiles"
            dek="Every resident's diet type, texture/liquid consistency, allergens, likes and dislikes, and any fluid restriction or feeding assistance needs — all in one card.">
            <Frame src={SHOT('resident-profiles-list.png')} alt="Resident dietary profiles list" caption="Resident Profiles, filterable by diet type" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Use the diet-type chips at the top to filter the list, or search by name or room.' },
              { k: 2, text: 'Each card shows the diet type, texture/consistency (with IDDSI level where it applies), fluid restriction and assistance flags, and any allergies in red.' },
              { k: 3, text: <>The link icon next to a resident's name means the profile is <b className="text-slate-900">linked</b> to their Resident Directory record — their name, room, and care level stay in sync automatically.</> },
            ]} />
            <Tip>A resident with a red allergy line is worth a second look before every tray goes out — it's pulled straight from the profile's Allergens field, not a separate checklist.</Tip>
            <Tip warn>A resident's card also shows a weight-loss alert badge if Nursing's weight history for them crosses an LTC significant-loss threshold (5% in 30 days, 7.5% in 90, or 10% in 180) — it's computed live from the same weight entries Nursing already records, nothing extra to log on the Dietary side. The same alert also surfaces as a "Weight Loss Alerts" tile on the Dashboard.</Tip>
          </SectionBlock>

          <SectionBlock id="editing" num="02" title="Editing a Profile"
            dek="Diet type follows Academy of Nutrition and Dietetics (AND) terminology; texture and liquid consistency follow the IDDSI framework — the same standard most SNF dietitians already chart against.">
            <Frame src={SHOT('resident-profile-modal.png')} alt="Resident dietary profile edit form" caption="Diet type selection, based on AND terminology" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Resident Profile</b>, then search the Resident Directory to link an existing resident — their name and room fill in automatically — or type a name manually for someone not yet in the directory.</> },
              { k: 2, text: 'Pick the Diet Type and Texture & Liquid Consistency that match the physician/dietitian order. Liquid thickness (Slightly Thick through Extremely Thick) is separate from food texture, since a resident can need a different level for each.' },
              { k: 3, text: 'Flag every Allergen that applies — these drive the automatic substitution logic on meal tickets, so this list has to be complete, not just the notes field.' },
              { k: 4, text: <>Record <b className="text-slate-900">Likes</b> and <b className="text-slate-900">Dislikes</b>, and toggle Fluid Restriction or Assistance Needed with details if either applies.</> },
              { k: 5, text: <>Leave <b className="text-slate-900">Assigned Cycle Menu</b> blank to follow the organization's active menu automatically, or pick a specific menu for a resident who's on a different rotation.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="tickets" num="03" title="Meal Tickets"
            dek="A printable ticket for a resident's tray — built from whatever the cycle menu has planned for that date and meal period, automatically swapped for a safe alternate if the planned item doesn't fit their diet, consistency, or allergies.">
            <Frame src={SHOT('print-ticket.png')} alt="Meal ticket preview modal" caption="Meal Ticket Preview — pick a date and meal period, then print" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click the print icon on a resident's card, then set the <b className="text-slate-900">Date</b> and <b className="text-slate-900">Meal Period</b> — the ticket looks up which week of the cycle that date falls on automatically.</> },
              { k: 2, text: 'Review the items shown, then click Print Ticket to open a print-formatted version in a new tab.' },
            ]} />
            <Tip>If the planned item conflicts with the resident's allergens, diet, or consistency, the ticket automatically serves the best-matching backup substitution instead and labels it "Sub for: [original item]." If no safe alternate exists, it prints a clear warning to verify with the kitchen rather than guessing.</Tip>
            <Tip>Tickets also show an "Approx. nutrition" line — calories, protein, carbs, fat, and sodium — totaled from whatever facts are entered on each resolved item in the Menu Items catalog. It's clearly marked "partial" if any item on the tray is missing nutrition data, rather than silently under-reporting.</Tip>
          </SectionBlock>

          <SectionBlock id="menus" num="04" title="Cycle Menus"
            dek="A cycle menu is a repeating rotation (commonly 4 or 16 weeks) of breakfast, AM snack, lunch, PM snack, and dinner. One menu is marked Active at a time and is what residents default to unless assigned a different one.">
            <Frame src={SHOT('cycle-menus-list.png')} alt="Cycle menus list" caption="Cycle Menus — one marked Active" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Cycle Menu</b>, name it, set the cycle length in weeks, and set a start date — the start date is what lets the system calculate which week of the cycle any given day falls on.</> },
              { k: 2, text: 'Click a menu card to open its weekly grid and start building it out.' },
              { k: 3, text: <>Use <b className="text-slate-900">Set Active</b> on a menu once it's ready — only one menu can be active for the organization at a time.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="grid" num="05" title="Building the Weekly Grid"
            dek="Each cell is one meal period on one day of one week in the cycle. Click a cell to set the courses served and, for each course, a priority-ordered list of backup substitutions.">
            <Frame src={SHOT('cycle-menu-grid.png')} alt="Cycle menu weekly grid" caption="The weekly grid — click any cell to edit that meal" />
            <Frame src={SHOT('meal-cell-editor.png')} alt="Meal cell editor showing course and alternates" caption="Setting an Entree course and its backup substitutions" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Use the Wk 1 / Wk 2 / … tabs to move between weeks of the cycle.' },
              { k: 2, text: <>Click a cell, then <b className="text-slate-900">Add Course</b> for each part of the meal (Entree, Soup, Vegetable, Dessert, etc.) and pick a Menu Item for each from the catalog.</> },
              { k: 3, text: <>Click <b className="text-slate-900">Add Alternate</b> on a course to set backup items, in priority order, for residents whose diet, consistency, or allergies rule out the main item.</> },
              { k: 4, text: 'Click Save Meal when done. An empty cell shows a dashed outline with a plus icon; a filled one shows a preview of its items.' },
            ]} />
            <Tip>Alternates apply everywhere that menu item is used across the whole cycle, not just the one cell where you set them up — set them once on a frequently-used item and every occurrence benefits.</Tip>
          </SectionBlock>

          <SectionBlock id="count" num="06" title="Cook's Count"
            dek="A kitchen-facing view of exactly what's being served for one day and meal period — course, item, and backup alternates, no resident-level detail needed.">
            <Frame src={SHOT('cooks-count.png')} alt="Cook's Count panel" caption="Cook's Count for Week 1, Monday Lunch" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: "Click Cook's Count from inside a cycle menu's weekly grid." },
              { k: 2, text: 'Pick the day along the top and the meal period from the dropdown to see what the kitchen needs to prepare.' },
            ]} />
            <Tip>If an item has a recipe (see the chef-hat icon in the Menu Items Catalog below), Cook's Count shows a Recipe toggle that scales every ingredient live from the recipe's written yield to the actual resolved headcount for that day — no manual math to go from "serves 20" to "serves 34."</Tip>
          </SectionBlock>

          <SectionBlock id="items" num="07" title="Menu Items Catalog"
            dek="The master library of food items used to build every cycle menu. Tagging an item's allergens and suitable diets/consistencies once is what powers the automatic substitution logic on meal tickets.">
            <Frame src={SHOT('menu-items-catalog.png')} alt="Menu items catalog" caption="Menu Items — the shared library behind every cycle menu" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Item</b>, name it, and describe it — this is what shows up when picking items for a course in the weekly grid.</> },
              { k: 2, text: 'Tag every allergen the item actually contains, and (optionally) which diets and consistencies it’s suitable for.' },
              { k: 3, text: 'Items with no diet/consistency tags are treated as suitable for everyone — only add restrictions where they genuinely apply.' },
              { k: 4, text: <>Click the chef-hat icon on an item to open its <b className="text-slate-900">Recipe</b> — set a yield (how many servings the written recipe makes) and list ingredients with quantities. This also powers per-item nutrition facts (calories/protein/carbs/fat/sodium) used on meal tickets.</> },
            ]} />
            <Tip warn>Getting allergen tags right here matters more than almost anything else in this module — it's the single source of truth the substitution system checks before ever serving an item to a resident.</Tip>
          </SectionBlock>

          <SectionBlock id="waste" num="08" title="Food Waste Tracking"
            dek="A running log of what's thrown out and why — plate waste, over-production, spoilage, or expired stock — with an estimated cost when the wasted item can be tied to a price.">
            <Frame src={SHOT('food-waste-log.jpg')} alt="Food waste log" caption="Food Waste Log, filterable by date range and category" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Log Waste</b> and pick a Category — Over-Production, Plate Waste, Spoilage, Expired, or Other.</> },
              { k: 2, text: <>Under <b className="text-slate-900">What Was Wasted</b>, link it to a Menu Item, a purchased Central Supply food item, or just type free text if neither fits.</> },
              { k: 3, text: 'Enter the quantity and unit. Linking to a Central Supply item automatically estimates the cost from that item\'s price per unit; a menu item or free-text entry has no linked cost, so the Estimated Cost tile only reflects what has pricing behind it.' },
            ]} />
            <Tip>Waste logged here feeds directly into the Waste Cost figure on the Cost Report — no separate entry needed.</Tip>
          </SectionBlock>

          <SectionBlock id="cost" num="09" title="Cost & Budget Reporting"
            dek="A food-spend snapshot for any date range: what was purchased, what was wasted, and how that compares to a monthly budget you set once.">
            <Frame src={SHOT('cost-report.jpg')} alt="Food cost report" caption="Cost Report — food purchases, waste cost, and a pro-rated budget" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Set the <b className="text-slate-900">Monthly Food Budget</b> once — it's an organization-wide setting, so any dietary staffer can update it as the budget changes.</> },
              { k: 2, text: 'Pick a From/To date range. Food Purchases totals every non-cancelled purchase order line item for a food-category item ordered in that range (including drafts not yet sent to a vendor), pulled straight from the Order Guide\'s own purchase orders rather than a separate spend tracker.' },
              { k: 3, text: 'Waste Cost totals the priced entries from the Food Waste log over the same range.' },
              { k: 4, text: 'The monthly budget is automatically pro-rated to however many days your date range covers, so a one-week view compares fairly against a one-week slice of the monthly number.' },
            ]} />
          </SectionBlock>

          <SectionBlock id="orders" num="10" title="Meal Delivery Orders"
            dek="Residents and their family members can request a meal or snack be delivered to their room from the Resident and Family Portals. This screen is where Dietary sees those requests and works them.">
            <Frame src={SHOT('meal-orders.jpg')} alt="Meal delivery orders queue" caption="Meal Delivery Orders — Received, Preparing, and Delivered" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>New requests appear as <b className="text-slate-900">Received</b>. Each card shows the resident, room, requested items, delivery time, and who placed the order — the resident themselves or a family member, labeled accordingly.</> },
              { k: 2, text: <>Click <b className="text-slate-900">Mark Preparing</b> once the kitchen starts on it, then <b className="text-slate-900">Mark Delivered</b> once the tray goes out. Cancel is available at any stage if a request needs to be pulled.</> },
              { k: 3, text: <>Use the status dropdown to switch between <b className="text-slate-900">Active</b> (Received + Preparing — the default working view) and other statuses.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="physician" num="11" title="Physician Diet Orders"
            dek="A record of physician-directed diet, texture, allergen, or fluid-restriction changes as they actually come in — by phone, fax, or chart note — with a required human review before the change takes effect on a resident's profile.">
            <Frame src={SHOT('physician-orders.jpg')} alt="Physician diet orders list" caption="Physician Diet Orders — pending review alongside an already-applied order" />
            <Frame src={SHOT('log-physician-order-modal.jpg')} alt="Log Physician Diet Order form" caption="Logging an order — fields adapt to the order type selected" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Log Order</b>, pick the resident and ordering physician, and set how it was received (Phone, Fax, Chart Note, EHR, or Other).</> },
              { k: 2, text: 'Choose the Order Type — Diet Change, Consistency Change, Allergen Update, Fluid Restriction, or Other — which shows the matching structured field (new diet type, new consistency, new allergen list, or a fluid-restriction toggle).' },
              { k: 3, text: <>Always fill in <b className="text-slate-900">Order Details</b> with what was actually said, in the physician's or nurse's own words — this is the record that justifies the change, not just the structured fields.</> },
              { k: 4, text: <>The order sits as <b className="text-slate-900">Pending</b> until a dietary staffer reviews it. Click <b className="text-slate-900">Apply</b> to write the change onto the resident's dietary profile, or <b className="text-slate-900">Decline</b> with a reason if it shouldn't go through as logged.</> },
            ]} />
            <Tip warn>Logging an order never changes a resident's diet by itself — Apply is a separate, deliberate step. This keeps a person in the loop before a clinically significant change takes effect, with the order itself standing as the audit trail either way.</Tip>
            <Tip>There's no live feed from PointClickCare or any other EHR into this screen — orders have to be logged manually as they come in. Think of it as the paper trail for verbal and faxed orders, not an integration.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Add or update a resident’s diet, allergies, or texture', 'Resident Profiles → click a card'],
            ['Print a meal ticket for a resident', 'Resident Profiles → print icon'],
            ['Start a new rotating menu', 'Cycle Menus → New Cycle Menu'],
            ['Set what’s served on a specific day/meal', 'Cycle Menus → open a menu → click a cell'],
            ['See what the kitchen needs to prepare today', 'Cycle Menus → open a menu → Cook’s Count'],
            ['Add a new food item or fix its allergen tags', 'Cycle Menus → Menu Items'],
            ['Switch which cycle menu is active', 'Cycle Menus → Set Active on a menu card'],
            ['Log food that was thrown out', 'Food Waste → Log Waste'],
            ['Check food spend against budget', 'Cost Report'],
            ['See and work resident/family meal delivery requests', 'Meal Orders'],
            ['Record a physician-directed diet/texture/allergen change', 'Physician Orders → Log Order'],
            ['Apply a reviewed physician order to a resident\'s profile', 'Physician Orders → Apply on a pending order'],
          ]} />

          <GuideFooter label="Dietary Module" />
        </main>
      </div>
    </div>
  )
}
