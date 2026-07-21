# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ElderLoop is a multi-tenant senior living management platform (elderloop.xyz), built by Loopware Solutions LLC. It's a single-page React app (plain JSX, not TypeScript) built with Vite, backed by Supabase (Postgres + Auth + RLS), styled with Tailwind CSS, and deployed on Vercel. Server-side logic that needs a secret key lives in two places: a small set of Vercel serverless functions in `api/` (Stripe billing + the Stripe webhook), and a set of Supabase Edge Functions (account/org creation, checkout, rep promo codes, transactional email) deployed straight to the hosted Supabase project — see "Data access" below.

ElderLoop has a sibling product, **littleloop** (childcare management, same company), built on similar architecture (Supabase + Vercel). When a pattern here seems ad hoc or you want precedent for how a cross-cutting concern was solved, it may be worth checking how littleloop handled it.

## Commands

```
npm install
npm run dev       # start Vite dev server
npm run build     # production build (vite build)
npm run preview   # preview the production build
```

There is no lint, typecheck, or test tooling configured in this repo (no ESLint/Prettier config, no `tsconfig.json`, no Jest/Vitest/Playwright, no test files). Don't invent commands for these — verify changes by running `npm run dev` and exercising the affected page/flow manually.

Local env setup: `cp .env.example .env.local` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Other env vars referenced in code but not in `.env.example`:
- Client (Vite, must be prefixed `VITE_`): `VITE_STRIPE_PRICE_ESSENTIAL`, `VITE_STRIPE_PRICE_PROFESSIONAL` (read by `src/pages/admin/BillingTab.jsx` only to gray out/label upgrade buttons — the real price ID resolution happens server-side), `VITE_VAPID_PUBLIC_KEY` (web push)
- Server, Vercel env (used only by `api/*.js`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_ESSENTIAL`/`STRIPE_PRICE_PROFESSIONAL`/`STRIPE_PRICE_COMMUNITY` (legacy alias, maps to professional), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Server, **Supabase Edge Function secrets** (a separate store from Vercel's env — set via the Supabase dashboard or `supabase secrets set`, not `.env`): `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ESSENTIAL`, `STRIPE_PRICE_PROFESSIONAL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `SITE_URL` (optional — functions that read it fall back to `https://elderloop.xyz` if unset)

There is no local `supabase/` directory (no `config.toml`, no migrations, no local edge function source) — the schema and edge functions live only in the hosted Supabase project. Use the Supabase MCP tools (`list_tables`, `execute_sql`, `get_advisors`, `list_edge_functions`, `get_edge_function`, etc.) to inspect schema/data/function source rather than looking for local files.

## Architecture

### Not a monorepo
Single flat app: `src/` (SPA) + `api/` (a handful of standalone Vercel serverless functions, no shared build step — `npm run build` only builds the SPA; Vercel deploys `api/*.js` automatically).

### Routing and role-based portals (`src/App.jsx`)
All routing lives in one file. `App.jsx` first branches on `profile.role` before rendering anything else:
- `role === 'family'` → only `/family-portal` is reachable
- `role === 'resident'` → only `/resident` is reachable
- `role === 'sales_rep'` → only `/rep` is reachable
- everything else → full staff route tree under `/app/*`, wrapped in `Layout` (sidebar shell)

Route guards (defined inline in `App.jsx`, not extracted): `ProtectedRoute` (requires `user`; if `requireModule` is set, checks `planAllowsModule` then `hasModule`, redirecting to an `UpgradeWall` or back to the dashboard respectively), `AdminRoute` (`isOrgAdmin`), `SuperAdminRoute` (`isSuperAdmin`). Most feature modules are `lazy()`-loaded; a few "core" modules (Communication, WorkOrders, Dietary, Housekeeping, CentralSupply) are eagerly imported.

### Auth and RBAC hub (`src/context/AuthContext.jsx`)
This is the single source of truth for identity, org, and permissions — read it before touching any access-control logic. On sign-in it loads the `profiles` row, then in parallel loads `organizations`, `organization_modules`, and `user_module_permissions`. Key derived helpers/values consumed throughout the app: `hasModule(key)`, `canEdit(key, defaultRoles)`, `planAllowsModule`, and booleans `isOrgAdmin`/`isSuperAdmin`/`isCEO`. `signOut()` writes an audit event via `supabase.rpc('log_audit_event', ...)` before calling `supabase.auth.signOut()` (HIPAA-driven), paired with `useSessionTimeout` + `SessionTimeoutModal` for auto-logout on inactivity.

### Multi-tenancy / billing model
Each org has a `plan` (`starter`/`essential`/`professional`) and `billing_status` (`trialing`/`active`/`past_due`/`canceled`/`pilot`). Feature access is gated per-org via rows in `organization_modules` (keyed by `module_key`), not by plan directly. The Stripe webhook (`api/webhook.js`) is the single source of truth mapping a subscription's price ID to enabled modules: `PLAN_MODULE_KEYS` / `PLAN_LIMITS` maps + `enableModulesForPlan()`, triggered on `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed/succeeded`.

**Adding a new gated module requires touching three places together:**
1. `src/App.jsx` — new route + `<ProtectedRoute requireModule="...">`
2. `src/components/layout/Layout.jsx` — new entry in `ALL_NAV` with the matching `module` key
3. Supabase — the `module_key` must exist in `modules` and be enabled in `organization_modules` for orgs that should see it

### Data access — no backend framework
Nearly all reads/writes go directly from the browser to Supabase (`supabase.from(...)`), authorized by Postgres RLS using the anon key (`src/lib/supabase.js`, HMR-safe singleton via `globalThis`). Server-side code (secret-key operations) is split across two layers — check both before assuming a flow is dead code, and check both when fixing a bug in one of these areas:

**Vercel serverless functions (`api/`)**, deployed automatically from this repo:
- `api/create-portal.js` — creates a Stripe Billing Portal session
- `api/invoices.js` — lists Stripe invoices for a customer
- `api/webhook.js` — the live Stripe webhook target → mutates `organizations` billing fields and `organization_modules` on `checkout.session.completed`/`customer.subscription.*`/`invoice.payment_*`; also backfills `organizations.rep_id` when a redeemed promo code belongs to a rep and the org isn't already attributed
- `api/rep/create-promo-code.js` — the **actively-used** promo-code creator: validates a Supabase JWT, requires role `sales_rep`/`super_admin`, creates a Stripe Coupon + Promotion Code, inserts into `rep_promo_codes` (rolls back the Stripe objects if the Supabase insert fails); called from `PromoCodesTab.jsx`

**Supabase Edge Functions**, deployed straight to the hosted project (no local source checked in — use `list_edge_functions`/`get_edge_function` to read them, `deploy_edge_function` to update):
- `create-org` — signup: creates the auth user + `organizations` row + `org_admin` profile for a new community (called from `Signup.jsx`)
- `create-checkout` — the **actively-used** Stripe Checkout creator (called from `Signup.jsx` and `BillingTab.jsx`); resolves price IDs server-side, applies a `rep_promo_codes` promo code if valid, handles prorated in-place plan upgrades
- `create-rep-account` — creates a sales rep's login (org-less `profiles` row, role `sales_rep`) plus its linked `rep_codes` row in one atomic operation; only caller is the Super Admin "Rep Accounts" tab
- `create-user` — org admin/super admin creating a staff account (requires `organization_id`, so it can't be reused for reps)
- `enable-family-portal` / `enable-resident-portal` — grants family/resident portal login access, emails a password-setup link via Resend
- `send-password-reset` — public (no auth), generates a Supabase recovery link server-side and emails it via Resend; called from `ForgotPassword.jsx` and the Super Admin Rep Accounts table. Exists specifically so the redirect always points at production and the email is branded — see the gotcha below.
- `send-broadcast` / `send-push` — Communication module's broadcast messaging
- `waitlist-confirm` — public landing-page waitlist form confirmation + internal lead notification emails

**Resend sender-domain gotcha:** `elderloop.xyz` is **not** a verified sending domain in Resend — any email sent `from: '...@elderloop.xyz'` gets rejected by Resend with a 403, and because these calls are all fire-and-forget (`fetch(...).catch(() => {})` or unchecked), the failure is completely silent — the function still reports success. Every transactional email in the app sends from `ElderLoop Support <info@loopwaresolutions.com>` (the verified domain) for this reason. If you add a new email-sending function, use that same sender, or first confirm `elderloop.xyz` has been verified in the Resend dashboard. Similarly, any `redirectTo`/`generateLink` URL must use the `SITE_URL` env var (falls back to `https://elderloop.xyz`) — never `window.location.origin`, which embeds whatever host the request happened to come from (e.g. `localhost` during local dev testing) — and that URL must be present in the Supabase project's Auth → URL Configuration → Redirect URLs allow-list, or Supabase silently substitutes its own Site URL instead.

These all use the Supabase **service-role** key (bypasses RLS) — never expose that key or `STRIPE_SECRET_KEY` to client-side code. Note: `api/create-checkout.js` (Vercel) was a legacy, entirely unused duplicate of the `create-checkout` Edge Function and has been removed — if you ever see two implementations of the same operation again (one Vercel, one Edge Function), grep `src/` for the actual caller before touching either.

### Feature modules (`src/pages/`)
One folder per business module (activities, admin, ceo, chapel, communication, dashboard, dietary, directory, family, housekeeping, incidents, it, landing, marketing, meters, nursing, property, rep, resident, security, signage, social, staff, superadmin, supply, surveys, timeclock, transportation, tv, workorders). Each is largely self-contained and queries Supabase directly; there's no shared API-client abstraction beyond `src/lib/supabase.js`. Notable ones:
- `it` — IT ticketing plus asset/equipment tracking
- `timeclock` — staff time clock with geolocation capture on clock-in/out

### PWA / push notifications
`public/sw.js` service worker is registered from `index.html`. `src/hooks/usePushNotifications.js` implements Web Push subscribe/unsubscribe using `VITE_VAPID_PUBLIC_KEY`, persisting subscriptions to the `push_subscriptions` table.

### Styling
Tailwind CSS with a custom theme (`tailwind.config.js`): `brand` (blue) and `sage` (green) color scales, `display` font "Playfair Display", `body` font "Source Sans 3". No CSS-in-JS.

### No path aliases
`vite.config.js` has no `resolve.alias` — all imports are relative (e.g. `'../lib/supabase'`).

## Working conventions

- This repo lives under OneDrive (`C:\Users\Robert\OneDrive\Documents\GitHub\elderloop\elderloop`) — OneDrive sync can lag. If an edit doesn't seem to take effect (stale content, dev server not picking up a change), check OneDrive sync status before assuming a tooling bug.
- There's no local Supabase project and no migrations folder — schema changes made via the Supabase MCP tools go straight to the live hosted database. Always confirm before running destructive SQL (dropping/altering tables or columns), applying migrations, or any operation against production data.
- Always confirm before force-pushing or other destructive git operations.
