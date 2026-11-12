# Community Help Network

Community Help Network is a local mutual-aid demonstration for everyday needs and simulated emergencies. Members can post requests and offers, agree to connect, and coordinate privately after consent. Coordinators can review restricted cases, follow up on stalled requests, and manage simulated incident readiness.

## Run the local demo

Use Node.js with npm:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and choose **Enter demo**. The app creates fictional seed data in `data/community.sqlite`. The deterministic intake provider works without an API key. Run `npm run demo:reset` to restore the local demo database.

Follow the [two-to-three-minute demo](docs/demo.md) to see request creation, mutual agreement, outcome confirmation, coordinator follow-up, and incident readiness. The local app also supports private intake drafts, neighborhood gatherings, opt-in volunteer profiles, self-described offer affiliation, English and Spanish core interface text, browser speech input, a Chicago map with illustrative markers, and a private community missing-person support workflow.

## Run checks

```sh
npm run typecheck
npm test
npm run build
```

For a production build on the local machine, run `npm start`. The development and production commands bind to `127.0.0.1:3000`. While the app is running, `node scripts/demo-check.mjs` runs HTTP checks against the local server; it does not reset the database and leaves two uniquely named requests for inspection.

## Use account mode

Account mode provides password sign-up and sign-in for a single Node service. Set `APP_MODE=accounts`, an HTTPS `APP_BASE_URL`, and a stable `BETTER_AUTH_SECRET` with at least 32 characters. Keep the authentication and community SQLite files separate and persistent. Account mode starts with an empty community database; new signups receive the member role.

Read [the Node deployment guide](docs/deployment.md) for setup, account-role provisioning, container configuration, storage, and known limits. Password reset links are written to a private local outbox for an operator to deliver manually; remote email delivery is disabled. Member applications and coordinator decisions provide ordinary organization approval, not qualification verification.

## Configure optional intake providers

Copy `.env.example` to `.env.local` only when you want a non-default provider. `AI_PROVIDER=ollama` uses an Ollama service that is already running at `OLLAMA_BASE_URL`; the default model is `llama3.2:3b`. The app does not download models. `AI_PROVIDER=hosted` uses an OpenAI-compatible endpoint configured with server-only credentials and model settings.

Provider output is provisional. The app validates it, applies independent safety checks, and falls back to deterministic extraction if the provider fails. Model output cannot grant permissions, assign people, change case state, or dispatch help. Keep provider credentials out of browser code and source control. A live Ollama check is available with `npm run check:live-ai -- http://127.0.0.1:3004` when a demo server is running against the local Ollama service; hosted inference has not been configured.

## Scope and evidence

People, organizations, qualifications, offers, resources, reports and outcomes in demo mode are synthetic. The identity selector is not authentication. Do not enter real personal or emergency information. Missing-person support is a private, fictional community workflow; it does not provide public search, live alerts or dispatch. The app does not provide medical advice or verify identities or qualifications.

See [feature status](docs/feature-status.md) for implemented behavior and verification limits, [the original-handoff coverage audit](docs/original-handoff-coverage.md) for historical scope findings, and [the operating contract](docs/operations-contract.md) for command and data projection details. The docs do not claim a hosted Site or Docker deployment has been published and verified.

## Fast presentation build

Run `npm run demo:build`, then `npm run demo:start`. The optimized local demo starts at http://127.0.0.1:3005. Demo mode needs no password; choose a fictional member, coordinator or organization from the identity selector. Account mode uses registration and has no preset shared password.

Urgent help opens inside Disaster Management. After reviewed submission, the page shows a receipt and highlights the new request on the response board.
