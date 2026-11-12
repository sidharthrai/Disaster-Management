# Feature status

A subsequent [original-handoff coverage audit](original-handoff-coverage.md) found incomplete requirements and three open intake defects. The working behaviors below do not establish full P0 or full handoff completion. Provider-only safety flags can be lost on save, extracted timing is not applied to the default window, and saved urgency can differ from the preview. Raw intake remains private. See the audit for the exact reproduction and missing-feature list.

The actual Next.js application was verified on November 11, 2026. The HTML files under `public/mockups/` remain design references, separate from the running application.

| Area | Working behavior | Verification |
| --- | --- | --- |
| Homepage and workspace | Green A homepage, B-style workspace, search, filters, database-derived metrics, synthetic identity selector. | Production build and desktop browser checks; narrow layouts checked for page overflow. |
| Need and offer posting | Editable intake, independent needs, private-request option, offer availability and pause controls. | HTTP smoke and browser request creation; browser offer creation and pause. |
| Intake | No-key deterministic extraction, provisional fields, safety restrictions, validated optional provider output and fallback. | Automated extraction/provider tests and actual no-key HTTP/browser intake. Optional Ollama and hosted inference were not tested against live models. |
| Matching and consent | Explained suggestions, eligibility checks, separate requester/helper agreement, resource reservations. | SQLite behavior tests, HTTP smoke and browser invitation/acceptance. Suggestions are not dispatch. |
| Private coordination | Separate commitment threads, requester/coordinator archives, no composer before agreement or on cancelled threads. | Automated authorization tests and browser message isolation, draft clearing and archived-history checks. |
| Lifecycle and confirmation | Helper starts/reports delivery; requester confirms each need. Other needs stay open. Administrative closure does not count as confirmed help. | Automated tests, live HTTP smoke, browser delivery/confirmation, persistence after reload and closure-reason display. |
| Coordinator and restricted cases | Follow-up queue, private human review, eligible organization referral suggestions, reporting and moderation. | Automated privacy/moderation tests; browser queue filters, private flood intake and review. |
| Emergency Mode and resources | Simulated event reuses the network and requires readiness for that incident; owners manage capacity. | Automated readiness/capacity tests; browser activation, owner reaffirmation, eligible suggestion and return to everyday mode. |
| Persistence and repeatable demo | SQLite transactions, repeatable migration, seeded identities/data, demo clock and reset. | SQLite persistence tests; browser reload, four-hour clock advance and confirmed synthetic reset. |

Final source checks passed: `npm run build`, `npm run typecheck`, and `npm test` (27 tests across five files). `node scripts/demo-check.mjs` passed against the running production server. Real browser workflows were exercised separately; `npm run test:e2e` was not run and is not the evidence for those checks. Sol and Terra independently reviewed the implementation; the material findings reported during those implementation reviews were fixed. The later scope audit found the additional open issues linked above.

See [the browser observations](../.audit/browser-results.md) and [decision record](../.audit/full-app-decisions.tsv) for details. Testing used fictional data, which was reset to the seed afterward. Narrow layouts were observed at widths from 339 to 390 pixels; this is not a claim of exhaustive device coverage.

The app remains a local synthetic demonstration. Production authentication, real identity or qualification verification, live SMS/calls/social ingestion, real alerts, emergency dispatch and operational medical/missing-person response are outside this implementation. Safety screening uses limited heuristics and cannot detect every sensitive situation. Optional model adapters have mocked-provider coverage, not live inference verification.
