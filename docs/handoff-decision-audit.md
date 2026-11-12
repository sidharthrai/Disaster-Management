# Handoff decision audit

This document records the earlier design discussion, not current completion status. See [the original-handoff coverage audit](original-handoff-coverage.md) for the later code comparison. In particular, the original section 13 explicitly requests a normalized relational model; the current ID-plus-JSON storage is a deviation, even though the precise proposed fields can be adapted.

The attached handoff contains proposed decisions, not evidence that the user made each decision. This audit separates explicit conversation decisions from handoff assumptions. The user has authorized implementation, but has also asked to see the handoff's other choices before they become embedded in the application.

## Explicitly confirmed in conversation

- Everyday mutual aid builds a community network that is already present during emergencies.
- Ordinary requests connect members directly; coordinators intervene when needed.
- A connection requires mutual agreement. Helpers may express interest and a requester selects one; a requester-initiated invitation needs the helper's acceptance.
- Before connecting, other members see a safe summary, general neighborhood, and requested timeframe. Original transcripts, exact addresses, contact details, and sensitive content remain private.
- Connected participants can coordinate privately. Restricted cases remain outside public browsing.
- The user and assistant are building the project together. Do not initialize Git, stage, or commit.
- Implement the app rather than stopping at a plan or static UI; include tests, startup instructions, documentation, and a short repeatable demonstration.
- Next.js, strict TypeScript, separated business logic, validated AI output, explainable matching, no-key operation, and labeled simulations are explicit requirements in the user's implementation request.
- Local LLMs such as Ollama are welcome alongside optional hosted APIs and the deterministic fallback. A particular local model, provider priority, and timeout have not been selected by the user.

## Product assumptions made by the handoff

