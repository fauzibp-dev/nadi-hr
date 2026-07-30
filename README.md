# Nadi HR Attendance SaaS

Modern multi-tenant HR attendance platform built for mobile employee workflows and operational HR teams.

## Stack

- Next.js 16.2.11 + React 19.2 + TypeScript
- Tailwind CSS 4 + custom product design system
- Supabase Auth + PostgreSQL + PostGIS + Storage + Realtime
- Vercel deployment from GitHub
- Server-authoritative geofence attendance

## What is included

The repository contains the full product architecture and UI surface discussed for Employee, HR/Manager, and Platform Admin. The most security-sensitive core path is implemented end-to-end: Auth plumbing, tenant context, attendance geolocation + camera evidence, server upload, service-role-only PostGIS attendance RPC, attendance rollup, risk flags, browser device binding/trust, private storage, multi-step request approval + approved-request effects, tenant creation, invitation endpoint, CSV reporting, scheduled maintenance, and multi-tenant RLS.

The broad HR/SaaS modules are represented by schema + UI + policy-ready tables. Some integrations intentionally require a real provider before production use, especially biometric face/liveness verification and automated payment processing. The app never pretends that a selfie alone is strong biometric verification.

See `docs/FEATURES.md` for the complete capability map and `docs/DEPLOYMENT.md` for setup.

## Quick preview without Supabase

```bash
cp .env.example .env.local
# Keep NEXT_PUBLIC_DEMO_MODE=true
npm install
npm run dev
```

Open:

- `/employee` — employee experience
- `/admin` — HR/manager command center
- `/platform` — SaaS platform console

## Production setup

Set `NEXT_PUBLIC_DEMO_MODE=false`, create Supabase, apply migrations, configure Auth, then add Vercel environment variables. Detailed instructions are in `docs/DEPLOYMENT.md`.

## Important production notes

1. Geolocation from a browser can be spoofed. This project makes it harder to abuse by validating distance and GPS accuracy server-side, using server time, event duplicate windows, evidence, device/risk signals, and anomaly review. Pure web can never honestly guarantee 100% anti-spoof GPS.
2. `FACE_VERIFICATION_MODE=evidence` stores a live camera capture and challenge evidence only. It does not claim face identity/liveness verification. For production biometric verification, connect a provider through the included webhook adapter and set company policy `require_face_provider=true` after testing.
3. `SUPABASE_SERVICE_ROLE_KEY`, `DEVICE_PEPPER`, and `CRON_SECRET` are server-only. Never expose it with a `NEXT_PUBLIC_` prefix.
4. Biometric and location data require a privacy policy, retention policy, access control, employee notice/consent where applicable, and legal review for the customer's jurisdiction.

## Repository layout

```text
src/app/                 Next.js routes + API handlers
src/components/          Product UI + attendance flow
src/lib/                 Supabase clients, context, demo data
supabase/migrations/     Versioned database schema/RLS/functions
supabase/seed.sql        Optional development seed
scripts/                 First-admin/demo bootstrap helpers
docs/                    Deployment, architecture, security, tests
```

## Main commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm start
```

## Branding

`Nadi` is only a working product name. Change the brand in `src/components/app-shell.tsx`, `src/app/page.tsx`, metadata in `src/app/layout.tsx`, and CSS variables in `src/app/globals.css`.
