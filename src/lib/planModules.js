// Modules each plan includes — for the UI only (locking modules an org admin can't
// turn on). The database enforces the same rule via plan_allows_module() (see
// supabase/migrations/20260930_realign_plans.sql); keep both in sync with
// PLAN_MODULE_KEYS in api/webhook.js and the create-org Edge Function.
// Only Starter is restricted — Essential, Professional, pilot, and any other plan
// get every module (Essential and Professional differ only in resident/staff caps).
const PLAN_MODULE_KEYS = {
  starter: ['directory', 'staff', 'communication', 'family'],
}

export function planAllowsModule(plan, moduleKey) {
  const keys = PLAN_MODULE_KEYS[plan || 'pilot']
  return !keys || keys.includes(moduleKey)
}

// Resident/staff caps by plan — must match PLAN_LIMITS in api/webhook.js, the
// create-org Edge Function, and the enforce_*_limit database triggers.
export const CAPPED_PLANS = ['starter', 'essential']
