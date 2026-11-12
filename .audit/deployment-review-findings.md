# Batched deployment review findings

Independent reviewer auth_deployment_review confirmed three open P1 findings against the account/deployment implementation. The root also observed a deployment tracing issue from the production build.

1. scripts/reset-demo.ts opens DATABASE_PATH and overwrites account-mode data. Reproduction used an isolated live database, APP_MODE=accounts and the CLI; it became seeded demo data. Reject account mode before opening a database and refuse live datasets even if APP_MODE is mistakenly demo.
2. scripts/account-role.ts can assign organization and Medical qualifications but cannot explicitly approve organization verification. New accounts remain verified:false, so ResourceService rejects resource creation. Add an explicit operator verification choice, without implicitly verifying all role changes or conflating qualification with identity approval. Validate categories only for intended roles. Protect existing commitments if deprovisioning would invalidate eligibility, or document follow-up and revocation behavior.
3. Docker/standalone does not contain tsx, so documented npm run account:role is unavailable. Package a small runnable Node operator CLI or its runtime. Prefer a CLI usable from standalone and container without a dev dependency. Verify actual shipped artifact, not a source-tree invocation.
4. Production build warns runtime-mode.ts dynamic path.resolve traces the whole project. Runtime SQLite paths must never cause local databases or .env files to be bundled. Use a justified supported tracing boundary or static scope and verify standalone file inventory. Preserve configurable absolute DB paths and Docker data volume support.

Batch scope also includes validating same-origin mutations with the documented HTTPS reverse-proxy origin. If a configured account APP_BASE_URL differs from Next's internal HTTP origin, compare to the configured trusted origin rather than blindly trusting forwarded headers. Add a focused regression if reproduced.

No live app database may be altered by verification. Use temporary isolated databases and do not print generated credentials. Docker unavailable; standalone execution can be verified independently.
