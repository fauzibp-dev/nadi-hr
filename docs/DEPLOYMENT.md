# Deployment tutorial — Supabase → GitHub → Vercel

This guide assumes a clean Supabase project and a new GitHub repository.

## 0. Requirements

Install locally:

- Node.js 22 LTS or newer
- Git
- Supabase CLI
- GitHub account
- Vercel account
- Supabase account

From the project directory:

```bash
cp .env.example .env.local
npm install
```

For the first UI preview you may leave:

```env
NEXT_PUBLIC_DEMO_MODE=true
```

Run:

```bash
npm run dev
```

Then open `http://localhost:3000`.

---

## 1. Create the Supabase project

1. Open Supabase Dashboard.
2. Create a new project.
3. Save the database password securely.
4. Wait until the project is healthy.
5. Open **Project Settings / API** or the project **Connect** dialog.
6. Copy:
   - Project URL
   - Publishable key
   - Service role/secret key for server-side administration only

Do not put the service key in GitHub source files.

### Configure local env

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
DEVICE_PEPPER=generate-a-long-random-secret
CRON_SECRET=generate-another-long-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=false
FACE_VERIFICATION_MODE=evidence
```

---

## 2. Apply database migrations

The SQL migrations live in `supabase/migrations/`.

The repository already includes `supabase/config.toml`, migrations, and seed configuration. If your installed CLI warns that local defaults differ from your hosted project, review the config diff before changing it.

Authenticate:

```bash
supabase login
```

Link your remote project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

For a brand-new Supabase project, preview the migrations:

```bash
supabase db push --dry-run
```

Then apply them:

```bash
supabase db push
```

### Optional demo seed

For a staging/dev project only:

```bash
supabase db push --include-seed
```

Do **not** use seed data on a production database.

### Alternative: SQL Editor

If you cannot use the CLI, run every timestamped migration in `supabase/migrations/` sequentially, oldest first in Supabase SQL Editor. CLI migrations are preferred because the schema history stays in version control.

---

## 3. Create the first Platform Admin

1. Supabase Dashboard → Authentication → Users.
2. Create a user with your real admin email/password.
3. Open `scripts/bootstrap-superadmin.sql`.
4. Replace `YOUR_EMAIL@example.com` with that email.
5. Run it in SQL Editor.
6. Confirm the query result shows `platform_admin`.

You can now log in at `/login` and open `/platform`.

This manual bootstrap is only needed for the first platform admin. Afterwards tenant/user creation can be driven by the app/API.

---

## 4. Create the first company

Two options.

### Via API/UI path

Login as Platform Admin, then use the platform company flow when you connect the final create-company form to `/api/platform/companies`.

The API expects a body similar to:

```json
{
  "name": "PT Customer Pertama",
  "slug": "customer-pertama",
  "timezone": "Asia/Jakarta",
  "plan": "starter"
}
```

### Via seed for staging

`supabase/seed.sql` creates `PT Ruang Tumbuh`, Solo HQ, a Regular shift, leave type, plans, and a trial subscription.

---

## 5. Invite owner/HR/employee accounts

The server route `/api/admin/invite` uses Supabase Auth Admin and therefore requires `SUPABASE_SERVICE_ROLE_KEY` on the server.

For a company employee example:

```json
{
  "companyId": "COMPANY_UUID",
  "email": "andi@example.com",
  "fullName": "Andi Pratama",
  "role": "employee",
  "employeeNumber": "EMP-0012"
}
```

For HR:

```json
{
  "companyId": "COMPANY_UUID",
  "email": "hr@example.com",
  "fullName": "Maya Putri",
  "role": "hr"
}
```

Supabase sends the invitation email. The redirect target is built from `NEXT_PUBLIC_APP_URL`.

Before sending production invitations, set your production Site URL/Redirect URLs in Supabase Auth settings.

---

## 6. Office setup

Create an office with:

- name;
- address;
- latitude/longitude converted to PostGIS geography;
- radius, e.g. 50 m;
- max GPS accuracy, e.g. 30 m;
- timezone.

The example seed uses:

```text
latitude  -7.5666
longitude 110.8167
radius    50 m
accuracy  30 m
```

Assign each employee to one or more eligible offices using `employee_offices`.

The final attendance decision is **not** based on the map UI. PostgreSQL/PostGIS calculates the distance.

---

## 7. Face/liveness mode

### Development / first pilot

```env
FACE_VERIFICATION_MODE=evidence
```

The app captures camera evidence and a random action prompt. Events are normally marked for review because the evidence has not been verified by a biometric engine.

### Production verifier

Configure:

```env
FACE_VERIFICATION_MODE=webhook
FACE_VERIFICATION_WEBHOOK_URL=https://your-verifier.example/verify
FACE_VERIFICATION_WEBHOOK_SECRET=very-long-secret
```

Expected success response:

```json
{
  "status": "verified",
  "score": 0.94
}
```

Only after the verifier is tested should you change a company's JSON policy to:

```json
{
  "require_face_provider": true
}
```

---

## 8. Test locally before GitHub

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

Test `/api/health`.

Test with at least two companies to verify RLS isolation.

---

## 9. Upload to GitHub

Create an empty repository on GitHub. Do not add a README or .gitignore there because this project already contains them.

From this project folder:

```bash
git init
git add -A
git commit -m "feat: initial Nadi HR attendance SaaS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Or with GitHub CLI:

