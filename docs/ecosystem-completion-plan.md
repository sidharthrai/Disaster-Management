# Ecosystem completion plan

The user authorized implementation on November 11, 2026. This plan precedes application edits. It covers the three reproduced defects, coordinator operations, follow-up, emergency dashboard and a practical authenticated Node deployment foundation. Git remains off, including commands, worktrees, commits and pushes.

## Result and boundaries

Deliver a working everyday-help application with coordinator intervention, persistent follow-through and an operational simulated incident dashboard. Core workflows must work without AI credentials. An interchangeable intake provider supports deterministic rules, Ollama and hosted models. AI does not grant permissions, dispatch help or confirm delivery.

Real authentication is separate from fictional demo identities. This iteration prepares a single Node service with durable SQLite storage for deployment. Sites was explicitly inspected: no existing Sites were listed, its hosted sign-in is available only behind its platform boundary, and publication requires source Git synchronization and a Cloudflare Worker artifact. Native better-sqlite3 cannot be copied into that runtime. Under the no-Git instruction, do not register/publish a Site or invent standalone ChatGPT login. Preserve an adapter path for Sites plus D1 later. Use established Better Auth for the Node deployment path.

No public deployment, domain purchase, mail sending, model download, real emergency response or external communications occur in this iteration. Production email verification/recovery and operational/legal readiness are not implied by a working password login. Optional maps, translation, voice transcription, payments, national federation and rescue workflows remain later roadmap items.

## Sequence from smaller work to harder work

Safety defects take precedence over ease. Within their dependency constraints, implement the following units from simpler controls to more complex persistent workflows. Verify each unit before claiming completion.

| Stage | Work | Completion evidence |
| --- | --- | --- |
| 0 | Inspect source and both coverage reports, establish baseline, inspect Sites and current library docs, reconcile plans. | Existing 27 tests and strict typing pass. Read-only Terra backend/frontend proposals reconciled into this document. |
| 1 | Fix preview safety continuity, explicit reviewed timing, and persisted reviewed urgency. Improve intake display without a model dependency. | Regressions fail before fixes and pass afterward. Forged/stale/wrong-identity previews denied. Provider-only flags stay private. Tomorrow is not silently saved as Now. Reviewed urgency survives. |
| 2 | Coordinator filters and queue presets; explicit visible verification labels; persistent owner assignment, safe case corrections and private notes. Split compressed UI into readable modules. | Combined filters and same-community role checks. Notes and sensitive fields absent from unauthorized projections. Correction preserves existing commitments/history and cannot remove safety restrictions. |
| 3 | Configurable follow-up thresholds; persistent flag lifecycle; accepted-idle, urgent-no-owner/review, per-need cancellation and affected-resource-unavailable rules; acknowledgment, escalation and history. | Idempotent reconciliation, resolved-condition history, recurrence, same-community ownership, and unresolved conditions cannot be hidden by manual resolution. No automatic successful outcome. |
| 4 | In-app notification inbox and read state, deduplicated safe event/follow-up notifications. | Recipient isolation, no raw message leakage, no duplicate notifications on repeated evaluation. Clearly distinguish in-app records from external delivery. |
| 5 | Dedicated emergency dashboard, urgent-first combined queue, categories/progress/resource summaries, relevant guidance and same-network readiness. | Counts derive from state; incident-linked and all-community counts labeled accurately. Readiness per incident, resource reservations and multi-need outcome rules hold. Mobile/desktop workflows verified. |
| 6 | Complete practical resource catalog controls, organization profile/service descriptions, explicit future offer windows, richer source-grounded intake/count/mobility and private provenance where supported. | Owner-only updates, specialized resources cannot self-assert verified qualification, positive capacity with reservation guard, human-reviewed uncertain facts, no group-capacity assumption. |
| 7 | Better Auth account mode, sign-in/sign-up/sign-out, member mapping, privileged role provisioning outside browser, demo isolation; deployment environment checks, health endpoint, standalone/Docker packaging, backup guidance. | Real session round-trip, unauthenticated API denial, demo switch/reset/clock disabled in account mode, no role elevation from signup. Standalone serving and durable-data restart tested where tooling permits. Docker files supplied; do not claim image run without Docker. |
| 8 | Independent Sol/Terra reviews, targeted regression coverage, API/browser end-to-end checks, build/typecheck/tests, updated scope/demo/deployment docs. | Material review findings fixed. Claims distinguish source tests, live runtime verification and unavailable external integrations. |

Stages 1 through 5 are the committed core of this iteration. Stages 6 and 7 are also authorized implementation work, subject to preserving the core invariants. Optional enhancements that require new integrations or unsupported production assumptions remain explicit backlog, not silent promises of completeness.

