# Operations contract

All commands are posted to `/api/command` and return `{ ok: true, id?: string }`. Existing commands remain supported. IDs are strings. Dates are ISO timestamps. Role checks are enforced on the server.

## Identity and clock

`User` adds `synthetic: boolean` (default `true`) and `qualifiedCategories: Category[]` (default `[]`). `u-care` has fictional Medical eligibility. `Settings` adds `clockMode: 'demo' | 'live'` and `followUp: { unassignedHours, responseHours, confirmationHours, acceptedIdleHours, urgentReviewHours }`. Defaults are 4, 2, 2, 2, 1. `emptyState()` returns empty collections with live clock and current ISO time. Live mode rejects clock and reset commands.

## Coordinator commands

- `{ type: 'assignCoordinator', requestId, coordinatorId: string | null }` assigns a same-community coordinator.
- `{ type: 'correctRequest', requestId, input: { categories: Category[], area: Area, windowStart: string, windowEnd: string, urgency: Urgency, note: string } }` preserves need identities and history. The note is coordinator-private.
- `{ type: 'addCoordinatorNote', requestId, text: string }` records a private note.
- `{ type: 'followUpSettings', input: { unassignedHours, responseHours, confirmationHours, acceptedIdleHours, urgentReviewHours } }` sets positive bounded integer hours.
- `{ type: 'evaluateFollowUps' }` reconciles current predicates. Kinds are `review`, `unassigned`, `response`, `accepted_idle`, `confirmation`, `cancelled`, `urgent_owner_review`, `resource_loss`, and `overdue`.
- `{ type: 'acknowledgeFollowUp', id }`, `{ type: 'resolveFollowUp', id }`, and `{ type: 'escalateFollowUp', id, coordinatorId, note }` update a persistent episode. Active conditions cannot be resolved.
- `{ type: 'markNotificationRead', id }` marks the current recipient's notification read.
- `{ type: 'createResource', input: { name, description, category, area, capacityMode, capacity } }` creates an organization-owned resource; `{ type: 'editResource', id, input: { name, description, category, area, capacityMode, capacity, active, ready } }` edits one. Eligibility is operator-controlled and Medical requires qualification.

## Read projections

`Request` adds `assignedCoordinatorId: string | null`, `updatedAt: string`, and `incidentId: string | null`. Snapshot request entries continue to include `status` and `flags`. Coordinator detail adds `coordinatorNotes` and `followUpEpisodes`; other actors receive empty arrays. Episodes expose `{ id, requestId, kind, subjectId, severity, description, openedAt, acknowledgedAt, acknowledgedBy, resolvedAt, escalations: [{ actorId, coordinatorId, note, at }] }`. Private notes expose `{ id, requestId, actorId, text, at }`. Snapshot adds `notifications: [{ id, requestId, kind, text, createdAt, readAt }]`, filtered to the recipient and current request access. Snapshot adds `emergencyDashboard`, null for non-coordinators, otherwise `{ incident, network: { requests, open, resolved, categories, progress }, incidentLinked: { requests, open, resolved, categories, progress }, resources: { total, active, ready, reserved }, priorityQueue: [{ requestId, urgency, createdAt, overdue }] }`. Category and progress fields are count records. Network totals include all requests in the actor's community; incident-linked totals use only explicitly linked requests.

Resource adds `description` with an empty-string migration default. Units of capacity and reservations are individual resource units; people counts do not implicitly consume units.
