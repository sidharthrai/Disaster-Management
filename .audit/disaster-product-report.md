# Disaster product implementation report

The disaster area now acts as a response workspace. It puts incident state and role visibility first, then offers four immediate actions: private missing-person reporting and self-safe check-in, urgent help intake, shelter/transport availability, and the response queue. It preserves the existing warm rust/amber shell and English/Spanish locale hooks, with English fallback for new copy.

## Implemented

- `DisasterHub` replaces the general advocacy page with a concise incident summary, visible coordinator control entry, scoped counts, direct workflow actions, and role-appropriate availability reminders. Coordinators can activate or end the existing Riverton simulation; activation does not imply dispatch or automatically ready resources.
- `DisasterPeople` adds private people records outside ordinary requests, optional last-seen context, coordinator questions, and author-only replies. Same-community author/coordinator access is enforced in the service and API. The signed-in community can participate through opt-in notices containing reference, coarse area, and status, and can send private information to the reporter/coordinators. Adult names require separate explicit sharing authorization; names of children or people with unknown age remain private. Self-safe check-ins identify only the authenticated actor, can optionally share that person’s name and neighborhood with their community, and do not reconcile other records. Authors can revoke sharing. People reporting is human review and administrative tracking, without unauthenticated public search, automatic identity matching, or rescue claims.
- `DisasterSupport` shows shelter and transport services by category and neighborhood, readiness blockers, reported update time, and remaining resource units. Its eligibility logic follows existing resource readiness and preserves the ordinary intake, mutual consent, and requester confirmation flow. Available resources are not bookings or guaranteed beds/seats.
- The response queue shows only requests already authorized by the network snapshot. Community, my-tasks, and current-incident scopes lead to existing request details, consent/progress actions, and confirmations. The default ordering prioritizes urgency, overdue windows, and age.
- Urgent help enters the existing signed-review intake with a supported Urgent preset after analysis. Sensitive flags and existing Critical review recommendations retain the critical floor. Timing remains explicitly reviewed and the form never posts automatically.

## Verification performed by this lead

After the final community board and adult-name consent changes, project-wide `npm run typecheck` passed. Seventeen focused tests passed across five files: eight people privacy, follow-up, visibility, tip, age-consent, legacy-default, and last-seen validation tests; two support readiness/community scope tests; two urgent-entry safety tests; two incident-action tests; and three signed-intake tests. Read-only review found and fixed two queue issues: an ended incident now restores the community filter, and request deadlines are labeled as window ends.

Source review checked that people records are separate from ordinary request snapshots, impact summaries, and matching; existing SQLite persistence/state defaults handle the additive collection. The parent owns browser QA, HTTP journeys, and final combined regression evidence. No production build, default database reset, external transfer, outbound message, new dependency, or deployment was performed by this lead.

## Remaining limits

Incident management remains a labeled Riverton simulation. General incident broadcasts, public person search, live alerts, dispatch, identity verification, and verified wellbeing are not implemented. People fields and questions are private but depend on truthful reports and human follow-up. The UI asks authors to omit precise locations and contact details; that is guidance rather than semantic redaction of every possible sentence. New copy has English fallback; this batch deliberately does not expand translation scope.