```bash
gh repo create YOUR_REPOSITORY --private --source=. --remote=origin --push
```

Confirm `.env.local` is not present on GitHub.

Recommended branch strategy:

```text
main       production
develop    integration
feature/*  individual features
```

---

## 10. Import GitHub into Vercel

1. Vercel Dashboard → **Add New → Project**.
2. Select the GitHub repository.
3. Vercel should detect **Next.js** automatically.
4. Keep the standard build command (`next build`).
5. Before the first production deployment, add Environment Variables.

Required:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_DEMO_MODE=false
FACE_VERIFICATION_MODE
DEVICE_PEPPER
CRON_SECRET
```

Optional:

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
FACE_VERIFICATION_WEBHOOK_URL
FACE_VERIFICATION_WEBHOOK_SECRET
OUTBOUND_WEBHOOK_SECRET
```

For `NEXT_PUBLIC_APP_URL`, use the real production URL after you know it, for example:

```text
https://absen-perusahaan.vercel.app
```

Redeploy after changing environment variables.

---

## 11. Configure Supabase Auth production URLs

After Vercel gives you the production domain:

1. Supabase Dashboard → Authentication → URL Configuration.
2. Set Site URL to the production URL.
3. Add redirect URLs for production and local development, e.g.:

```text
https://your-domain.com/auth/callback
http://localhost:3000/auth/callback
```

If using Vercel preview deployments for Auth callbacks, define a safe preview strategy rather than wildcarding URLs carelessly.

---

## 12. Custom domain

In Vercel Project → Settings → Domains:

1. Add `absensi.customer.com` or your SaaS domain.
2. Configure DNS as instructed by Vercel.
3. Change `NEXT_PUBLIC_APP_URL`.
4. Update Supabase Auth Site URL/Redirect URLs.
5. Redeploy.

---


## 12A. Scheduled maintenance

`vercel.json` registers `/api/cron/maintenance` hourly. The route requires `Authorization: Bearer $CRON_SECRET`. It finalizes the previous local work date for scheduled employees, creates `absent` rows when no attendance/approved absence exists, refreshes usage counters, and suspends expired trials.

Set a strong `CRON_SECRET` in Vercel Production before launch. For a manual local test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/maintenance
```

If your Vercel plan has a different Cron frequency limit, change the schedule in `vercel.json`; the SQL maintenance function is idempotent for the same date.

## 13. Production switch checklist

Before a real employee uses it:

```text
[ ] NEXT_PUBLIC_DEMO_MODE=false
[ ] RLS migrations applied
[ ] private storage buckets exist
[ ] real company/office configured
[ ] correct radius tested on site
[ ] indoor GPS accuracy tested
[ ] employee office assignment exists
[ ] shifts/schedules exist
[ ] Supabase Auth production URLs correct
[ ] service role, DEVICE_PEPPER, CRON_SECRET only in Vercel server env
[ ] direct authenticated call to submit_attendance_event is denied
[ ] trusted-device approval tested if policy requires it
[ ] privacy/retention policy approved
[ ] face mode clearly defined (evidence or verifier)
[ ] npm typecheck/lint/build pass
[ ] Company A cannot read Company B data
[ ] mobile Chrome/Safari camera/location tested
[ ] backup/recovery plan defined
```

---

## 14. Development workflow after launch

Create a branch:

```bash
git checkout -b feature/new-feature
```

Commit and push:

```bash
git add -A
git commit -m "feat: new feature"
git push -u origin feature/new-feature
```

Vercel creates a Preview Deployment for the branch. Test it, then merge into `main`. A push/merge to the production branch triggers the Production Deployment.

Database changes should be new migration files, never edits made manually only in production.
