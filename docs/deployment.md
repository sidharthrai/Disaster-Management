# Deploy the Node service

This guide prepares one Node.js service with durable SQLite files. Run one app instance against each database directory. The service does not support concurrent instances sharing SQLite files, and this guide does not establish production readiness for real emergency operations.

## Choose an operating mode

The default `demo` mode starts with fictional seed data and a synthetic identity selector. Keep it local or behind a private demo environment. Do not use it for real personal or emergency information.

Set `APP_MODE=accounts` for password sign-in and persistent accounts. Account mode starts with an empty community database. Every new account receives the member role. An operator must provision coordinator or organization roles with `npm run account:role` after the user signs in once.

## Configure account mode

Set these server environment variables before startup:

```sh
APP_MODE=accounts
APP_BASE_URL=https://community.example.org
BETTER_AUTH_SECRET=<stable-random-secret-at-least-32-characters>
AUTH_DATABASE_PATH=data/accounts-auth.sqlite
DATABASE_PATH=data/accounts-community.sqlite
AI_PROVIDER=fallback
```

Use an HTTPS origin for `APP_BASE_URL` in production. Keep the authentication and community database paths separate, stable, and on durable storage. Back up both database files while the service is stopped or use a SQLite-aware backup method that includes active write-ahead-log data.

Install dependencies and run the configuration check before building:

```sh
npm ci
npm run deploy:check
npm run build
npm start
```

`npm start` launches the prepared standalone server and defaults to `127.0.0.1:3000`. It resolves database paths before the generated server changes working directory and loads local environment files without overriding exported variables. Put a TLS-terminating reverse proxy in front of the service and forward requests to that address. The `/api/health` endpoint returns a no-store JSON health response; it does not check database integrity or external services.

On first start, account mode creates separate empty SQLite databases. Open `/register` to create the initial account, then sign in at `/login`. Signup grants the member role. Members can submit organization applications; coordinators can approve, decline, or revoke ordinary organization approval, with a recorded reason. Applicants can withdraw pending applications. Approval does not grant medical or missing-person qualifications; accounts with sensitive qualifications require operator review before approval.

## Automatic follow-up

The persistent Node server checks follow-up conditions while it is running. Set `FOLLOW_UP_INTERVAL_MINUTES` to an integer from 1 through 60; the default is 1 minute. The runner uses server time in account mode and the simulated clock in demo mode. It can create private, recipient-scoped in-app reminders, but never sends external messages, confirms outcomes, assigns helpers, or closes cases. This is a single-process timer, not a hosted scheduler.

## Local password recovery

Account recovery accepts loopback installations only. Set `RECOVERY_OUTBOX_PATH` to an absolute path if the default `data/recovery-outbox.jsonl` is not appropriate. The standalone startup wrapper resolves the default against its data directory. Reset links are appended to a local file with owner-only permissions (`0600`); delivery by email or another remote service is disabled. Treat filesystem access to this file as trusted operator access.

Read pending reset links with `npm run recovery:outbox` from the same deployment directory and environment. The outbox is private and is not exposed through the application API or logs. Give the link to the local tester through an approved channel; do not place tokens in shared logs or support tickets. Better Auth enforces expiry and one-time use and revokes existing sessions after a successful reset.

Run the focused local workflow checks against the running loopback server with `npm run check:recovery` and `npm run check:local-workflows`. These checks use isolated test accounts and local storage.

## Provision an account role

After the account signs in once, find its Better Auth user ID in the auth database and prefix it with `account:`. Run the role command in the same deployment environment and working directory as the service:

```sh
npm run account:role -- account:<user-id> coordinator
npm run account:role -- account:<user-id> organization --verify
npm run account:role -- account:<user-id> organization Medical --verify
```

The optional category arguments set an organization's qualifications. The separate `--verify` flag explicitly records operator approval of an organization. A role change alone does not approve it, and a category does not establish professional credentials. Provision only trusted operators as coordinators. Medical resource eligibility requires both organization approval and the operator-set Medical qualification. The command updates the mapped community account and does not create a Better Auth account.

