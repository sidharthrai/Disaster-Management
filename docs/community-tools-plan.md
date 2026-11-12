# Local community tools batch

The user authorized another feature batch while independent review runs. Local functionality is the delivery target; publishing remains later. Core consent, case status, privacy, qualification and confirmation rules remain unchanged.

## Independent features

| Feature | Work and owner boundary | Acceptance |
| --- | --- | --- |
| Weekly, multi-neighborhood offer windows | New domain/offer-schedule.ts, API offers/schedule, dedicated schedule form and existing offers.tsx, focused schedule tests. Existing offer records are materialized per week/area, so matching needs no rewrite. | One to four explicitly reviewed weekly windows in America/Chicago across one to five areas. Date-fns-tz handles IANA conversion. Reject nonexistent local times, review exact dates, no unbounded scheduler. Ordinary offer categories only. Existing pause/readiness/availability conflict rules apply to every created record. |
| Supplies/donation board | New domain/donations.ts, API donations, donation page/component, focused projection tests. Minimal intake-form query prefill for category/area; no AI or lifecycle changes. | Browse fresh consumable Groceries/Supplies inventory and active supply offers with generic safe summaries. Request supplies through existing reviewed intake and mutual-consent lifecycle; offer supplies through the existing offer form. No separate duplicate stock/reservation accounting or payment workflow. |
| Fictional neighborhood overview | New domain/neighborhoods.ts, API neighborhoods, neighborhood page/component, projection tests. | Interactive accessible schematic of five fictional general areas with state-derived nonprivate request/offer/resource counts and area detail links. No GPS, real geocoding, exact addresses or navigation claims. |
| Root integration | Navigation, dashboard links, CSS, package dependencies, docs and runtime tests. | Local demo and account modes still work. Batch reviewed and verified after handoffs. |

## Contracts and constraints

- New APIs use currentIdentity, sameOrigin/boundedBody for writes and privateHeaders. Same-community checks are enforced in domain services.
- Offer schedules use the existing OfferSchema unchanged. Timezone conversions and bounds are validated again on create. The form previews each dated occurrence and requires deliberate confirmation. Each row remains independently manageable. No claimed recurring availability beyond the materialized horizon.
- The offer worker supports safe enum-only query prefill `?category=Supplies&area=Central%20Park` for the donation board. The donation worker owns only the corresponding intake-form prefill. Never put personal/raw request content in URLs.
- Donation inventory quantities remain per-resource units, not interchangeable quantities or guaranteed stock. Organization approval and freshness are required for available stock. No new resource reservation path bypasses commitments.
- General neighborhood projections exclude restricted requests even for coordinators, because the view is community-facing. Counts are not claims of real geography or emergency safety.
- Model, NetworkService, matching, shared commands, repository and seed do not change in this batch. Writers have disjoint feature modules. Root owns Git/config/dependencies and integration.
- Built-in deterministic intake and provider adapters stay independent. No external provider calls, microphone access, communications, public deployment or new data collection is part of this batch.
