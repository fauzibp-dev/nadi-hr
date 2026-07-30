# Engineering notes for the future journal

Keep this file updated while building and testing. It will make the later academic journal evidence-based instead of retrospective guesswork.

Record:

- problem statement and target company size;
- why pure web was chosen instead of an IoT terminal;
- architecture decisions: Vercel, Next.js, Supabase, PostGIS, RLS;
- geofence formula/implementation and chosen radius;
- GPS accuracy observations at indoor/outdoor office points;
- face/liveness method actually used in production;
- security threat model: spoof GPS, replay, device sharing, photo/video spoofing;
- test cases and rejection/false-rejection results;
- usability findings from employees/HR;
- performance measurements;
- before/after administration time;
- limitations and ethical/privacy considerations.

Do not claim “anti fake GPS 100%” in the journal unless you can experimentally prove it under a defined threat model. The defensible claim is layered verification and server-authoritative geofence validation.
