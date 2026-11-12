import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, expect, it } from 'vitest';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture(clockMode: string) {
  const dir = mkdtempSync(join(tmpdir(), 'deployment-safety-')); dirs.push(dir);
  const path = join(dir, 'community.sqlite');
  const db = new Database(path);
  db.exec('CREATE TABLE settings (id TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE users (id TEXT PRIMARY KEY, payload TEXT NOT NULL)');
  db.prepare('INSERT INTO settings VALUES (?, ?)').run('community', JSON.stringify({ clockMode }));
  db.prepare('INSERT INTO users VALUES (?, ?)').run('account:test', JSON.stringify({ id: 'account:test', synthetic: false, role: 'member', verified: false, qualifiedCategories: [], extra: 'preserved' }));
  db.close(); return path;
}
function run(script: string, args: string[], path: string, mode: string) {
  return spawnSync(process.execPath, script.endsWith('.ts') ? ['--import', 'tsx', script, ...args] : [script, ...args], { env: { ...process.env, APP_MODE: mode, DATABASE_PATH: path }, encoding: 'utf8' });
}
function user(path: string) { const db = new Database(path, { readonly: true }); try { const row = db.prepare('SELECT payload FROM users WHERE id = ?').get('account:test') as { payload: string }; return JSON.parse(row.payload); } finally { db.close(); } }

it('refuses to reset live data in either mode without altering it', () => {
  const path = fixture('live');
  for (const mode of ['accounts', 'demo']) expect(run('scripts/reset-demo.ts', [], path, mode).status).not.toBe(0);
  expect(user(path)).toMatchObject({ role: 'member', verified: false, extra: 'preserved' });
});
it('updates only an explicitly mapped live account and requires explicit verification', () => {
  const path = fixture('live');
  expect(run('scripts/account-role.mjs', ['account:test', 'organization', 'Medical'], path, 'accounts').status).toBe(0);
  expect(user(path)).toMatchObject({ role: 'organization', verified: false, qualifiedCategories: ['Medical'], extra: 'preserved' });
  expect(run('scripts/account-role.mjs', ['account:test', 'organization', 'Medical', '--verify'], path, 'accounts').status).toBe(0);
  expect(user(path).verified).toBe(true);
  for (const args of [['account:test', 'member', 'Medical'], ['account:missing', 'organization', '--verify'], ['account:test', 'organization', 'invalid']]) expect(run('scripts/account-role.mjs', args, path, 'accounts').status).not.toBe(0);
  expect(user(path)).toMatchObject({ role: 'organization', verified: true, qualifiedCategories: ['Medical'], extra: 'preserved' });
  expect(run('scripts/account-role.mjs', ['account:test', 'member'], path, 'accounts').status).toBe(0);
  expect(run('scripts/account-role.mjs', ['account:test', 'organization'], path, 'accounts').status).toBe(0);
  expect(user(path).verified).toBe(false);
});
it('refuses to change demo datasets', () => {
  const path = fixture('demo');
  expect(run('scripts/account-role.mjs', ['account:test', 'organization', '--verify'], path, 'accounts').status).not.toBe(0);
  expect(user(path).verified).toBe(false);
});
it('seeds a new demo dataset', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deployment-safety-')); dirs.push(dir);
  const path = join(dir, 'demo.sqlite');
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/reset-demo.ts'], { env: { ...process.env, APP_MODE: 'demo', DATABASE_PATH: path } });
  const db = new Database(path, { readonly: true });
  try { expect(db.prepare('SELECT count(*) AS count FROM users').get()).toMatchObject({ count: expect.any(Number) }); } finally { db.close(); }
});
