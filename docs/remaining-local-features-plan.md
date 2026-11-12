# Remaining local feature batch

The user authorized using free agents to implement the remaining local product gaps after the original-handoff audit. Continue on the development server; do not run another production build for this batch. Root owns shared state schemas, SQLite table registration, navigation, final integration and Git. Workers own separate service, API, UI and test files. Run independent focused checks, one bounded functional review, then the combined suite and live development-server checks.

## Contracts

- Group activities use ordinary, predefined activity kinds, a general neighborhood, dated window and bounded capacity. Members can create, join and leave; organizers and coordinators can cancel. Attendance changes transact atomically and cannot exceed capacity or duplicate a person. Lists show counts and the current person's attendance; organizer/coordinator detail may show participants who deliberately joined. Private organizer notes never appear in general listings. These are community activities, not emergency dispatch or professional services.
- Volunteer directory profiles are opt-in. A member explicitly chooses ordinary capabilities, general areas and supported languages; display names come from their current account. No contact information, precise addresses, specialized qualifications or automatic enrollment is added. Existing offers, matching and mutual consent remain the way to connect. Turning visibility off removes the card; account role changes are rechecked.
- Optional offer affiliation is explicitly self-described, cannot change matching eligibility or verification, and is stored with the offer. Use the existing organization directory as a reference only; affiliation is not proof of membership or endorsement. Do not expose arbitrary affiliation text in generic public request summaries.
- Intake drafts let people save incomplete requests without inventing location or time. They have a private tracking reference, original source/text, status and a bounded information-request note. Only the author and same-community coordinators can access them. The author can resume the existing analyzed, signed-preview, reviewed-timing request flow and then link the resulting owned request. Drafts never enter matching, emergency operational counts or confirmed-outcome metrics. Withdrawing and converting are explicit states; no draft is silently published.

## Shared records

The existing transactional repository will gain additive, backward-compatible default-empty collections: gatherings, volunteerProfiles and intakeDrafts. Offer affiliation is optional for old records. Existing demo reset clears the collections with the rest of the synthetic state; account mode keeps its separate durable database. Each feature's service validates input and transitions at its boundary, and each client validates its response. Root will verify old fixtures still load and all new records survive SQLite reopen.

## Verification and limits

Prove group capacity and join/leave/cancel, directory opt-in/update/hide, affiliation persistence without privilege changes, and incomplete draft save/resume/convert/withdraw. Use fictional isolated data for HTTP mutations and browser checks. External voice, translation services, real maps, public deployment and outbound messaging remain outside this timed local batch.