The operator command runs with Node and the shipped SQLite dependency, without tsx. In a container, use `docker exec` with the same command and account-mode environment. Changing an organization to a different role clears its approval and qualifications. Historical resources and commitments remain; the operator must review and cancel affected commitments or pause resources after changing eligibility. Existing work is not automatically revoked.

`npm run demo:reset` is restricted to a demo dataset and rejects account mode. Keep demo and account database paths separate.

## Run the container

Build the provided Docker image from the repository root. Mount a persistent host directory at `/app/data`; the container runs as the unprivileged `node` user.

```sh
docker build -t community-help-network .
docker run -d --name community-help-network \
  -p 3000:3000 \
  -v community-help-data:/app/data \
  -e APP_MODE=accounts \
  -e APP_BASE_URL=https://community.example.org \
  -e BETTER_AUTH_SECRET=<stable-random-secret-at-least-32-characters> \
  community-help-network
```

Set optional database path variables only when you need paths other than the defaults. Keep the mounted data volume across container replacements. The image includes a health check for `/api/health`; Docker availability and a live container run have not been verified as part of this documentation update.

## Configure optional intake models

The default deterministic provider needs no key. For an Ollama instance that is already running, set `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL`, and `OLLAMA_MODEL`. The app does not install or download Ollama models. For an OpenAI-compatible hosted endpoint, set `AI_PROVIDER=hosted`, `HOSTED_AI_API_KEY`, `HOSTED_AI_BASE_URL`, and `HOSTED_AI_MODEL` on the server.

The intake provider receives the submitted text when configured. Provider output is provisional and validated, then the app applies independent safety checks. A model cannot set roles, assign helpers, change case state, or dispatch help. If the provider fails or returns invalid data, intake uses deterministic extraction.

The repeatable local Ollama check is `npm run check:live-ai -- http://127.0.0.1:3004`. Start a separate demo server on that address with `AI_PROVIDER=ollama` and an available local model first. The check fails if the server reports deterministic fallback or the response fails extraction validation. A verified run used `ministral-3:3b`; it is an example, not a model-quality guarantee. Hosted provider connectivity has not been verified.

## Local community features

The app includes private intake drafts, bounded neighborhood gatherings, opt-in volunteer profiles, self-described offer affiliations, English and Spanish core interface text, optional browser speech input, coordinator aggregate insights, interactive neighborhood maps, and a private community missing-person support workflow. Drafts stay private and outside matching until their author completes and links a reviewed request. Gatherings are community activities, not emergency dispatch. Volunteer profiles expose only ordinary capabilities, general areas and languages. Offer affiliations are not verified and do not affect eligibility. Speech input requires browser support and microphone permission; typed input remains available. User-submitted and model-generated text is not automatically translated. The three dedicated disaster screens currently use English fallback text.

Missing-person support lets coordinators keep a private report, ask its author questions and track status history; they may share a redacted notice with the broad community. Members may submit their own check-in name or a private tip. Name use requires separate consent from an adult, and revoking consent removes the name. A report's administrative closure does not assert reunification. This local workflow does not provide public search, identity verification, dispatch or live hazard data.

The Leaflet/OpenStreetMap map is geographically based around Chicago and shows five fictional neighborhood markers with illustrative positions. It does not show real incident coordinates, user GPS, routes, shelters or live hazards. Selecting a marker and using zoom were verified in the browser; tile availability depends on network access to the public tile service.

## Keep the deployment within its limits

Use a single Node service instance with persistent local storage for both SQLite databases. Do not mount the same SQLite files in multiple app instances. Arrange tested backups and restore procedures before storing account data.

This implementation does not configure email verification, remote password-reset delivery, external alerts, SMS, rescue dispatch, or real medical response. Organization approval is a local administrative decision, not external identity or qualification verification. Aggregates are coordinator-only local summaries, not public impact reporting. The missing-person workflow is limited to private local coordination and opt-in redacted community notices; there is no public search or dispatch. It has not been published as a hosted Site, and this guide does not claim that a Docker image or public deployment has been run. Review the [feature status](feature-status.md) and [original-handoff coverage audit](original-handoff-coverage.md) before relying on any workflow operationally.
