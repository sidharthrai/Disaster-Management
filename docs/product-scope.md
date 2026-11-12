# Product scope and decision status

## Current stage

The user has authorized the actual complete local application after reviewing the connected HTML prototype. A remains the public homepage and B remains the signed-in dashboard, with A's green branding throughout. Follow docs/implementation-plan.md for the planned implementation, shared contracts, worker ownership, verification, and explicit simulation boundaries. The completed HTML prototype remains a visual reference. Do not use Git or falsify work records.

## Source and authority

The user-provided Community Help Network handoff has been read in full. The user clarified that its feature scope is approved; the remaining design work concerns missing decisions and deliberate implementation choices. The handoff's detailed schema, lifecycle, architecture, and roadmap are proposals to reconcile with the user's decisions, rather than additional approvals to assume. Subsequent user decisions take precedence over the handoff.

## Confirmed direction

- People use the network for everyday mutual aid, so relationships and participation already exist when emergencies happen.
- Ordinary requests connect people directly; coordinators step in when needed.
- The user and the assistant are building the application together.
- Do not initialize Git, stage files, or make commits. Leave existing Git metadata alone until the user elects to use Git later.

## Approved P0 delivery

- A polished responsive Next.js and strict TypeScript application with everyday help requests and offers.
- AI-assisted natural-language and transcript intake, validated outputs, and a deterministic no-key fallback.
- Explainable volunteer and resource matching with eligibility restrictions.
- An operational coordinator dashboard and persisted request lifecycle, follow-up, and outcome confirmation.
- Emergency Mode and protection of restricted, medical, and missing-person content.
- Repeatable synthetic demo data and explicit labeling of simulated features.
- Business logic separated from components, meaningful tests, startup instructions, a README, and a two-to-three-minute demo path.
- Run the application, type checks, tests, and production build; fix failures and report working features, simulations, and exclusions.

The handoff's P1 and P2 ideas remain enhancements after the core workflow is working, consistent with its priority definitions. They are not rejected, and their ordering may change where a P0 workflow needs part of an enhancement.

## Confirmed connection and outcome decisions

- Both requester and helper must agree before a connection becomes active.
- Members see safe summaries, general neighborhoods, and requested timeframes; raw transcripts and sensitive details remain private.
- Private coordination opens after mutual agreement.
- Multi-need requests require separate commitments and confirmations per need in the eventual application. This prototype demonstrates one grocery need.
- Documented administrative closure is distinct from confirmed help. Silence must not count as a successful outcome.
- The initial application will run locally, after the HTML design phase is complete.
- The eventual component-library choice remains open; shadcn/ui is the assistant’s recommendation, not a user-approved implementation decision.

## Engineering responsibility

The assistant should choose routine implementation details and explain consequential trade-offs. Do not ask the user to select library APIs, individual database fields, component organization, or other reversible implementation details that can be resolved from the agreed product behavior.

Follow the handoff's local-first demonstration setup with synthetic accounts and an explicitly labeled role switcher. Real production authentication and public deployment are not prerequisites for the first delivery.
