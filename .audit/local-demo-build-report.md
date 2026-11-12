# Local production demo build

Run `node scripts/build-demo.mjs` to build into `.next/demo-production` and prepare the standalone assets. Run `node scripts/start-demo.mjs` to serve it at `http://127.0.0.1:3005` by default. `PORT`, `HOSTNAME`, `APP_MODE`, and `DATABASE_PATH` can be supplied in the environment; the normal demo database remains the default and is not reset by either launcher. The regular build and start commands retain their default `.next` and shipped root-server behavior.

On 2026-11-11 the build completed successfully with Next.js 16.4.6. The standalone artifact contained public assets, static chunks, and the account-role and recovery-outbox operator scripts. A filename scan found no `.env` files or SQLite databases in that artifact. With `DATABASE_PATH=/private/tmp/community-production-demo-20261111.sqlite`, the isolated server returned HTTP 200 for health, the main page, and a referenced static asset. A fictional signed intake preview returned HTTP 200 using the deterministic fallback and identified groceries in Central Park. The verification did not create a request and the server was stopped afterward.

Next.js added the demo build's generated types paths to `tsconfig.json` during the build. The artifact is a local production build, not a deployment; full interactive browser workflows were not exercised in this check.
