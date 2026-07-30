# Security & privacy checklist

## Non-negotiable

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
- Production must set `NEXT_PUBLIC_DEMO_MODE=false`.
- Use HTTPS only.
- Keep RLS enabled on every tenant table.
- Store evidence/documents in private buckets.
- Use server time for official attendance timestamps.
- Use server-side distance and policy decisions.
- Log manual attendance corrections instead of deleting the original history.
- Treat face images, embeddings, and precise location as sensitive data.

## GPS limitations

A web browser reports the coordinates it receives from the operating system. A rooted/emulated/spoofed device can potentially falsify them. Server-side PostGIS prevents a user from changing only the front-end distance calculation, but it cannot prove the operating system coordinates are physically true.

Mitigation in this codebase:

- accuracy threshold;
- geofence radius;
- server time;
- duplicate event window;
- camera evidence;
- face/liveness provider adapter;
- device records;
- anomaly flags;
- impossible-travel review;
- append-oriented audit.

For stronger device attestation, a native app with platform integrity APIs is a later product tier.

## Face and liveness

Default `FACE_VERIFICATION_MODE=evidence` is intentionally conservative. It records a live camera capture and challenge, but it does not claim biometric identity proof.

When a tested verifier exists:

```env
FACE_VERIFICATION_MODE=webhook
FACE_VERIFICATION_WEBHOOK_URL=https://...
FACE_VERIFICATION_WEBHOOK_SECRET=...
```

The webhook must return HTTP 2xx and may return:

```json
{ "status": "verified", "score": 0.94 }
```

Then set company `attendance_policy.require_face_provider=true` only after end-to-end testing.

## Recommended operational controls

- MFA for owner/HR/platform roles.
- Short process for revoking a lost device.
- Separate staging Supabase and production Supabase.
- Database backups appropriate to plan/SLA.
- Regular RLS regression tests with users from two different companies.
- Rate limiting/WAF for public endpoints if abuse appears.
- Retention jobs for old attendance evidence.
- Security review before connecting payroll/payment providers.


## Service-only attendance write

`submit_attendance_event` is executable by the database `service_role` only. An authenticated browser cannot call it directly to forge `face_status`, `device_verified`, or evidence metadata. The Next.js route authenticates the user first and supplies the resolved user id to the service-only RPC.

## Browser device binding

The browser stores a random device token. The server hashes it with `DEVICE_PEPPER` and stores only the hash. New devices are untrusted by default; only tenant HR/owner can mark them trusted. This is a useful anti-sharing signal but is not equivalent to Android Play Integrity, Apple App Attest, TPM, or WebAuthn hardware attestation.

## Cron

Maintenance is protected by `CRON_SECRET`; keep it server-only.
