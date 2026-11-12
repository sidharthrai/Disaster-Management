# Neighborhood overview report

Implemented `/neighborhoods` and a private, identity-scoped `/api/neighborhoods` projection. The five area buttons show open unrestricted request counts, active offer counts, and separate available versus stale/unavailable resource listing counts. Requests expose only IDs and categories; the page links to cases and resources and labels the schematic fictional. Resource eligibility uses the existing freshness helper, verified and qualified organization ownership, remaining capacity, active state, and incident readiness.

Verification: `npm test -- tests/neighborhoods.test.ts` passed (2 tests). `npm run typecheck` passed after fixing a nullable client state and regenerating Next route types. A production build compiled successfully before TypeScript encountered that now-fixed nullability issue; the full build was not rerun here. No new CSS classes or dependencies are required.
