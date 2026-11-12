# Complete local application plan

## Goal and completion gate

Build the actual Community Help Network application from the approved designs. The public homepage follows A. The member dashboard follows B with A's green branding. Everyday participation and emergency coordination use the same persistent community records.

Completion requires a runnable local Next.js app that works without credentials, strict TypeScript checks, passing behavior tests, a successful production build, a repeatable seed/reset command, browser verification of the ordinary request-to-confirmed-help flow, and a documented emergency demonstration. A mockup, passing type check alone, or an agent's report does not meet the gate.

The user has now explicitly authorized backend and application implementation. Earlier HTML-only constraints describe the completed design phase. The HTML studies remain reference artifacts. Do not run Git commands, create branches or worktrees, stage, commit, alter timestamps, or remove work records.

## Baseline and current gaps

The scaffold has a typed command endpoint, Zod domain schemas, SQLite transactions, service-level authorization, deterministic intake, optional Ollama/hosted adapters, and 14 passing domain tests. Strict type checking currently passes. There are no application page or layout files, no stylesheet, and no actual browser application to launch.

The audit found a client component dynamically importing the Node-only network module. Private messages are request-scoped, so different helpers on the same request can see one another's coordination details. Resource matching permits requester-owned resources. Resource units have no declared consumed-versus-concurrent policy. Manual private intake and a persistence migration path are missing.

## Chosen design and alternatives

Retain the typed command service and immediate SQLite transactions. Fix invariants in their owning services rather than adding a service layer for every feature. Splitting all domain operations into new services would add cross-service coordination while preserving the same defects. Small pure transition helpers are useful only where they remove duplicated invariants.

Use explicit application routes and a shared workspace layout. Route groups separate public and workspace presentation without changing URLs. A catch-all page with one client router would be shorter initially but would centralize unrelated screen behavior and weaken server/client boundaries.

Keep domain types and validation client-safe. Put input schemas in a module that does not import Node or persistence. Only server files import the service, repository, identity-cookie handling, and AI provider configuration.

Use the approved design as the visual specification. shadcn/ui is the proposed basis for accessible low-level controls, styled with the green theme; it is not a replacement for the custom layouts. It is a builder choice, not an additional product feature.

## Data shapes and invariants

- A Community Member may request and offer help. Coordinator and organization privileges are additional demo roles.
- A Help Request contains independently fulfilled Needs, a safe public summary, private raw intake, an optional manual privacy choice, requested area/time, and a documented optional closure.
- A Commitment links one Need to one eligible helper or organization resource. Requester and helper approvals are independent. Acceptance rechecks eligibility and capacity inside the SQLite transaction.
- Only one active commitment may fulfill a need. A helper cannot accept time-conflicting commitments. Organizations may fulfill simultaneous resource reservations only within their declared capacity.
- A Coordination Message belongs to a Commitment, not the entire request. Its participants are that commitment's requester and helper. An authorized coordinator may review it. Historical messages never become visible to a replacement helper. Cancellation revokes the former helper's access; requester and coordinator can retain read-only history. Confirmed participants retain their thread. Legacy messages without a reliably known commitment receive commitmentId null and remain visible only to the requester and authorized coordinator. Migration must not guess their participants or duplicate them into threads. Migration must be repeatable.
- Helpers report start and delivery. Only the requester confirms receipt. Each need is confirmed separately. Administrative closure, referral, withdrawal, silence, and failed delivery never count as confirmed help.
- A Resource declares consumable stock or concurrent capacity. Acceptance reserves one unit. For consumables, reporting delivery consumes that unit; reserved counts include consumed units. Confirmed delivery, cancellation after delivery, withdrawal after delivery, and administrative closure after delivery do not restore stock. Cancelling before reported delivery restores the reservation. For concurrent capacity, confirmation or cancellation/closure releases the reservation, including after reported delivery. Repeated transitions must not release a unit twice. Neither mode can be overdrawn.
- Incident readiness belongs to the current incident ID. Activating a new incident requires existing offers and resources to reaffirm availability. Everyday participation alone is not emergency qualification.
- Safety restrictions come from independent deterministic screening, selected sensitive categories, and manual private intake. Automated screening has limited vocabulary and is not comprehensive. Raw intake never becomes public listing text.
- Manual private intake deliberately uses the coordinator-review and eligible-organization-referral workflow. The form must explain that ordinary helpers will not browse or match that request. Moderation that restricts an existing public request cancels its outstanding ordinary-helper connections, applies the same reservation accounting, and revokes their case/thread access. Review does not automatically make the case public again.
- Missing-person cases remain private review/referral. Medical and dangerous requests use eligible organization resources and authorized review. The app does not diagnose, dispatch rescue, or assert that a person is safe.

