# Donation board handoff

- Component export: `Donations` from `src/components/donations.tsx`; page: `/donations`.
- API: `GET /api/donations` authenticates via `currentIdentity`, synchronizes with `network().snapshot(identity)`, then returns private-header JSON conforming to `DonationBoardSchema`: `{ resources: [{ id, category, area, units }], offers: [{ id, category, area, startAt, endAt }] }`. Only Groceries and Supplies categories are returned. Text, owner details, and requests are excluded.
- Resources must be consumable, active, fresh within 24 demo hours, have positive unreserved capacity, belong to a verified organization in the same community, and be ready for the current incident if any. Offers must be active, unexpired, same-community, have a same-community owner, and be incident-ready if applicable. Units are per resource and not a stock guarantee.
- Request links use `/request?category=<enum>&area=<enum>`; intake initializes only generic text for valid Groceries/Supplies plus area values. Offer links use the same enum-only contract with `/offer`; organization resource management uses `/resources`.
- Verification: `npx vitest run tests/donations.test.ts` passed (3 tests). `npm run typecheck` found one unrelated concurrent error at `src/components/neighborhoods.tsx:32`, `current.data` possibly null; no donation errors were reported.
