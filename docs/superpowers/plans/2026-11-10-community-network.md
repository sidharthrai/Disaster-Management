# Community Help Network Implementation Plan

**Goal:** Build a functional local community network that transforms into emergency coordination using the same people and resources.

**Architecture:** Next.js App Router with server-enforced identities, validated commands, domain services, and transactional SQLite persistence. Requests contain independently fulfilled needs; commitments require requester and helper approval. Intake providers can only return validated provisional extraction; deterministic safety, matching, and transitions retain authority.

**Stack:** Next.js, React, strict TypeScript, Tailwind 4, Phosphor icons, SQLite, Zod, Vitest, Playwright. Native implementation in this session; no Git operations, worktrees, staging, or commits.

**Spec:** docs/product-scope.md, docs/handoff-decision-audit.md, and both supplied handoffs, with the user's conversation decisions taking precedence.

## Confirmed additions

The user approved separate commitments per need, documented administrative closure distinct from successful help, and a local synthetic-only delivery. Private case coordination follows mutual consent. Ollama is an optional local provider alongside deterministic fallback and an optional hosted provider. Use design-taste-frontend for mockups and final UI.

## Tasks

- [ ] Define schema-derived domain types, deterministic intake and privacy rules; write and run failing tests, implement, and verify.
- [ ] Add repeatable synthetic data, SQLite repository, matching, mutual-consent commitments, private messages, per-need confirmation, follow-up, coordinator interventions, and incident readiness. Verify transaction conflicts and permissions with domain integration tests.
- [ ] Add bounded, validated Ollama and hosted adapters with provider-failure fallback; test malformed and unsafe outputs.
- [ ] Build same-origin validated route handlers and signed demo-identity cookies; verify authorization at HTTP boundaries.
- [ ] Make a small standalone HTML layout study; build responsive community, activity, intake, offer, case, coordinator, resource, and demo-settings views. Verify empty, error, loading, and reduced-motion behavior.
- [ ] Add README, startup/reset commands, feature boundaries, AI configuration, and two-to-three-minute demo script.
- [ ] Run tests, strict type check, production build, live server and browser workflows; fix observed failures and conduct a fresh independent review.

## Review focus

- Private raw content never appears in public list payloads; restricted reports fail closed without model help.
- Competing acceptances cannot double-book helpers, fulfill one need twice, or overdraw resources.
- Cancellation reopens only the affected need, releases capacity, and preserves an audit trail.
- One completed need cannot resolve another; silence and administrative closure never inflate confirmed outcomes.
- Incident activation invalidates old readiness; existing members and resources must reaffirm availability.
