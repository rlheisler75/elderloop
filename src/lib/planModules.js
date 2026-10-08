// Modules each plan includes — for the UI only (locking modules an org admin can't
// turn on). The database enforces the same rule via plan_allows_module() (see
// supabase/migrations/20260930_realign_plans.sql); keep both in sync with
// PLAN_MODULE_KEYS in api/webhook.js and the create-org Edge Function.
// Only Starter is restricted — Essential, Plus, Professional, pilot, and any other plan
// get every module (Essential, Plus, and Professional differ only in resident/staff caps).
const PLAN_MODULE_KEYS = {
  starter: ['directory', 'staff', 'communication', 'family'],
}

export function planAllowsModule(plan, moduleKey) {
  const keys = PLAN_MODULE_KEYS[plan || 'pilot']
  return !keys || keys.includes(moduleKey)
}

// Resident/staff caps by plan — must match PLAN_LIMITS in api/webhook.js, the
// create-org Edge Function, and the enforce_*_limit database triggers.
export const CAPPED_PLANS = ['starter', 'essential', 'plus']

// Caps by plan (null = unlimited) — for super-admin plan changes made outside Stripe.
// Must match PLAN_LIMITS in api/webhook.js and the create-org Edge Function.
export const PLAN_LIMITS = {
  starter:      { resident_limit: 50,   staff_limit: 10   },
  essential:    { resident_limit: 100,  staff_limit: 40   },
  plus:         { resident_limit: 200,  staff_limit: 75   },
  professional: { resident_limit: null, staff_limit: null },
}

// Health modules stay locked until ElderLoop turns on organizations.phi_allowed (BAAs
// signed with the community and with Supabase). Must match phi_module_keys() in the
// database (20261008_health_data_switch.sql), which forces these off regardless.
export const PHI_MODULES = ['nursing', 'social_services', 'incidents', 'ai_assist_clinical']
