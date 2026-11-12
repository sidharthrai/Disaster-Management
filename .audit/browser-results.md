# Actual application verification

These observations were made against the production Next.js server at http://127.0.0.1:3000, not the HTML studies. All input and identities were fictional. The synthetic reset was exercised after verification, leaving the seeded workspace ready for another demo.

| Journey | Observed result |
| --- | --- |
| Homepage to workspace | Actual green homepage linked to the actual member dashboard; synthetic-data labeling was visible. |
| Everyday request | Mira used the groceries example, reviewed deterministic extraction and saved a real persistent request. Explained suggestions appeared without automatic assignment. |
| Mutual consent | Mira invited Eli. Private composition was unavailable before agreement. Eli accepted, selected the connection and sent a fictional private message. |
| Delivery and confirmation | Eli started assistance and reported delivery. Eli could not confirm receipt. Mira confirmed; the request became Resolved and remained so after reload. |
| Independent needs | A groceries confirmation left transport open. Mira invited Teo for the separate transport need; Teo accepted. |
| Thread isolation | Teo saw his transport thread without Eli's groceries thread. Mira could choose either. An unsent draft cleared when switching threads. |
| Cancellation and closure | Cancelling the transport connection left requester-readable archived history without a send control. Naila's private reason for unconfirmed closure was visible to the authorized viewer. |
| Offer management | Mira created a groceries offer and paused it; the saved status changed. |
| Restricted intake | Naila saved and reviewed the flood example as a private Transport/Shelter case. Provisional Supplies classification was manually removed during review. Raw intake was absent from ordinary helper detail. |
| Incident readiness | Naila activated Flood. Before readiness, the private case had no eligible match. The Maple Mobility owner saved capacity from three to two and confirmed readiness for this incident. Naila then saw an explained eligible transport resource suggestion with two available units. No dispatch occurred. |
| Follow-up and reset | Four-hour demo clock advance changed queue flags. Needs attention filtering showed the affected rows. Confirmed reset restored seeded metrics: 21 open requests, 15 active offers, two confirmed outcomes and no active Mira connections. |
| Responsive layout | Homepage, workspace, intake review, coordinator and private case were checked at narrow widths in the 339–390 pixel range. Observed document width equalled viewport width in the measured views. Desktop views were also checked. |

Automated checks separately passed: production build, strict type checking, 27 Vitest tests across five files and the live HTTP smoke harness. The HTTP harness covered cross-origin denial, wrong-actor denial, pre-consent messaging denial, restricted access, multiple needs and unconfirmed closure accounting. Two regressions were observed failing before their fixes and passing afterward: final merged AI extraction schema bounds and same-origin handling of Next.js's internal hostname.

Independent Sol and Terra reviews were completed and material findings fixed. No live Ollama/hosted inference, real identity verification, actual SMS/calls/social ingestion or emergency dispatch was exercised. Browser coverage was manual, not a passed Playwright suite. Not every error/loading state or device combination was exercised.

Screenshots: [homepage](app-home.jpg), [dashboard](app-dashboard.jpg), [emergency](app-emergency.jpg), [narrow layout](app-mobile.jpg). The [decision record](full-app-decisions.tsv) retains the implementation choices and verification trail.
