# Independent ecosystem extension batch

The user authorized more unfinished handoff features while core testing continues. This batch is additive and ordered from simpler read-only projections to richer persisted profiles. It does not change consent, safety review, matching eligibility, request lifecycle or authenticated identity rules.

## Features and ownership

| Feature | Scope | Exclusive implementation files | Verification |
| --- | --- | --- | --- |
| Safe community activity | Signed-in members see generic recent posted/confirmed-help events only for nonrestricted requests in their community. Never render free-text event notes or raw intake. | domain/activity.ts, api/community/activity/route.ts, components/community-activity.tsx, workspace/community-activity/page.tsx, tests/community-activity.test.ts | Private/other-community requests absent, safe output allowlist, stable bounded ordering, genuine persisted events and browser navigation. |
| Coordinator insights | Real state-derived submitted/matched/active/confirmed/overdue counts, median time to first accepted connection with sample size, per-category resource capacity. | domain/analytics.ts, api/insights/route.ts, components/insights.tsx, workspace/insights/page.tsx, tests/analytics.test.ts | Coordinator/community authorization, correct denominators, excluded invalid historical durations, no grouping unlike resource units into misleading totals. |
| Organization profiles | Organization-owned descriptions, advertised services, general service areas and optional safe HTTPS website. Member directory projects current authoritative approval/qualifications separately. | domain/organizations.ts, domain/model.ts profile-array addition only, domain/seed.ts fixtures, server/repository.ts profile table addition only, api/organizations/route.ts, components/organizations.tsx, workspace/organizations/page.tsx, tests/organizations.test.ts | Ownership enforcement, no client approval/qualification fields, no private contacts, old-record migration, accurate member/account labels, browser save/reload. |
| Root integration and review | Shared navigation/dashboard links and styling, full checks, live verification and scoped review. | components/workspace.tsx, components/community.tsx, app/globals.css, docs/status/audit, package/config/Git | All app modes still work and existing core tests remain green. |

## Shared safety and data rules

- All APIs require currentIdentity and private/no-store responses. Authorization is server-side. GET projections are safe allowlists, not raw state serialization.
- The activity feed excludes restricted requests even for their owners, because it is a community view. It must not reuse arbitrary Event.text. Derive a small event kind from known lifecycle transitions and render constant generic text. Public anonymous homepage remains aggregate-only.
- Insights are coordinator-only. Median assignment time uses first acceptedAt per request, not suggested/created proposals. Exclude impossible or missing intervals and display sample size rather than inventing values. Confirmed needs and fully resolved requests are separately labeled. Resource capacities remain per resource/category/unit policy, never summed as interchangeable real-world supplies.
- Profiles cannot set user.role, verified, synthetic or qualifiedCategories. Self-described services are not qualifications. Specialized service claims require existing operator eligibility or clearly remain unavailable. No personal phone/email fields or exact addresses are introduced.
- Organization profile schema defaults and new arrays must preserve old records. No database reset. The profile worker owns only the minimal model/repository/seed additions, leaving core behavior unchanged.
- Matching continues to read authoritative user qualification and resource fields, never profile advertising.
- Source-grounded no-key intake/provider interface remains independent. No new external integrations, model downloads, email or actual deployment is authorized by this extension.

## Order and review

Write each bounded module against these contracts, then run focused tests. Root integrates routes, checks the entire artifact and verifies actual UI/API behavior. Review this extension as one batch after all three handoffs; fix material findings together. Existing core verification and its truthful audit trail remain separate.