| Area | Handoff proposal | Decision status and recommendation |
| --- | --- | --- |
| Daily help categories | Groceries, food, transport, supplies, clothing, household items, outreach, translation, volunteering, events, and non-emergency shelter assistance. | Proposed category set. Start with a small editable set covering the demo; do not interpret every example as a bespoke workflow. |
| Roles | Resident, volunteer, coordinator, organization, administrator. | Proposed role model. A member should be able to request and offer help; coordinator privileges are additional permissions. Organizations can supply resources without needing a full organization administration product in P0. |
| Coordinator centrality | Coordinators approve matches, assign volunteers, review urgency, and confirm outcomes. | Superseded for ordinary connections by the user's direct-connection decision. Coordinator intervention remains available for stalled and restricted cases; sensitive interventions require authorized review. |
| Request ownership | Each request has one requester and an optional responsible coordinator. | Proposed model. Distinguish the person submitting from any person they are helping, and avoid publishing another person's private information. |
| Matching | Capability, service area, availability, verification, and capacity determine recommendations. | Approved matching feature; the exact rules are implementation proposals. Hard eligibility constraints must precede scores. |
| Matching weights | Capability 40%, area 25%, availability 20%, verification 15%. | Explicitly illustrative, not validated or user-approved. Use understandable factors without implying scientific precision. |
| Commitment capacity | Reject overlapping volunteer tasks and unavailable offers; resources have finite capacity. | Proposed behavior. Recommend one active time-conflicting commitment per helper and transactional resource reservations. |
| Multi-need requests | One primary category plus secondary categories, with offers or resources linked to a request. | Unresolved product behavior: whether different helpers may fulfill separate portions. Recommend one active helper per request for P0, with the helper's scope stated and remaining needs kept visible; do not claim the whole request is fulfilled from one partial task. |
| Lifecycle | Submitted, Needs Review, Open, Match Suggested, Assigned, In Progress, Awaiting Confirmation, Resolved, Closed, Cancelled. | Suggested states, not an approved state machine. Recommend fewer member-facing stages: Open, Connected, In Progress, Awaiting Confirmation, Resolved, Cancelled. Review, overdue, and suggested matches can be separate conditions. |
| Confirmation | Helper reports delivery; requester or authorized coordinator confirms the outcome. | Feature approved; coordinator override policy remains a proposal. Recommend requester confirmation normally, coordinator resolution only with a documented reason and outcome. |
| Unsuccessful outcomes | Withdrawn, unable to complete, and referred elsewhere may close a case. | Proposed outcomes. Recommend keeping these distinct from confirmed help in all metrics. A referral alone does not prove help was delivered. |
| Missing requester response | The case remains awaiting confirmation and gets follow-up attention. | Handoff gives no deadline or final closure policy. Recommend never automatically counting silence as success. |
| Follow-up | Flag unassigned cases, missing acknowledgments, overdue work, cancellations, absent confirmation, and urgent cases without review. | Feature approved; exact intervals and escalation recipients are unspecified. Recommend configurable demo intervals and human-review flags rather than automatic real-world escalation. |
| Notifications | In-app or simulated notifications; no claims of real SMS/email/emergency alerts. | Proposed simulation boundary consistent with the user's no-key demo requirements. Recommend explicit in-app notices and no hidden background delivery claims. |
| Duplicate reports | Similar text, categories, area, contact identifiers, and submission times produce review flags. | P1 heuristic; never auto-merge. Contact data should not be exposed to justify duplicate suggestions. |
| Emergency activation | Coordinators toggle a simulated event that changes priorities, categories, banners, resources, and statistics. | Proposed authority and event scope. Recommend a community-scoped event controlled by coordinators, with restricted-case protections active even while Emergency Mode is off. |
| Emergency assistance | Show partners, request approval for referrals, track assignments, and confirm outcomes. | Demonstration only. No real rescue dispatch, guaranteed capacity, or implied verified real-world response. |
| Missing persons | Optional simulated private reporting and referral; no public directory, facial recognition, or automated person matches. | Conditional feature in the handoff, not a required full missing-person product. Recommend private intake and coordinator referral only. |
| Medical content | Coordinate access to qualified assistance, without diagnosis, treatment recommendations, medication allocation, or public disclosure. | Protection is an explicit user requirement. Recommend restricted review/referral, not a volunteer medical dispatch workflow. |
| Verification | Demo, unverified, verified volunteer, verified organization statuses. | Proposed terminology. Synthetic verification must be visibly labeled; no actual identity or qualification verification is included. |
| Communication | Safe communication is mentioned, but chat is optional P2. | Private coordination is now approved. Recommend a private case thread for connected participants with access-controlled storage; public comment threads are not implied. |
| Moderation | Basic reporting and moderation for spam, abuse, impersonation, and privacy disclosure. | Mentioned outside the P0 list; enforcement rules unspecified. Recommend a report action, coordinator review, and hiding unsafe public summaries. |
| Public content | Community feed and listings, with no exact addresses or private details. | The user approved safe summaries for other members; anonymous internet visibility has not been approved. Recommend member-scoped browsing, not public searchable case pages. |

## Engineering assumptions made by the handoff

