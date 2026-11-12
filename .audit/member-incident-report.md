# Member incident experience

During a simulated incident, the workspace banner labels the scenario as a simulation without live alert or dispatch and directs coordinators to the incident dashboard, organizations to resource readiness, and members to their offer readiness controls in My activity. The member community board orders its existing unrestricted, open request summaries by urgency, overdue status, age, and ID during an incident; everyday ordering remains unchanged.

The board filters the same projected requests before ordering, and no backend permissions, consent rules, or new counts were changed. The member readiness control is in `OfferList` on `/activity`; organizations can edit their own resource readiness on `/resources`.

Verification: `npx vitest run tests/incident-actions.test.ts` passed (2 tests). It covers role routes, everyday order, incident priority and deterministic ties, and input immutability. Browser interaction and a full build were outside the assigned verification scope.
