# Community Help Network

Community Help Network is a local demo of everyday mutual aid that a community can reuse during an emergency. Members can post safe summaries, offer help, agree to a connection, and coordinate privately after both sides consent. Coordinators can review sensitive cases and follow up when a request stalls.

## Start the app

Use Node.js with npm, then run these commands from the project directory:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. The app stores synthetic community data in `data/community.sqlite`. The default intake provider needs no API key and uses deterministic extraction. Run `npm run demo:reset` to replace the local database with the seeded demo data.

This checkout was installed with `npm install --cache /private/tmp/community-help-npm-cache --legacy-peer-deps` because the managed environment restricted the default cache and its npm resolver failed. Use that fallback if the normal install fails in the same environment. The interface uses custom shared controls; shadcn/ui and Astryx are not integrated.

Use `npm run build` to create a production build and `npm start` to serve it on `127.0.0.1:3000`. Run `npm test` for the Vitest suite and `npm run typecheck` for the TypeScript check. While the app is running, execute `node scripts/demo-check.mjs` for local HTTP checks. Pass a base URL as the first argument or set `DEMO_BASE_URL` to target another local instance. The smoke script does not reset the database and leaves two uniquely named requests for inspection.

## Configure optional intake providers

Copy `.env.example` to `.env.local` only if you want to select another intake provider. `AI_PROVIDER=ollama` selects an Ollama service already running at `OLLAMA_BASE_URL`; the default model name is `llama3.2:3b`. The app does not download models. `AI_PROVIDER=hosted` selects the OpenAI-compatible hosted adapter. Set its server-only API key, base URL, and model name in the server environment. Keep credentials out of browser code and source control.

If a selected provider is unavailable, times out, or returns invalid structured data, intake falls back to deterministic extraction. Provider output remains provisional. The app independently retains source-supported area and timing, does not infer a people count, and applies safety flags. It never grants permissions, changes case state, or dispatches help based on model output.

## Demo boundaries

The seeded members, organizations, offers, resources, verification labels, messages, and outcomes are synthetic. The identity selector is for this local demo. It is not production authentication and does not verify a person's identity or qualifications. Do not put real personal or emergency information in this demo.

The app accepts bounded text intake, validates structured fields, and keeps original request text private. Members see a safe summary and general neighborhood. Private coordination requires an agreed commitment. Medical and missing-person content is restricted for human review. The app does not provide diagnosis, treatment, rescue dispatch, real alerts, live SMS or social ingestion, or real-world identity verification.

The SQLite database is intended for one local app instance. Do not run multiple app instances against the same file or use this setup as a public production service. Production use needs real authentication, an operational privacy and security review, and a database and deployment design for concurrent service.

See [the two-to-three-minute demo](docs/demo.md) for the presentation path, [feature status](docs/feature-status.md) for implementation evidence, and [the original-handoff coverage audit](docs/original-handoff-coverage.md) for completed, simulated, partial and missing requirements. The audit identifies three open intake defects and does not claim full original-handoff completion.