| Area | Handoff proposal | Decision status and recommendation |
| --- | --- | --- |
| Frontend | Next.js App Router, React, strict TypeScript, Tailwind CSS, shadcn/ui, Lucide. | Next.js and TypeScript are explicitly requested. App Router and styling/component/icon choices are builder choices, not product decisions the user needs to make. |
| Backend | Next.js Route Handlers or Server Actions, TypeScript services, Zod validation. | Recommended defaults, not a finalized backend contract. Recommend server-side validation and authorization with domain services shared by all routes. |
| Persistence | Prisma and SQLite locally; PostgreSQL if hosting needs it. | Suggested setup. SQLite is suitable for a single-machine demo. A public serverless deployment requires a deliberate persistence change or durable database host. |
| Data model | Thirteen proposed entities: User, Community, HelpRequest, HelpOffer, Organization, Resource, MatchSuggestion, Assignment, CaseEvent, IntakeRecord, FollowUpFlag, Notification. | Illustrative entities and fields, not a mandatory schema. Adapt them to mutual consent, private coordination, concurrency, and privacy requirements. |
| Identity | Fictional accounts and a demo role switcher, without production authentication. | Demo default in the handoff. Server permissions must still be enforced, but a switcher intentionally lets the presenter impersonate synthetic accounts; it cannot protect real data or constitute production authentication. |
| AI provider | Hosted model when configured, deterministic fallback otherwise. | Now extended by the user's local-LLM request. Recommend explicit provider selection: fallback, Ollama, or hosted; unavailable or malformed providers fall back safely. |
| AI authority | Provisional extraction, summaries, suggestions, missing-detail detection; no privileged mutations. | Consistent with the user's validation and safety requirements. Recommend deterministic authorization, matching eligibility, lifecycle transitions, and safety restrictions regardless of provider output. |
| AI extraction schema | Category, summary, area, affected people, urgency suggestion/reason, capabilities, missing information, safety flags, next action, confidence. | Proposed schema. Unknowns must remain unknown; confidence should not be presented as a calibrated probability. |
| Local model choice | Not covered by the handoff. | Builder default should be configurable; do not download a large model or assume GPU capacity without discussing it. Ollama configuration must stay server-side. |
| Intake sources | Website text plus pasted transcripts, simulated SMS, and simulated social posts. | Transcript intake is explicitly requested. Source labels are provenance, not actual telecom, speech transcription, or social integrations. |
| Seed data | Riverton, around 30 residents, 15 volunteers, 4–6 organizations, 20–30 requests, 15–20 offers. | Illustrative counts, not acceptance criteria. Recommend a repeatable seeded dataset with successful, unmatched, restricted, overdue, and unconfirmed cases. |
| Demo clock | Advance fictional time or explicitly run follow-up checks. | Proposed simulation mechanism. Recommend visible simulated time, isolated from real system time. |
| Metrics | Database-derived counts, confirmed outcomes, assignment timing, open/unassigned/overdue requests, availability. | No hard-coded impact claims. Keep synthetic metrics labeled and unsuccessful closure separate from success. |
| Deployment | Local startup mandatory; hosting choice deferred to persistence needs. | Public deployment and production readiness are not part of an established decision. Recommend completing and testing the local app first. |
| Maps and geolocation | Optional maps and general areas; no precise GPS collection by default. | Recommend no map dependency for P0 and no automatic geolocation permission request. |
| Tests | Domain, provider fallback, lifecycle, matching, follow-up, permissions, plus browser smoke tests where practical. | Explicit user deliverable. Test behavior through server boundaries as well as domain services. |

## Priority inconsistencies to resolve in implementation

- A request timeline is P1 but activity history is essential to explaining P0 lifecycle transitions. Include the minimal timeline in P0.
- A volunteer dashboard is P1, but the helper needs a way to accept, start, cancel, and report completion in P0. Include those actions in member activity without requiring a separate full dashboard.
- Resource inventory is P1, while resource matching and Emergency Mode are P0. Include the minimal availability/capacity view needed by those workflows.
- Multi-channel intake is P1, but pasted transcript intake was explicitly requested. Include pasted transcripts; treat other channels as clearly labeled simulations.
- The document calls for simulated identities that cannot bypass authorization. Demo impersonation necessarily changes effective identity; enforce permissions for that identity and label the environment synthetic-only instead of claiming production isolation.
- Natural-language private content cannot be made safe by an AI schema alone. Public display needs a conservative separate summary and private raw storage; restricted content must fail closed regardless of external model classification.

## Proposed defaults requiring particular visibility

These recommendations are not recorded as user approvals: one active helper per P0 request; simplified lifecycle labels; coordinator resolution with a recorded reason; configurable follow-up intervals without automatic success; coordinator-controlled community emergency events; a local synthetic-only demo; member-scoped safe listings; and a private case thread after mutual agreement.

Other choices, such as folder structure, library APIs, exact schema names, and test runner configuration, can be made by the assistant within these boundaries without asking the user to design the implementation.
