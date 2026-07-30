# Engineering handover

## Scope delivered

This repository is a production-oriented foundation for the HR Attendance SaaS discussed in the project brief. It includes the complete multi-role UI surface, multi-tenant schema, RLS, attendance validation pipeline, HR workflows, SaaS platform model, privacy model, deployment guide, and provider seams.

## Fully wired critical paths

- Supabase SSR auth plumbing and role routing.
- Multi-tenant company/profile/employee model and Row Level Security.
- Office geofence with PostGIS distance and GPS-accuracy validation on the server.
- Server time, duplicate window, schedule/night-shift handling and `off` schedule rejection.
- One-time attendance challenges, camera evidence upload to private storage, and service-role-only attendance RPC (direct browser RPC bypass blocked).
- Optional external face/liveness verifier through a 60-second signed evidence URL.
- Attendance daily rollup, browser device binding/trust, and risk flags including impossible travel.
- Employee request creation, multi-step approval routing, and approved-request side effects.
- Platform tenant creation, plan limits, subscription update endpoint, admin employee invitations, health endpoint, attendance CSV export.
- Audit, subscription, plan, feature flag, scheduled usage/absence maintenance, support and compliance data model.

## Modeled/UI-complete but provider or business-rule dependent

Some capabilities deliberately remain integration-ready rather than falsely marked complete: payment gateway, actual biometric model/vendor, WhatsApp/email/push delivery, customer-specific payroll connectors, hardware-backed device attestation/passkeys, and custom-domain automation. The database/UI/policy seams for these are included.

## Validation performed in this handoff environment

- Parsed all JSON files.
- Static delimiter scan for all TS/TSX/MJS files.
- TypeScript compiler parse run across all TS/TSX. It produced only missing-module/missing-runtime-type diagnostics because dependencies could not be downloaded; no local syntax diagnostic remained.
- SQL migration delimiter sanity check.
- ZIP integrity test after packaging.

## Validation that still must be run after extracting

The npm registry available to this build environment returned package-not-found/network failures for Next.js, so `npm install`, `npm run lint`, `npm run typecheck`, and `npm run build` could not be executed with real dependencies here. Run all four on your workstation before production, then let Vercel build the same commit.

See `docs/DEPLOYMENT.md` and `docs/TESTING.md`.
