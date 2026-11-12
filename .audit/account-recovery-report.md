# Account recovery

Local account installations use Better Auth's reset tokens, a one-hour expiry and session revocation. A reset message goes to an owner-only JSONL outbox only when `APP_BASE_URL` names a loopback host. Remote installations have no reset delivery configured. Local recovery trusts the operator with filesystem access and does not establish mailbox ownership.

The default outbox is `data/recovery-outbox.jsonl`. Set `RECOVERY_OUTBOX_PATH` to change it. Its parent directory must be owned by the current user and not writable by group or others. The file must be a regular, owner-only file with one link. The application creates it with mode 0600. Protect backups and remove old messages according to local policy.

Run `node scripts/recovery-outbox.mjs person@example.invalid` from the app root to display the latest matching local message, then securely pass the link to the tester. Omitting the email displays the latest message. The command prints a sensitive link; do not paste its output into logs or public channels. It reads `.env.local` and `.env` and respects `RECOVERY_OUTBOX_PATH`. The link places the token in a URL fragment, and the form removes the fragment after reading it.

The routes are `/forgot-password` and `/reset-password`. `node scripts/recovery-check.mjs http://127.0.0.1:3002` exercises a running loopback account server and leaves a fictional account and outbox entry. The script needs Node with `fetch`, `Headers.getSetCookie` support for the running application, and `process.loadEnvFile`; it reads the same outbox path as the server. It does not start a server.

Focused verification passed with `npx vitest run tests/recovery.test.ts` and `npm run typecheck`. The test uses Better Auth's HTTP handler and a temporary SQLite database to check reset, replay rejection, old-password denial, session revocation, expiry, private file permissions and generic responses after delivery failure. The live server, browser flow and access-log inspection remain for the coordinator's integrated verification. Better Auth logs an operational error if outbox delivery fails while returning the same generic response for known and unknown accounts.
