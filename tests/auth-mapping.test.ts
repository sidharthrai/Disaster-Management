import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mapAccount } from '../src/server/account-member';
import { repository } from '../src/server/services';

const directory = mkdtempSync(join(tmpdir(), 'community-members-'));
beforeAll(() => {
  process.env.APP_MODE = 'accounts';
  process.env.APP_BASE_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'test-only-secret-long-enough-for-better-auth';
  process.env.AUTH_DATABASE_PATH = join(directory, 'auth.sqlite');
  process.env.DATABASE_PATH = join(directory, 'community.sqlite');
});
afterAll(() => {
  repository().close();
  for (const key of ['APP_MODE', 'APP_BASE_URL', 'BETTER_AUTH_SECRET', 'AUTH_DATABASE_PATH', 'DATABASE_PATH']) delete process.env[key];
  rmSync(directory, { recursive: true, force: true });
});
it('maps an account idempotently to an unverified ordinary member in an empty live dataset', () => {
  expect(repository().read().users).toEqual([]);
  expect(mapAccount({ id: 'auth-user', name: 'Test Neighbor' })).toBe('account:auth-user');
  mapAccount({ id: 'auth-user', name: 'Changed Name' });
  const state = repository().read();
  expect(state.settings.clockMode).toBe('live');
  expect(state.users).toHaveLength(1);
  expect(state.users[0]).toMatchObject({ id: 'account:auth-user', name: 'Test Neighbor', role: 'member', synthetic: false, verified: false, qualifiedCategories: [] });
});
