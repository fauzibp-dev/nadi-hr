# Testing checklist

## Before every production release

### Build

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

### Auth & tenant isolation

- User A from Company A cannot read Company B employee rows.
- Employee cannot open `/admin` in production.
- HR cannot open `/platform`.
- Platform admin can manage tenants but employee portal routing remains separated.
- Service role key never appears in browser source/network responses.

### Attendance

- Location permission denied gives a clear retry path.
- Accuracy above policy is rejected by DB.
- Location outside radius is rejected by DB.
- A modified client-side displayed distance does not bypass DB validation.
- Duplicate check-in inside the duplicate window is rejected.
- Check-in after grace calculates late minutes.
- WFH schedule does not require office geofence.
- Field schedule validates planned point/radius.
- Evidence file is private.
- Face-provider-required company rejects evidence-only verification.

### Workflow

- Employee can create own request but not another employee's request.
- Approval role can decide a request in its scope.
- Manual attendance correction retains the original snapshot/audit.

### SaaS

- Suspended company cannot record attendance (company status check).
- Tenant feature limits are enforced before commercial launch.
- Trial/past-due automation is tested before enabling automatic suspension.

## Suggested browser/device matrix

- Android Chrome current
- iPhone Safari current
- Desktop Chrome/Edge for HR
- Poor indoor GPS scenario
- Camera permission denied scenario
- Slow 3G/4G simulation


## Direct RPC bypass test

Using an authenticated anon/publishable-key client, attempt to call `submit_attendance_event`. It must fail permission checks because only `service_role` has execute permission. Then confirm `/api/attendance/submit` succeeds for a valid session.

## Device trust test

1. Check in from a new browser with `require_known_device=false`: event may be accepted but should carry an untrusted-device signal.
2. Set `require_known_device=true`: new untrusted device must be rejected.
3. HR trusts the device via the admin API, then retry and confirm it can pass the device gate.
4. Revoke the device and confirm it fails again.

## Maintenance test

Create yesterday's schedule with no attendance and no approved absence. Call `/api/cron/maintenance` with the correct secret. Confirm `attendance_daily.status='absent'` and a `usage_daily` row exists.
