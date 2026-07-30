# Feature map — 60+ capabilities

Legend:

- **Core wired**: current bundle includes data model and a working server/client path.
- **Model + UI**: database and product UI are prepared; complete the final CRUD/automation for your business rules.
- **Integration-ready**: adapter/schema exists, but production requires external credentials/provider or operational decision.

## Employee experience

1. Today dashboard — **Model + UI**
2. Check-in — **Core wired**
3. Check-out event model — **Core wired**
4. Break start/end — **Core wired event model**
5. Overtime start/end — **Core wired event model**
6. Browser geolocation — **Core wired**
7. Office geofence — **Core wired**
8. GPS accuracy threshold — **Core wired**
9. Server-side distance via PostGIS — **Core wired**
10. Server-authoritative time — **Core wired**
11. Camera selfie evidence — **Core wired**
12. Random liveness challenge evidence — **Core wired evidence-only**
13. Face/liveness provider adapter — **Integration-ready**
14. Device trust records — **Model + UI**
15. Attendance history — **Model + UI**
16. Weekly/monthly schedule — **Model + UI**
17. Leave request — **Core request endpoint + UI**
18. Sick request — **Core request endpoint + UI**
19. Permission request — **Core request endpoint + UI**
20. Overtime request — **Core request endpoint + UI**
21. Attendance correction — **Schema + UI + audit model**
22. WFH request/mode — **Schema + UI**
23. Field-work attendance — **Core geofence function supports planned location**
24. Business trip — **Schema + attendance function support**
25. Shift swap — **Schema + UI**
26. Leave balance — **Schema + UI**
27. Personal documents — **Schema + UI**
28. Notifications — **Schema + Realtime-ready**
29. Announcements & acknowledgement — **Schema + UI**
30. Profile & device management — **Schema + UI**
31. Face reset workflow — **Schema + UI**

## HR / manager

32. HR dashboard — **Model + UI**
33. Live attendance — **Realtime table + UI**
34. Employee directory — **Schema + UI**
35. Employee import-ready workflow — **UI/architecture**
36. Employment status — **Schema**
37. Branch management — **Schema + UI**
38. Department management — **Schema + UI**
39. Team/reporting line — **Schema + UI**
40. Onboarding checklist — **Schema + UI surface**
41. Offboarding checklist — **Schema + UI surface**
42. Shift templates — **Schema + UI**
43. Schedule assignment — **Schema + UI**
44. Night shift support — **Schema supports end time crossing day boundary**
45. Split-shift-ready event model — **Architecture**
46. Approval workflow — **Schema + decision endpoint**
47. Multi-step approval — **Schema**
48. Leave types/config — **Schema**
49. Leave accrual policy storage — **Schema**
50. Overtime actual vs approved — **Schema + report UI**
51. Office/location management — **Schema + UI**
52. Multiple eligible offices — **Core attendance query**
53. Dynamic field location — **Core attendance function**
54. Holiday management — **Schema**
55. Attendance correction audit — **Schema + audit trigger**
56. Evidence review — **Schema + UI**
57. Risk score — **Core attendance function**
58. Near-boundary GPS flags — **Core attendance function**
59. Impossible-travel flag — **Core DB trigger**
60. Browser device binding + HR trust — **Core wired; not hardware attestation**
61. Reports — **Schema/UI**
62. CSV attendance export — **Core wired**
63. Payroll preparation — **View/schema + UI**
64. Attendance analytics — **Schema/UI**
65. Branch comparison — **UI/report architecture**
66. Document permissions — **RLS + schema**
67. Retention policy — **Company config + UI**
68. Audit logs — **Core trigger + UI**
69. API keys — **Schema**
70. Outbound webhooks — **Schema/integration-ready**
71. Workspace branding — **Company fields + design system**
72. Roles: owner/HR/manager/supervisor/employee — **Core RLS architecture**

## SaaS platform

73. Multi-company tenant separation — **Core wired**
74. Platform admin — **Core auth role + UI**
75. Tenant creation API — **Core wired**
76. Employee invitation API — **Core wired**
77. Plans — **Schema + UI**
78. Subscriptions — **Schema + UI**
79. Trial period — **Schema + UI**
80. Past-due/suspension status — **Schema + UI**
81. Employee limits — **Invite-path enforcement wired**
82. Office limits — **Office RPC enforcement wired**
83. Feature flags — **Schema + UI**
84. Tenant feature overrides — **Schema + UI**
85. Usage metering — **Schema + UI + scheduled aggregation**
86. Support tickets — **Schema + UI**
87. Platform audit — **Schema + UI**
88. System events/health — **Schema + health endpoint + UI**
89. API health endpoint — **Core wired**
90. Payment gateway — **Integration-ready, intentionally not hardcoded**
91. Custom domain — **Architecture-ready, Vercel/domain operation required**
92. Multi-language settings — **Company locale + UI setting**
93. Biometric/location consent records — **Schema + RLS**
94. Privacy access/deletion requests — **Schema + RLS**
95. Data retention configuration — **Company policy + UI architecture**
96. Custom-domain metadata — **Schema + deployment operation**
97. Auto absent finalization — **Scheduled maintenance wired**
98. Multi-step approval routing — **Workflow engine wired**
99. Approved-request side effects — **Leave/overtime/WFH/trip/correction/swap engine**

## Why some items are not called “fully production wired”

A real biometric verifier, billing gateway, scheduled usage aggregation, messaging provider, and customer-specific payroll integration cannot be honestly marked production-complete without choosing credentials/provider/business rules. Their seams are prepared so the core architecture does not need to be rewritten later.
