import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

for (const name of ['.env.local', '.env']) if (existsSync(name)) process.loadEnvFile(name);
const base = new URL(process.argv[2] || process.env.ACCOUNTS_BASE_URL || 'http://127.0.0.1:3002');
if (!['http:', 'https:'].includes(base.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('The recovery check requires a loopback origin.');
const outbox = process.env.RECOVERY_OUTBOX_PATH || 'data/recovery-outbox.jsonl';
const email = `recovery-${randomUUID()}@example.invalid`;
const oldPassword = randomBytes(32).toString('base64url');
const newPassword = randomBytes(32).toString('base64url');
async function request(path, body, cookie) {
  return fetch(new URL(path, base), { method: body ? 'POST' : 'GET', headers: { Origin: base.origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'manual' });
}
const registered = await request('/api/auth/sign-up/email', { name: 'Fictional Recovery Test', email, password: oldPassword });
assert.equal(registered.status, 200, 'Registration failed');
const cookie = registered.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie, 'Registration did not issue a session');
const requested = await request('/api/auth/request-password-reset', { email, redirectTo: '/reset-password' });
assert.equal(requested.status, 200, 'Reset request failed');
const records = readFileSync(outbox, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const record = records.findLast(item => item.email === email);
assert.ok(record, 'Local recovery message was not delivered');
const link = new URL(record.url);
assert.equal(link.origin, base.origin);
assert.equal(link.pathname, '/reset-password');
const token = new URLSearchParams(link.hash.slice(1)).get('token');
assert.ok(token, 'Recovery link has no token');
assert.equal((await request('/api/auth/reset-password', { token, newPassword })).status, 200, 'Reset failed');
assert.equal((await request('/api/auth/reset-password', { token, newPassword })).ok, false, 'Token replay succeeded');
assert.equal(await (await request('/api/auth/get-session', undefined, cookie)).json(), null, 'Previous session remained valid');
assert.equal((await request('/api/auth/sign-in/email', { email, password: oldPassword })).ok, false, 'Old password remained valid');
assert.equal((await request('/api/auth/sign-in/email', { email, password: newPassword })).status, 200, 'New password failed');
process.stdout.write('Recovery HTTP checks passed. A fictional account and private outbox entry remain.\n');
