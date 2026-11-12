# Weekly offer schedule report

The schedule form previews one to four weekly Chicago local windows, their exact UTC instants and selected neighborhoods before confirmation. Each window and neighborhood becomes an independent ordinary offer in a single repository transaction. The strict API uses current identity, same-origin and bounded JSON checks, and private response headers. Category and neighborhood query parameters are accepted only through enum parsing; specialized categories cannot prefill or be scheduled.

The conversion validates each local timestamp by round-tripping through America/Chicago. Nonexistent spring-forward times are rejected, and ambiguous fall-back times use the deterministic date-fns-tz choice shown in the UTC preview. Every start must be in the future relative to the application's server/demo clock, and actual duration must be positive and no greater than 24 hours. The maximum is 20 records; no scheduler or recurrence metadata is added.

Verification: `npm test -- tests/offer-schedule.test.ts` passed (4 tests), covering spring and fall transitions, gap rejection, bounds, specialized categories, identity and community attribution, atomic rejection, 20-record maximum, matching across each generated date and area, pause, and busy helper exclusion. `npm run typecheck` passed after a concurrent neighborhood change was corrected.
