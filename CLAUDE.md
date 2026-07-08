# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ElderLoop is a multi-tenant senior living management platform (elderloop.xyz), built by Loopware Solutions LLC. It's a single-page React app (plain JSX, not TypeScript) built with Vite, backed by Supabase (Postgres + Auth + RLS), styled with Tailwind CSS, and deployed on Vercel. A small set of Vercel serverless functions in `api/` handle Stripe billing operations that require secret keys.

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
- Client (Vite, must be prefixed `VITE_`): `VITE_STRIPE_PRICE_STARTER`, `VITE_STRIPE_PRICE_COMMUNITY`, `VITE_VAPID_PUBLIC_KEY` (web push)
- Server (Vercel env, used only by `api/*.js`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_ESSENTIAL`/`STRIPE_PRICE_COMMUNITY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`

There is no local `supabase/` directory (no `config.toml`, no migrations, no local edge functions) — the schema lives only in the hosted Supabase project. Use the Supabase MCP tools (`list_tables`, `execute_sql`, `get_advisors`, etc.) to inspect schema/data rather than looking for local migration files.

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
Nearly all reads/writes go directly from the browser to Supabase (`supabase.from(...)`), authorized by Postgres RLS using the anon key (`src/lib/supabase.js`, HMR-safe singleton via `globalThis`). The only server-side code is `api/`, used exclusively where a secret is required:
- `api/create-checkout.js` — creates/upserts Stripe customer on `organizations`, creates a Checkout Session (14-day trial)
- `api/create-portal.js` — creates a Stripe Billing Portal session
- `api/invoices.js` — lists Stripe invoices for a customer
- `api/webhook.js` — Stripe webhook → mutates `organization_modules` (see above)
- `api/rep/create-promo-code.js` — validates a Supabase JWT (`supabase.auth.getUser(token)`), requires role `sales_rep`/`super_admin`, creates a Stripe Coupon + Promotion Code, inserts into `rep_promo_codes` (rolls back the Stripe objects if the Supabase insert fails)

These functions use the Supabase **service-role** key (bypasses RLS) — never expose that key or `STRIPE_SECRET_KEY` to client-side code.

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