## HTTP and shared contracts

Preserve GET /api/state, GET /api/requests/[id], POST /api/command, POST /api/intake, and POST /api/session. Keep mutations same-origin, JSON-validated, body-bounded, permission-checked, and uncached.

Move CreateRequestSchema, CreateOfferSchema, and source validation to src/domain/inputs.ts. Re-export from the old domain module only if an active caller needs migration, then remove internal legacy imports. The new request input adds an optional private boolean. Manual privacy can only add restrictions.

Message commands add a nonnullable commitmentId alongside requestId and text. Message views include a nullable commitmentId only for archived legacy messages. The service method is message(userId, requestId, commitmentId, text). Detail responses filter each thread according to the effective identity and mutual agreement. The frontend selects a commitment explicitly when a requester has several helpers. Legacy notes are displayed separately as requester/coordinator-only read-only history.

Resource views add capacityMode with consumable and concurrent values. Backend owns schema migration so an existing local SQLite file remains readable. Tests establish migration behavior and reservation accounting.

NetworkService.publicOverview() returns { metrics: { members, offers, confirmed, open }, examples: [{ category, area, windowEnd }] }. Each count is a number. Category and area use the existing schema enums. Only nonrestricted requests can supply examples. Include no raw content, request IDs, contact details, or private timelines. The public page must not serialize a member snapshot.

Commands return the existing { ok, id? } envelope. Do not silently rename other commands or change current field meanings. Any unavoidable shared contract change must be reported to the root before UI consumers use it.

## Routes and working screens

| Route | Required behavior |
| --- | --- |
| / | A's welcoming homepage, safe community overview, clear synthetic-demo label, entry to the member workspace. |
| /dashboard | B's green workspace, real database-derived metrics, relevant safe listings, search/category/area filters, outstanding commitments. |
| /request | Natural-language need intake, provisional extraction, editable categories, missing details, requested time window, manual private choice, saved request. |
| /intake | Pasted transcript intake and labeled simulated sources through the same validated pipeline. |
| /offer | Create an offer with capability, area, availability, then manage active status and incident readiness. |
| /activity | Own requests, invitations needing agreement, active helper commitments, delivered/unconfirmed work, confirmed outcomes, and offer management. |
| /requests/[id] | Independent need status, explainable suggestions, invite/interest, participant approvals, start/deliver/cancel, requester confirmation, per-commitment private messages, timeline, reporting, restricted access states. |
| /coordinator | Permission gate, queue filters, unassigned/urgent/overdue/confirmation flags, private review, suggestions/referrals, documented closure, duplicate review hints, moderation, event controls. |
| /resources | Fictional organizations, real stored capacity/status, stale availability, owner updates and incident revalidation. |
| /settings | Current provider, no-key fallback explanation, demo clock, follow-up evaluation, coordinator-only synthetic reset, identity limitations, setup guidance. |

A clearly labeled demo identity selector switches fictional accounts. Identity changes clear stale private screen data. The selector is intentionally not production authentication.

## Work division and file ownership

