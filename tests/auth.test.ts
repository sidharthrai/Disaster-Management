import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAuth } from '../src/server/auth';

const directory = mkdtempSync(join(tmpdir(), 'community-auth-'));
let auth: Awaited<ReturnType<typeof createAuth>>;
let sessionCookie = '';

async function request(path: string, body?: object, cookie?: string) {
  return auth.handler(new Request(`http://localhost:3000/api/auth${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { origin: 'http://localhost:3000', ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
}

describe('account authentication', () => {
  beforeAll(async () => {
    process.env.APP_MODE = 'accounts';
    process.env.APP_BASE_URL = 'http://localhost:3000';
    process.env.BETTER_AUTH_SECRET = 'test-only-secret-long-enough-for-better-auth';
    process.env.AUTH_DATABASE_PATH = join(directory, 'auth.sqlite');
    process.env.DATABASE_PATH = join(directory, 'community.sqlite');
    auth = await createAuth();
  });
  afterAll(() => {
    delete process.env.APP_MODE;
    delete process.env.APP_BASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.AUTH_DATABASE_PATH;
    delete process.env.DATABASE_PATH;
    rmSync(directory, { recursive: true, force: true });
  });
  it('registers, persists a session, signs out, and signs in with a password', async () => {
    const registered = await request('/sign-up/email', { name: 'Test Neighbor', email: 'neighbor@example.test', password: 'a-test-password' });
    expect(registered.status).toBe(200);
    const cookie = registered.headers.get('set-cookie');
    expect(cookie).toBeTruthy();
    sessionCookie = cookie!.split(';')[0]!;
    const authenticated = await request('/get-session', undefined, sessionCookie);
    expect((await authenticated.json()).user.email).toBe('neighbor@example.test');
    const signedOut = await request('/sign-out', {}, sessionCookie);
    expect(signedOut.status).toBe(200);
    expect(await (await request('/get-session', undefined, sessionCookie)).json()).toBeNull();
    const wrong = await request('/sign-in/email', { email: 'neighbor@example.test', password: 'wrong-password' });
    expect(wrong.ok).toBe(false);
    const signedIn = await request('/sign-in/email', { email: 'neighbor@example.test', password: 'a-test-password' });
    expect(signedIn.status).toBe(200);
  });
});
