# Frontend batch findings

Independent Sol review found three P2 defects after the operational UI batch.

1. Coordinator correction truncates untouched seconds/milliseconds via datetime-local formatting and always reserializes. An urgency-only edit on a request with active commitments then fails the unchanged-window guard. Preserve original ISO strings when the corresponding control is untouched. If a user deliberately changes the control, validate and serialize that changed value. Test precise timestamps and unchanged/changed window behavior.
2. NetworkProvider never refreshes on navigation/focus or receiving another account's activity. The app can leave new invitations, messages, incident changes and notifications invisible until a local mutation/reload. Add safe refresh on workspace navigation and focus plus a bounded visible-page refresh interval or an explicit usable refresh mechanism. Prevent stale asynchronous responses overwriting a newly selected identity. Avoid concurrent background refresh during a foreground command/identity transition. Do not claim realtime push.
3. Failed concern submission erases its draft because run() catches errors and resolves, and the caller always clears the field. Return explicit success and clear only after success.

Freshness changes must preserve drafts. Current RequestDetail increments/refetches on revision and clears messages, renders a skeleton while refreshing, and keys CoordinatorCase by revision. Do not erase or remount message/note/correction/escalation/report drafts on background refresh. Identity/request/thread changes must still clear the relevant private draft. Render guards and abort/generation handling must keep an old actor's private response out of the new actor's view. Re-fetch private thread data as well as snapshots so other participants' new messages become visible.

Assigned implementation files: src/components/network-context.tsx, coordinator-case.tsx, request-detail.tsx, src/lib/api.ts if a typed unauthorized error helps, new client-safe date helper if justified and tests/frontend-state.test.ts. Root owns shared workspace/CSS. No package/domain changes, no Git, no subagents.
