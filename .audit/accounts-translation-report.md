# Account and impact translation

Account sign-in, registration, recovery, private draft inbox, activity headings and connections, and public impact copy now use the shared locale. Account and recovery pages and the public impact page provide a language selector. Draft source option values, user-authored content, recovery fragment handling, and the server-side public impact projection retain their existing behavior. Draft and authentication errors use translated known messages with a translated generic authentication fallback.

Verification: `npx vitest run tests/intake-drafts.test.ts tests/impact.test.ts` passed (2 files, 4 tests). `npx tsc --noEmit --pretty false` reported no errors in these assigned files but failed on concurrent changes in `src/components/coordinator-case.tsx` and `src/components/coordinator.tsx`. Browser and server checks were outside this assignment. Shared components rendered by the activity page are owned separately.