## Shared contract for stage 1

- `/api/intake` requires the effective identity and accepts text plus source. It returns validated extraction, provider, warning and `previewToken`.
- A server-only preview signer binds actor ID, exact text hash, source, issued/expiry times and validated result. Use a stable configured secret in account mode; keyless local demo can use a process-local random signing secret. Expired or tampered previews fail closed and ask for analysis again. Do not log tokens or raw text.
- API create requires a valid bound preview. The domain service may retain an internal deterministic-only path for existing tests/scripts, but the public command route must not permit bypass by omitting a token. Update HTTP smoke callers to analyze before create.
- The service unions authenticated preview flags with independent screening and selected sensitive categories. Manual privacy only adds restrictions. Persist private intake provenance, suggested and selected urgency. Raw/extraction/private notes must never enter generic public spreads.
- `CreateRequestInput` adds optional token, reviewed urgency and explicit timing confirmation for compatibility with internal callers. HTTP create requires all reviewed fields. Any safety flag forces Critical review. Below that floor, selected enum urgency persists.
- Intake UI uses a client-safe `IntakePreview` response type. Show source timing explicitly, require a deliberate time-window choice and confirmation, and invalidate preview on text/source edits. Show summary, next action and uncertainty privately. Do not invent a precise calendar meaning for ambiguous timing.
- Source-grounded people count and mobility can be nullable. Do not use a guessed count to reserve resource units; units remain explicit under a separate policy.

## Coordinator, follow-up and emergency contracts

- Request adds `assignedCoordinatorId` nullable, `updatedAt`, optional incident ID, private intake provenance and a private note collection or separate note records. Use schema defaults/migration for legacy data. Public response construction uses an explicit allowlist.
- Commands expose coordinator assignment, correction and private note writing; exact field names are finalized in the backend contract file before UI consumption. Coordinator targets must be same-community coordinators. Role change is never a client command.
- Preserve need IDs and confirmed history. Reject removal/reclassification of a need with any historical commitment. A correction that makes a case sensitive revokes incompatible ordinary-helper access using the existing reservation-release policy. Do not republish a private case by editing categories.
- Follow-up rule settings default to the existing four-hour unassigned and two-hour pending/confirmation thresholds, plus an accepted-idle threshold. Bounded positive hours are coordinator-configurable. Account mode uses server time, not the demo clock.
- Persist follow-up episodes by request, kind and relevant need/commitment/resource identity. Acknowledgment does not clear an active predicate. Resolve only when the condition has gone; automatic resolution preserves history. Recurrence is a new episode or explicit reopening. Escalation records target, actor, note and time. Repeated evaluation is idempotent.
- Reconcile follow-up after state mutations and explicit evaluation, without recursive writes or duplicate notifications. In real-time account mode, evaluate on authenticated reads or explicit scheduled endpoint using a clear transaction boundary.
- Notifications are safe, recipient-specific in-app records with dedupe key and read time. Never persist raw case detail in a notification visible to someone who lost case access. Recheck request access on projection.
- Emergency view is coordinator-authorized. Label network-wide metrics as network-wide. New requests created during an incident may carry incident ID; do not retrospectively relabel all historic cases as incident cases. Queue sort is deterministic by urgency, overdue/age and ID. Never equate assignment with safety.
- Existing qualifications are synthetic. In account mode, signup never creates a verified organization or coordinator. Privileged account provisioning is an operator task.

## Ownership and parallel work

| Owner | Files | Order and restriction |
| --- | --- | --- |
| Terra domain/backend worker | `src/domain/**`, `src/server/repository.ts`, intake token/provider routes and command route, domain/provider/HTTP tests | Stage 1 first, then wait for root regression gate. Publish final contract before operations UI implementation. No session/auth/services/package files. |
| Terra frontend worker | `src/components/**` except new account form, `src/lib/api.ts`, workspace pages except layout, CSS | Stage 1 intake first. Then coordinator/follow-up/notifications/emergency/resource screens against backend contract. Do not edit domain schemas or session code. |
| Terra authentication/deployment worker | New auth config/identity helper, account form and account page/routes, session/services/workspace layout, account tests, deployment files | Start only after stage 1 gate and domain user contract is stable. Root owns package install and next.config/scripts. No writes to backend-owned domain/network/schema. |
| Root | This plan, shared contract reconciliation, dependency/config changes, integration, documentation and browser verification | Only root installs packages. Do not edit an agent-owned file until worker handoff or explicit ownership transfer. |
| Sol/Terra reviewers | Read-only findings | Review final artifact and fixes independently. |

