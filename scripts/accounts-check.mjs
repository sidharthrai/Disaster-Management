import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';

const base = (process.argv[2] || process.env.ACCOUNTS_BASE_URL || 'http://127.0.0.1:3002').replace(/\/$/, '');
const origin = new URL(base).origin;
const cookies = new Map();
async function request(path, body, authenticated = true) {
  const headers = { Origin: origin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated && cookies.size) headers.Cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  if (authenticated) {
    const setCookies = response.headers.getSetCookie?.() ?? (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
    for (const cookie of setCookies) {
      const [pair] = cookie.split(';'); const equals = pair.indexOf('=');
      if (equals > 0) { const name = pair.slice(0, equals); const value = pair.slice(equals + 1); if (value) cookies.set(name, value); else cookies.delete(name); }
    }
  }
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { throw new Error(`${path} returned non-JSON (${response.status})`); }
  return { status: response.status, data };
}
async function mustStatus(path, body, expected, authenticated = true) {
  const result = await request(path, body, authenticated);
  assert.equal(result.status, expected, `${path} returned ${result.status}, expected ${expected}`);
  return result.data;
}
await mustStatus('/api/state', undefined, 401, false);
await mustStatus('/api/command', { type: 'evaluateFollowUps' }, 401, false);
const email = `workflow-${randomUUID()}@example.invalid`;
const password = randomBytes(32).toString('base64url');
await mustStatus('/api/auth/sign-up/email', { name: 'Fictional workflow account', email, password }, 200);
let snapshot = await mustStatus('/api/state', undefined, 200);
assert.equal(snapshot.actor.role, 'member');
assert.equal(snapshot.actor.synthetic, false);
for (const body of [{ type: 'evaluateFollowUps' }, { type: 'clock', hours: 1 }, { type: 'reset' }, { type: 'emergency', event: 'Flood' }]) {
  const result = await request('/api/command', body);
  assert.equal(result.status, 403, `${body.type} must be unavailable to a new member`);
}
const switchResult = await request('/api/session', { id: 'u-coord' });
assert.equal(switchResult.status, 403, 'Account mode must reject demo identity switching');
await mustStatus('/api/auth/sign-out', {}, 200);
await mustStatus('/api/state', undefined, 401);
await mustStatus('/api/auth/sign-in/email', { email, password }, 200);
snapshot = await mustStatus('/api/state', undefined, 200);
assert.equal(snapshot.actor.role, 'member');
await mustStatus('/api/auth/sign-out', {}, 200);
await mustStatus('/api/state', undefined, 401);
process.stdout.write(`Account HTTP checks passed for ${base}. A fictional account remains in the isolated database; no email delivery was attempted.\n`);
