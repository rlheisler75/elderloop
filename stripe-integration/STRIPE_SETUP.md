# ElderLoop — Stripe Integration Setup Guide

## Step 1: Create your Stripe account
1. Go to https://stripe.com and sign up
2. Complete the business verification (Loopware Solutions LLC, EIN, bank account)
3. Switch to LIVE mode when ready — use TEST mode for now

## Step 2: Create Products & Prices in Stripe
Go to Stripe Dashboard → Products → Add Product

Create three products:

**Starter — $199/mo**
- Name: ElderLoop Starter
- Price: $199.00 / month / recurring
- Copy the Price ID (starts with price_...)

**Community — $349/mo**
- Name: ElderLoop Community
- Price: $349.00 / month / recurring
- Copy the Price ID

**Enterprise — Custom**
- Handle manually, no Stripe price needed yet

## Step 3: Set environment variables

### In Vercel Dashboard → Your Project → Settings → Environment Variables:
```
STRIPE_SECRET_KEY=sk_live_...          (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_...        (from step 4 below)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_COMMUNITY=price_...
NEXT_PUBLIC_APP_URL=https://elderloop.xyz
SUPABASE_URL=https://zrijcrzlyndnudflhbls.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...          (from Supabase → Settings → API → service_role key)
```

### In your local .env.local file (for testing):
```
VITE_STRIPE_PRICE_STARTER=price_...
VITE_STRIPE_PRICE_COMMUNITY=price_...
```

## Step 4: Set up the Stripe webhook
1. Go to Stripe Dashboard → Developers → Webhooks → Add Endpoint
2. Endpoint URL: https://elderloop.xyz/api/webhook
3. Select these events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
   - invoice.payment_succeeded
4. Copy the Signing Secret (whsec_...) → add as STRIPE_WEBHOOK_SECRET in Vercel

## Step 5: Enable the Stripe billing portal
1. Go to Stripe Dashboard → Settings → Billing → Customer Portal
2. Enable it and configure:
   - Allow customers to cancel subscriptions: YES
   - Allow customers to update payment methods: YES
   - Allow customers to switch plans: YES (add your two prices)
3. Save

## Step 6: Add npm package
In your project root run:
```
npm install stripe
```

## Step 7: Wire BillingTab into AdminPanel
In your AdminPanel.jsx, add a Billing tab:

```jsx
import BillingTab from './BillingTab'

// Add to your tabs array:
{ key: 'billing', label: 'Billing', icon: CreditCard }

// Add to your tab content:
{tab === 'billing' && <BillingTab />}
```

And add CreditCard to your lucide import.

## File placement
```
your-project/
├── api/
│   ├── create-checkout.js   ← NEW
│   ├── create-portal.js     ← NEW
│   ├── invoices.js          ← NEW
│   └── webhook.js           ← NEW
└── src/
    └── pages/
        └── admin/
            └── BillingTab.jsx  ← NEW
```

## Testing
Use Stripe test card: 4242 4242 4242 4242 / any future date / any CVC
Failed payment: 4000 0000 0000 0341

## Founding customer (Maranatha Village)
Their org has billing_status = 'pilot' — BillingTab shows a purple "Pilot" badge
and no subscription prompts. When you're ready to convert them to paid,
either run checkout on their behalf or set their plan manually in Supabase.
