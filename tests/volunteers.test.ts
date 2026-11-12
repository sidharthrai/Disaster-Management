import { expect, it } from 'vitest';
import { SqliteRepository } from '../src/server/repository';
import { seedState } from '../src/domain/seed';
import { VolunteerDirectorySchema, VolunteersService } from '../src/domain/volunteers';

it('publishes only explicitly visible ordinary member profiles in the same community, and hides them on request or role change', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    repo.replace(seedState());
    const service = new VolunteersService(repo);
    const profile = { categories: ['Groceries'], areas: ['Riverside'], languages: ['English'], visible: false };
    service.save('u-mira', profile);
    expect(service.list('u-eli').volunteers).toEqual([]);
    service.save('u-mira', { ...profile, visible: true });
    expect(service.list('u-eli').volunteers[0]).toMatchObject({ id: 'u-mira', name: 'Mira Patel', categories: ['Groceries'] });
    expect(service.list('u-other').volunteers).toEqual([]);
    expect(() => service.save('u-org', profile)).toThrow();
    expect(() => service.save('u-mira', { ...profile, categories: ['Medical'] })).toThrow();
    expect(() => service.save('u-mira', { ...profile, email: 'private@example.org' })).toThrow();
    service.save('u-mira', profile);
    expect(service.list('u-eli').volunteers).toEqual([]);
    service.save('u-mira', { ...profile, visible: true });
    repo.transaction(state => { const user = state.users.find(item => item.id === 'u-mira'); if (user) user.role = 'organization'; });
    expect(service.list('u-eli').volunteers).toEqual([]);
    expect(() => service.save('u-mira', profile)).toThrow();
  } finally { repo.close(); }
});

it('counts only current or future valid active offers with incident readiness and returns a safe projection', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    const state = seedState();
    state.settings.now = '2026-01-01T12:00:00.000Z';
    state.settings.emergency = { id: 'event', type: 'Flood', name: 'Flood', startedAt: state.settings.now };
    state.offers = [
      { id: 'eligible', communityId: 'riverton', userId: 'u-mira', description: 'private', categories: ['Groceries'], area: 'Riverside', startAt: '2026-01-01T10:00:00.000Z', endAt: '2026-01-01T13:00:00.000Z', active: true, readyForEvent: 'event' },
      { id: 'expired', communityId: 'riverton', userId: 'u-mira', description: 'private', categories: ['Groceries'], area: 'Riverside', startAt: '2026-01-01T09:00:00.000Z', endAt: '2026-01-01T11:00:00.000Z', active: true, readyForEvent: 'event' },
      { id: 'unready', communityId: 'riverton', userId: 'u-mira', description: 'private', categories: ['Groceries'], area: 'Riverside', startAt: '2026-01-02T09:00:00.000Z', endAt: '2026-01-02T11:00:00.000Z', active: true, readyForEvent: null },
    ];
    repo.replace(state);
    const service = new VolunteersService(repo);
    service.save('u-mira', { categories: ['Groceries'], areas: ['Riverside'], languages: ['English'], visible: true });
    const result = VolunteerDirectorySchema.parse(service.list('u-eli'));
    expect(result.volunteers[0]?.eligibleOfferCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain('private');
  } finally { repo.close(); }
});
