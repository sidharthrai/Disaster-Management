import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { SqliteRepository } from '../src/server/repository';
import { OrganizationDirectorySchema, OrganizationSaveResponseSchema, OrganizationsService } from '../src/domain/organizations';
import { seedState } from '../src/domain/seed';

it('limits profile editing to the organization owner and projects authoritative status', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    repo.replace(seedState());
    const service = new OrganizationsService(repo);
    const profile = { about: 'Neighbors helping neighbors', services: ['Groceries'], serviceAreas: ['Riverside'], website: 'https://example.org' };
    expect(() => service.save('u-mira', profile)).toThrow();
    expect(() => service.save('u-org', { ...profile, verified: true })).toThrow();
    expect(() => service.save('u-org', { ...profile, services: ['Medical'] })).toThrow();
    expect(() => service.save('u-org', { ...profile, website: 'https://user:pass@example.org' })).toThrow();
    service.save('u-org', profile);
    const org = service.list('u-mira').organizations.find(item => item.id === 'u-org');
    expect(org).toMatchObject({ name: 'Harbor Community Center', verified: true, synthetic: true, qualifiedCategories: [], profile });
    expect(JSON.stringify(org)).not.toContain('rawContent');
    expect(() => service.list('unknown')).toThrow();
  } finally { repo.close(); }
});

it('defaults legacy profiles and persists an organization profile in SQLite', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    const legacy = JSON.parse(JSON.stringify(seedState()));
    delete legacy.organizationProfiles;
    repo.replace(legacy);
    expect(repo.read().organizationProfiles).toEqual([]);
    new OrganizationsService(repo).save('u-care', { about: '', services: ['Medical'], serviceAreas: [], website: '' });
    expect(repo.read().organizationProfiles).toHaveLength(1);
  } finally { repo.close(); }
});


it('opens an older database without a profile table and retains saved profiles after reopening', () => {
  const dir = mkdtempSync(join(tmpdir(), 'org-profiles-'));
  const path = join(dir, 'network.sqlite');
  try {
    const initial = new SqliteRepository(path); initial.replace(seedState()); initial.close();
    const old = new Database(path); old.exec('DROP TABLE organizationProfiles'); old.close();
    const migrated = new SqliteRepository(path);
    expect(migrated.read().organizationProfiles).toEqual([]);
    new OrganizationsService(migrated).save('u-org', { about: 'Local support', services: ['Supplies'], serviceAreas: ['Riverside'], website: '' });
    migrated.close();
    const reopened = new SqliteRepository(path);
    expect(new OrganizationsService(reopened).list('u-mira').organizations.find(org => org.id === 'u-org')?.profile?.about).toBe('Local support');
    reopened.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('limits the directory to the actor community and removes medical advertising when qualification changes', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    const state = seedState();
    state.users.push({ ...state.users.find(user => user.id === 'u-org')!, id: 'other-org', name: 'Other organization', communityId: 'cove' });
    repo.replace(state);
    const service = new OrganizationsService(repo);
    expect(service.list('u-mira').organizations.some(org => org.id === 'other-org')).toBe(false);
    expect(service.list('u-care').organizations.find(org => org.id === 'u-care')?.profile?.services).toContain('Medical');
    repo.transaction(current => { current.users.find(user => user.id === 'u-care')!.verified = false; });
    expect(service.list('u-mira').organizations.find(org => org.id === 'u-care')?.profile?.services).not.toContain('Medical');
  } finally { repo.close(); }
});

it('rejects unsupported missing-person advertising and suppresses legacy services', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    const state = seedState();
    state.organizationProfiles.push({ id: 'u-org', about: '', services: ['Missing person'], serviceAreas: [], website: '' });
    repo.replace(state);
    const service = new OrganizationsService(repo);
    expect(service.list('u-mira').organizations.find(org => org.id === 'u-org')?.profile?.services).not.toContain('Missing person');
    expect(() => service.save('u-org', { about: '', services: ['Missing person'], serviceAreas: [], website: '' })).toThrow();
  } finally { repo.close(); }
});


it('validates directory responses and strips unknown private fields', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    repo.replace(seedState());
    const directory = new OrganizationsService(repo).list('u-mira');
    const parsed = OrganizationDirectorySchema.parse({ ...directory, rawContent: 'private', organizations: directory.organizations.map(org => ({ ...org, rawContent: 'private' })) });
    expect(JSON.stringify(parsed)).not.toContain('private');
    expect(OrganizationDirectorySchema.safeParse({ organizations: [{ id: 'bad' }] }).success).toBe(false);
    expect(OrganizationSaveResponseSchema.safeParse({ ok: 'yes' }).success).toBe(false);
  } finally { repo.close(); }
});
