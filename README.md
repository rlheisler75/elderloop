# ElderLoop

Senior Living Management Platform — built with React, Vite, Supabase, and Tailwind CSS. 

## Tech Stack
- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Hosting**: Vercel
- **Domain**: elderloop.xyz

## Project Structure
```
src/
├── components/
│   ├── layout/     # Sidebar, Layout wrapper
│   └── ui/         # Reusable UI components
├── context/
│   └── AuthContext.jsx   # Auth, profile, org, modules
├── hooks/          # Custom React hooks
├── lib/
│   └── supabase.js # Supabase client
└── pages/
    ├── auth/       # Login
    ├── admin/      # Admin panel
    ├── dashboard/  # Main dashboard
    ├── communication/
    ├── workorders/
    ├── dietary/
    └── housekeeping/
```

## Modules
| Module | Key | Description |
|--------|-----|-------------|
| Communication | `communication` | Digital signage, announcements, chapel schedule |
| Work Orders | `work_orders` | Maintenance requests, scheduling, inspections |
| Dietary | `dietary` | Meal plans, dietary restrictions, allergies |
| Housekeeping | `housekeeping` | Room schedules, task tracking, inspections |

## Getting Started

```bash
cp .env.example .env.local
# Add your Supabase URL and anon key

npm install
npm run dev
```

## Deployment
Deploy to Vercel and set environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
