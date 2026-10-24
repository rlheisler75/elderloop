// Job Roles (20261023_job_roles_foundation.sql): what each action means in each
// module. A module lists only the actions that do something there; the Job Roles
// grid greys out the rest. Keep ACTIONS in sync with the job_role_permissions.action
// check constraint, and module keys with the modules table.

export const ACTIONS = [
  { key: 'view',     label: 'View' },
  { key: 'create',   label: 'Create' },
  { key: 'edit',     label: 'Edit' },
  { key: 'approve',  label: 'Approve' },
  { key: 'delete',   label: 'Delete' },
  { key: 'settings', label: 'Settings' },
  { key: 'costs',    label: 'Costs' },
]

export const PERMISSION_MODULES = [
  { key: 'work_orders', label: 'Maintenance', actions: {
    view: 'See every work order', create: 'Submit work orders', edit: 'Work jobs: status, notes, close-out',
    approve: 'Assign and triage (priority, category, due date, vendor)', delete: 'Delete work orders',
    settings: 'PM schedules, assets, SLA and auto-assign rules', costs: 'Maintenance costs and budget' } },
  { key: 'meters', label: 'Meter Readings', actions: {
    view: 'See meters and readings', create: 'Record readings', edit: 'Correct readings',
    delete: 'Delete readings', settings: 'Meters and utility rates', costs: 'Utility costs' } },
  { key: 'dietary', label: 'Dietary', actions: {
    view: 'Diets, textures, allergens, menus, tickets', create: 'Log food waste, work special requests',
    edit: 'Diet profiles, seating, apply physician diet orders', approve: 'Approve cycle menus',
    delete: 'Delete dietary records', settings: 'Menus, recipes, menu items, food budget', costs: 'Food cost and budget' } },
  { key: 'housekeeping', label: 'Housekeeping', actions: {
    view: 'See inspections and IL cleaning requests', create: 'Record inspections, log linen',
    edit: 'Correct anyone\'s inspection or linen entry', approve: 'Mark IL cleaning visits billed',
    delete: 'Delete inspections', settings: 'Areas, checklists, linen in circulation', costs: 'Linen and chemical costs, budget' } },
  { key: 'central_supply', label: 'Central Supply', actions: {
    view: 'See stock and transactions', create: 'Receive, issue, count stock', edit: 'Purchase orders and item details',
    approve: 'Approve orders over the limit', delete: 'Delete items and orders', settings: 'Catalog and vendors',
    costs: 'Prices, budget, bill resident charges' } },
  { key: 'social_services', label: 'Social Services', actions: {
    view: 'Your caseload plus unassigned residents', create: 'Case notes, mood logs, goals',
    edit: 'See every resident, correct notes, assign caseloads', approve: 'Close grievances and regulatory fields',
    delete: 'Delete records that allow it', settings: 'Resource directory and lists' } },
  { key: 'nursing', label: 'Nursing Notes', actions: {
    view: 'See care notes, vitals, medications', create: 'Write notes and vitals under your name',
    edit: 'Correct anyone\'s note or vital', settings: 'Medication lists (DON)' } },
  { key: 'incidents', label: 'Incident Reports', actions: {
    view: 'See every incident report', create: 'File incident reports', edit: 'Investigate and review any report',
    approve: 'Close incidents and decide state reporting' } },
  { key: 'activities', label: 'Activities', actions: {
    view: 'See the activity calendar', create: 'Take attendance, see participation reports',
    edit: 'Add and change activities', delete: 'Delete activities', settings: 'Activity categories' } },
  { key: 'chapel', label: 'Chapel', actions: {
    view: 'See chapel services', create: 'Take attendance', edit: 'Schedule and stream services',
    delete: 'Delete services', settings: 'Chapel settings' } },
  { key: 'transportation', label: 'Transportation', actions: {
    view: 'See the trip calendar', create: 'Request a ride', edit: 'Schedule, change, and log trips; work requests',
    delete: 'Delete trips', settings: 'Vehicles' } },
  { key: 'security', label: 'Security', actions: {
    view: 'See rounds and reports', create: 'Do rounds and file reports', edit: 'Update rounds and reports',
    approve: 'Guard schedules, review reports', delete: 'Delete records', settings: 'Checkpoints' } },
  { key: 'it', label: 'IT & Technology', actions: {
    view: 'See every ticket and the asset list', create: 'Submit IT tickets', edit: 'Work tickets, update assets',
    delete: 'Delete tickets and assets', settings: 'Add assets', costs: 'Software licenses and costs' } },
  { key: 'property_management', label: 'Property (IL)', actions: {
    view: 'See units, keys, walkthroughs', create: 'Add keys and walkthroughs', edit: 'Update units, keys, walkthroughs',
    approve: 'Approve deposit refunds', delete: 'Delete property records', settings: 'Units',
    costs: 'Tenants, leases, rent, deposits, notices' } },
  { key: 'marketing', label: 'Marketing', actions: {
    view: 'See leads and follow-ups', create: 'Add leads and activities', edit: 'Work leads',
    approve: 'Campaigns, templates, sequences, landing pages', delete: 'Delete marketing records', settings: 'Referral sources' } },
  { key: 'scheduling', label: 'Scheduling', actions: {
    view: 'See the schedule for your departments', edit: 'Build your departments\' schedule',
    approve: 'See and schedule every department', settings: 'Shift templates' } },
  { key: 'timeclock', label: 'Time Clock', actions: {
    view: 'Clock in and out, see your punches', edit: 'See and correct the team\'s punches' } },
  { key: 'staff', label: 'Staff', actions: {
    view: 'See staff and certifications', create: 'Add certifications', edit: 'Update certifications',
    delete: 'Delete certifications' } },
  { key: 'communication', label: 'Communication', actions: {
    view: 'Read announcements', create: 'Post announcements, send broadcasts', edit: 'Edit announcements' } },
  { key: 'directory', label: 'Residents', actions: {
    view: 'Resident directory and contacts', create: 'Add residents', edit: 'Update residents' } },
  { key: 'family', label: 'Family Messaging', actions: {
    view: 'See family threads', create: 'Message families, post updates', edit: 'Manage family access' } },
  { key: 'surveys', label: 'Surveys', actions: {
    view: 'See surveys and results', create: 'Build surveys', edit: 'Change surveys', delete: 'Delete surveys' } },
  { key: 'budgets', label: 'Budgets', actions: {
    view: 'See the Budgets page', approve: 'Decide budget change requests', settings: 'Set budgets', costs: 'See budget dollars' } },
]

export const moduleLabel = (key) => PERMISSION_MODULES.find(m => m.key === key)?.label ?? key
export const actionLabel = (key) => ACTIONS.find(a => a.key === key)?.label ?? key