Workers may investigate while dependencies settle but cannot implement before this plan exists. No worktrees because Git is prohibited. Keep write ownership disjoint, share exact interface changes promptly, and use the same implementation contract instead of inventing parallel shapes.

## Verification gates

Regression coverage includes all three original bugs, signed preview binding, provider failure, actor/community privacy, consent, historical need correction, private notes, coordinator ownership, follow-up lifecycle/recurrence/settings, unavailable accepted resources, notification dedupe/access revocation, incident summaries/readiness, migration of old records and real-account isolation.

Run focused checks after each meaningful unit, then full typecheck, Vitest and production build. Run live HTTP smoke and actual browser journeys covering requester/helper agreement, private messaging, delivery/confirmation, coordinator editing/ownership/flags/escalation, notifications, emergency resources and account login/logout. Save actual screenshots and record limits. Test standalone startup with persistent storage; test a container only if Docker is available.

## Later backlog after this iteration

Full normalized relational storage and PostgreSQL/D1 adapters; Sites runtime migration and publication once Git is authorized; verified organization onboarding; email verification/recovery and OAuth providers; multi-community administration/federation; recurring/multi-area offers; richer donation inventory; real-time chat; maps and multilingual/voice experiences; advanced analytics and preparedness forecasting. Existing provider abstraction permits adding supported model services without rewriting coordinator or lifecycle logic. No model becomes an operational authority.

## Independent plan review resolutions

Sol reviewed the plan before implementation. These rules resolve the material gaps it identified.

- A trusted preview is a server-only verified argument, never a deserialized client field. API requires token, reviewed urgency and timing confirmation. Token lifetime uses actual server time, not the demo clock. Analyze/create share trimmed text and the same source schema. Raise the bounded request size to 64 KiB to accommodate the signed bounded extraction and 6,000-character input, while retaining field limits.
- Audience matrix: raw intake/provenance and affected-person details are requester/coordinator only; coordinator notes, escalation notes and full follow-up audit history are coordinator only; agreed private threads are commitment participants plus coordinator; notifications are recipient-only with case access rechecked. Anonymous homepage and unrelated members get explicit safe projections only.
- Follow-up keys use request+kind+subject. Unassigned is per open need after configured request-age threshold. Pending agreement uses proposal creation time. Accepted-idle uses acceptedAt. Missing confirmation uses completedAt. Cancellation considers the latest cancelled connection on each still-open need, regardless of other needs' active commitments. Urgent-no-owner/review uses configured request-age threshold and clears only when both a same-community owner and a review exist. Critical restricted-unreviewed is immediate.
- Resource-loss flags affect accepted/in-progress commitments if the source is inactive, stale or lacks current incident readiness. Delivered commitments no longer depend on future source availability. Capacity equal to reservations is valid; do not treat a full resource as lost to its existing reservation.
- Acknowledgment leaves an active condition visible. Resolution requires the trigger gone, with reconciliation auto-resolving and preserving history. A new occurrence gets a fresh episode and notification. Escalation requires a same-community coordinator and private reason. Fixed rule implementation is centralized, not scattered in components.
- Corrections reset reviewedBy when categories, area, window or urgency materially change. Do not remove an existing safety restriction. Reject area/window changes while active commitments exist. Need category removal/reclassification with any commitment history is rejected; adding needs is allowed. Record a private correction note and a safe generic timeline event.
- Freeze resource category and capacityMode once any commitment references the resource. Capacity must cover current reservations. This prevents edits from changing historical stock-consumption semantics.
- Organization identity verification and availability freshness do not equal professional qualification. Add operator-controlled category eligibility; specialized medical resources require that eligibility. Seeded demo partner eligibility is explicitly fictional. A resource creation form cannot self-grant verification or qualification.
- `APP_MODE=demo` keeps seeded fictional accounts and demo clock. `APP_MODE=accounts` uses an empty operational dataset and a separate database path by default, refuses a demo dataset, and uses authenticated Better Auth sessions. Mapping is server-owned, stable by auth user ID, transactionally idempotent and grants member role only. No client role selection, email-to-seeded-account matching or automatic verified status.
- Account mode synchronizes actual server time at every service read/mutation before matching, windows, resource freshness and follow-up evaluation. Domain settings carry an explicit clock mode, with centralized time synchronization. Demo switch, reset and clock commands reject account mode at the server. The layout redirects unauthenticated visitors and API routes return 401 rather than redirect HTML.
- Deployment requires a stable secret and configured trusted base URL in account mode. Local keyless demo remains available. A browser-supplied Sites identity header is never trusted on the Node deployment path.
