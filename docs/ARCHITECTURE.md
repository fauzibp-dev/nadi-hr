# Architecture

## Runtime

```text
Employee / HR browser
        │
        ▼
Next.js on Vercel
  ├─ Server Components
  ├─ Route Handlers
  └─ Supabase SSR session cookies
        │
        ▼
Supabase
  ├─ Auth
  ├─ PostgreSQL + PostGIS
  ├─ Row Level Security
  ├─ Storage (private)
  └─ Realtime
```

GitHub is the source of truth. Vercel imports the GitHub repo and produces Preview Deployments for branches and Production Deployments for the production branch.

## Tenant boundary

Every customer-owned operational table carries `company_id`. RLS derives the active user's company from `profiles` and blocks cross-company reads. Platform admins have a separate role for SaaS operations.

Do not implement tenant security by merely filtering `company_id` in JavaScript. Filters improve UX; RLS is the data boundary.

## Attendance write path

```text
1. Employee is authenticated.
2. Browser requests geolocation with high accuracy.
3. UI shows only a preview distance.
4. Browser obtains camera evidence + random challenge.
5. POST /api/attendance/submit.
6. Server validates Auth user and employee mapping.
7. Server uploads evidence to private Supabase Storage.
8. Optional face/liveness webhook verifies the evidence.
9. Authenticated RPC submit_attendance_event runs in Postgres.
10. RPC chooses nearest eligible office/planned location.
11. PostGIS calculates the final distance.
12. RPC checks GPS accuracy, radius, duplicate window and shift lateness.
13. Attendance event + daily rollup are stored with server time.
14. Risk/anomaly trigger may flag impossible travel.
15. HR receives Realtime event updates.
```

## Why client distance is not trusted

The client may calculate distance for immediate feedback, but the database recreates the geography point and calculates `ST_Distance` against the office point. The client cannot simply edit JavaScript to mark itself “inside”.

This still does not make browser GPS impossible to spoof. Pure-web security should use layered evidence and review rather than marketing a false 100% anti-spoof guarantee.

## Attendance event model

The system stores events (`check_in`, `break_start`, `break_end`, `check_out`, overtime, WFH, field) separately from the daily rollup. This keeps the raw timeline append-oriented and lets reporting logic evolve.

## Shift dates

A schedule is anchored to a `work_date`. A shift may end earlier than its start time (for example 22:00 → 06:00), which represents a shift crossing midnight. Production calculations should always use the company's timezone and schedule anchor date.
