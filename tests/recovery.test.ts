import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { createAuth } from '../src/server/auth';
import { isLocalRecoveryOrigin, writeRecoveryMessage } from '../src/server/recovery-delivery';

const directory = mkdtempSync(join(tmpdir(), 'community-recovery-'));
const outbox = join(directory, 'outbox.jsonl');
let auth: Awaited<ReturnType<typeof createAuth>>;
async function request(path: string, body?: object, cookie?: string) {
  return auth.handler(new Request(`http://localhost:3000/api/auth${path}`, { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost:3000', ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
}
function lastLink() {
  const records: { url: string }[] = readFileSync(outbox, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  return new URL(records.at(-1)!.url);
}
describe('account recovery', () => {
  beforeAll(async () => {
    process.env.APP_MODE = 'accounts'; process.env.APP_BASE_URL = 'http://localhost:3000'; process.env.BETTER_AUTH_SECRET = 'test-only-secret-long-enough-for-better-auth';
    process.env.AUTH_DATABASE_PATH = join(directory, 'auth.sqlite'); process.env.DATABASE_PATH = join(directory, 'community.sqlite'); process.env.RECOVERY_OUTBOX_PATH = outbox;
    auth = await createAuth();
  });
  afterAll(() => { for (const key of ['APP_MODE', 'APP_BASE_URL', 'BETTER_AUTH_SECRET', 'AUTH_DATABASE_PATH', 'DATABASE_PATH', 'RECOVERY_OUTBOX_PATH']) delete process.env[key]; rmSync(directory, { recursive: true, force: true }); });
  it('allows only loopback delivery and stores private messages', () => {
    expect(isLocalRecoveryOrigin('http://localhost:3000')).toBe(true);
    expect(isLocalRecoveryOrigin('https://example.com')).toBe(false);
    writeRecoveryMessage({ email: 'fictional@example.test', url: 'http://localhost:3000/test' });
    expect(statSync(outbox).mode & 0o777).toBe(0o600);
  });
  it('resets once, revokes sessions, and rejects expired tokens', async () => {
    const email = 'neighbor@example.test';
    const registered = await request('/sign-up/email', { name: 'Neighbor', email, password: 'old-password' });
    expect(registered.status).toBe(200);
    const cookie = registered.headers.get('set-cookie')!.split(';')[0]!;
    const missing = await request('/request-password-reset', { email: 'missing@example.test', redirectTo: '/reset-password' });
    const requested = await request('/request-password-reset', { email, redirectTo: '/reset-password' });
    expect(await requested.json()).toEqual(await missing.json());
    const token = new URLSearchParams(lastLink().hash.slice(1)).get('token')!;
    expect((await request('/reset-password', { token, newPassword: 'new-password' })).status).toBe(200);
    expect((await request('/reset-password', { token, newPassword: 'other-password' })).ok).toBe(false);
    expect(await (await request('/get-session', undefined, cookie)).json()).toBeNull();
    expect((await request('/sign-in/email', { email, password: 'old-password' })).ok).toBe(false);
    expect((await request('/sign-in/email', { email, password: 'new-password' })).status).toBe(200);
    expect((await request('/request-password-reset', { email, redirectTo: '/reset-password' })).status).toBe(200);
    const expired = new URLSearchParams(lastLink().hash.slice(1)).get('token')!;
    const database = new Database(join(directory, 'auth.sqlite'));
    database.prepare('UPDATE verification SET expiresAt = ? WHERE identifier = ?').run(new Date(0).toISOString(), `reset-password:${expired}`);
    database.close();
    expect((await request('/reset-password', { token: expired, newPassword: 'another-password' })).ok).toBe(false);
  });
  it('returns the same generic response when delivery fails', async () => {
    process.env.RECOVERY_OUTBOX_PATH = join(directory, 'auth.sqlite', 'outbox');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3_600_000);
    const known = await request('/request-password-reset', { email: 'neighbor@example.test', redirectTo: '/reset-password' });
    const missing = await request('/request-password-reset', { email: 'missing-again@example.test', redirectTo: '/reset-password' });
    expect(known.status).toBe(200);
    expect(missing.status).toBe(200);
    expect(await known.json()).toEqual(await missing.json());
    clock.mockRestore();
    process.env.RECOVERY_OUTBOX_PATH = outbox;
  });
});