| Worker | Model | Exclusive implementation files | Deliverable |
| --- | --- | --- | --- |
| Domain and server worker | Terra, high reasoning | src/domain/**, src/server/**, src/app/api/**, tests/**, scripts/reset-demo.ts | Safe transactional contracts, per-commitment messages, capacity rules, manual privacy, migration, provider behavior, regression coverage. |
| Main frontend worker | Terra, high reasoning | src/components/**, src/lib/api.ts, src/app pages/layouts/styles except api | Every required route, A/B green visual system, actual API-backed actions, state/error/loading/empty behavior, mobile layout. |
| Documentation and demo worker | Luna, medium reasoning | README.md, docs/demo.md, docs/feature-status.md, .env.example, scripts/demo-check.mjs | Accurate setup, limits, demo path, repeatable HTTP smoke harness once contracts settle. |
| Root integrator | Root | package.json, lockfile, configuration, docs/product-scope.md, shared plan/audit records, browser checks, integration-only fixes after worker handoff | Install dependencies serially, reconcile contracts, inspect artifacts, run checks/build/server/browser, resolve review findings. |
| Independent reviewer | Sol or Terra, high reasoning | Read-only review artifacts under .audit | Correctness/security/privacy review of the completed files and verification evidence. No self-review substitute. |

No concurrent writer edits another worker's files. Shared interfaces are written by the backend worker against this plan and read by the frontend worker. The root owns dependency mutation. Reviews run after workers stop writing their slice.

## Dependency order and throughput checkpoint

1. Finish read-only backend and frontend audits, baseline tests, and this plan.
2. Confirm the shared input, message, resource, and public overview contracts in code before dependent consumers are finalized.
3. Run backend and frontend work concurrently against the agreed contract. Documentation can run independently, then check its claims against the finished app.
4. Verify domain work with real SQLite tests before integrating screens. Verify the frontend with type checks and a production build before the browser pass.
5. Obtain independent review. Fix material findings in the responsible files and rerun the covering tests.
6. Exercise the actual app in a browser, then record only observed outcomes.

The expected units are the domain/server correction, the public/workspace shell, request and offer intake, request detail and participant operations, coordinator/resource/incident operations, and documentation/verification. Broad visual polish follows working core actions. Keep concurrency to two code writers and one documentation worker so package/configuration writes remain single-owner.

## Verification matrix

| Concern | Evidence required |
| --- | --- |
| No-key intake | Deterministic extraction and unknown-field tests; browser submission without environment keys. |
| Optional providers | Tests with mocked external HTTP responses for schema-valid, malformed, timeout/failure output. Do not claim live Ollama or hosted inference without a configured service. |
| Consent and lifecycle | SQLite-backed tests for both approvals, stale acceptances, competing helpers, per-need completion, cancellation, and wrong-actor confirmation. |
| Privacy | API/service assertions that public responses lack raw intake; separate helpers cannot read other commitment threads; restricted cases deny unauthorized reads and mutations. |
| Resources | Tests for requester-owned exclusion, finite reservations, consumable/concurrent completion, cancellation release, stale verification, and incident readiness. |
| Persistence | Reopen a file-backed database and verify requests, messages, and outcomes remain. Test migration of earlier local records. |
| Follow-up | Repeatable flags for unassigned, response timeout, overdue, cancelled, unconfirmed, and review-needed requests; silence never resolves. |
| UI | Browser walkthrough with actual requester/helper identity changes, private message, delivery, receipt confirmation, dashboard updates, emergency readiness, and narrow-screen layouts. |
| Build | npm test, npm run typecheck, and npm run build succeed. The production server returns the real pages and APIs. |
| Truthful demo | Synthetic users/resources/verification/events labeled, simulated channels labeled, no claims of real alerts, qualification checks, rescue, or real-world outcomes. |

## Definition of out of scope

Production authentication, real identity verification, live SMS/calls/social ingestion, speech-to-text, emergency dispatch, medical diagnosis/treatment, real missing-person search, payments, cross-community federation, public hosting, and production-scale operations are not part of this local hackathon delivery. The corresponding demo controls must state their limits instead of pretending to perform integrations.
