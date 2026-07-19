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
]

export default function DietaryGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Dietary"
        dek="A working guide to resident dietary profiles, meal tickets, and cycle menus — what each screen is for, how to use it day-to-day, and how the smart substitution system decides what actually gets served."
        chips={['For: Dietary staff, Supervisors, Managers', 'Where: Sidebar → Dietary', '7 sections']}
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
          </SectionBlock>

          <SectionBlock id="items" num="07" title="Menu Items Catalog"
            dek="The master library of food items used to build every cycle menu. Tagging an item's allergens and suitable diets/consistencies once is what powers the automatic substitution logic on meal tickets.">
            <Frame src={SHOT('menu-items-catalog.png')} alt="Menu items catalog" caption="Menu Items — the shared library behind every cycle menu" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Item</b>, name it, and describe it — this is what shows up when picking items for a course in the weekly grid.</> },
              { k: 2, text: 'Tag every allergen the item actually contains, and (optionally) which diets and consistencies it’s suitable for.' },
              { k: 3, text: 'Items with no diet/consistency tags are treated as suitable for everyone — only add restrictions where they genuinely apply.' },
            ]} />
            <Tip warn>Getting allergen tags right here matters more than almost anything else in this module — it's the single source of truth the substitution system checks before ever serving an item to a resident.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Add or update a resident’s diet, allergies, or texture', 'Resident Profiles → click a card'],
            ['Print a meal ticket for a resident', 'Resident Profiles → print icon'],
            ['Start a new rotating menu', 'Cycle Menus → New Cycle Menu'],
            ['Set what’s served on a specific day/meal', 'Cycle Menus → open a menu → click a cell'],
            ['See what the kitchen needs to prepare today', 'Cycle Menus → open a menu → Cook’s Count'],
            ['Add a new food item or fix its allergen tags', 'Cycle Menus → Menu Items'],
            ['Switch which cycle menu is active', 'Cycle Menus → Set Active on a menu card'],
          ]} />

          <GuideFooter label="Dietary Module" />
        </main>
      </div>
    </div>
  )
}
