// Modules each plan includes — for the UI only (locking modules an org admin can't
// turn on). The database enforces the same rule via plan_allows_module() (see
// supabase/migrations/20260930_plan_module_enforcement.sql); keep both in sync with
// PLAN_MODULE_KEYS in api/webhook.js and the create-org Edge Function.
// professional, pilot, and any other plan = every module.
const PLAN_MODULE_KEYS = {
  starter:   ['directory', 'staff', 'communication', 'family'],
  essential: ['directory', 'staff', 'communication', 'family', 'chapel', 'activities', 'incidents', 'nursing'],
}

export function planAllowsModule(plan, moduleKey) {
  const keys = PLAN_MODULE_KEYS[plan || 'pilot']
  return !keys || keys.includes(moduleKey)
}
