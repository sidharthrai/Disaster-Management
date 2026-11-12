import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { GatheringsService } from '../src/domain/gatherings';
import { IntakeDraftsService } from '../src/domain/intake-drafts';
import { seedState } from '../src/domain/seed';
import { VolunteersService } from '../src/domain/volunteers';
import { SqliteRepository } from '../src/server/repository';

it('persists activity attendance, volunteer visibility and private drafts across reopening', () => {
  const dir = mkdtempSync(join(tmpdir(), 'remaining-features-'));
  const path = join(dir, 'network.sqlite');
  let repository: SqliteRepository | undefined;
  try {
    repository = new SqliteRepository(path);
    const seed = seedState();
    repository.replace(seed);
    const gatherings = new GatheringsService(repository);
    gatherings.execute('u-mira', { action: 'create', input: { kind: 'Food packing', area: 'Central Park', startAt: new Date(Date.parse(seed.settings.now) + 3600000).toISOString(), endAt: new Date(Date.parse(seed.settings.now) + 7200000).toISOString(), capacity: 2, notes: 'Private organizer note' } });
    const activity = gatherings.list('u-mira').gatherings[0];
    expect(activity).toBeDefined();
    if (!activity) throw new Error('Activity was not created');
    gatherings.execute('u-eli', { action: 'join', id: activity.id });
    new VolunteersService(repository).save('u-mira', { categories: ['Supplies'], areas: ['Central Park'], languages: ['English'], visible: true });
    const draft = new IntakeDraftsService(repository).execute('u-mira', { action: 'create', input: { text: 'Fictional request without a location', source: 'Website' } }).draft;
    repository.close();

    repository = new SqliteRepository(path);
    const reopenedGatherings = new GatheringsService(repository);
    expect(reopenedGatherings.list('u-mira').gatherings.find(item => item.id === activity.id)).toMatchObject({ count: 1, privateDetails: { notes: 'Private organizer note', participants: ['Eli Navarro'] } });
    expect(reopenedGatherings.list('u-eli').gatherings.find(item => item.id === activity.id)).toMatchObject({ count: 1, joined: true, privateDetails: null });
    expect(new VolunteersService(repository).list('u-eli').volunteers.find(item => item.id === 'u-mira')).toMatchObject({ categories: ['Supplies'], areas: ['Central Park'], languages: ['English'] });
    const reopenedDrafts = new IntakeDraftsService(repository);
    expect(reopenedDrafts.list('u-mira').drafts.find(item => item.id === draft.id)).toMatchObject({ status: 'awaiting_details', requestId: null });
    expect(reopenedDrafts.list('u-eli').drafts.some(item => item.id === draft.id)).toBe(false);
    expect(reopenedDrafts.list('u-coord').drafts.some(item => item.id === draft.id)).toBe(true);
    reopenedGatherings.execute('u-mira', { action: 'cancel', id: activity.id });
    new VolunteersService(repository).save('u-mira', { categories: ['Supplies'], areas: ['Central Park'], languages: ['English'], visible: false });
    reopenedDrafts.execute('u-mira', { action: 'withdraw', id: draft.id });
    repository.close();

    repository = new SqliteRepository(path);
    expect(new GatheringsService(repository).list('u-eli').gatherings.find(item => item.id === activity.id)).toMatchObject({ count: 1, cancelledAt: seed.settings.now, privateDetails: null });
    expect(new VolunteersService(repository).list('u-eli').volunteers.some(item => item.id === 'u-mira')).toBe(false);
    expect(new VolunteersService(repository).list('u-mira').ownProfile?.visible).toBe(false);
    expect(new IntakeDraftsService(repository).list('u-mira').drafts.find(item => item.id === draft.id)?.status).toBe('withdrawn');
  } finally {
    repository?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
