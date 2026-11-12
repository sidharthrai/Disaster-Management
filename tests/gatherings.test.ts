import { describe, expect, it } from 'vitest';
import { SqliteRepository } from '../src/server/repository';
import { GatheringsProjectionSchema, GatheringsService } from '../src/domain/gatherings';
import { seedState } from '../src/domain/seed';

describe('group activities', () => {
  it('enforces capacity, duplicate participation, cancellation and history inside SQLite transactions', () => {
    const repo = new SqliteRepository(':memory:');
    try {
      const state = seedState(); repo.replace(state);
      const service = new GatheringsService(repo);
      const organizer = state.users.find(user => user.role === 'member')!;
      const other = state.users.find(user => user.id !== organizer.id && user.communityId === organizer.communityId)!;
      const coordinator = state.users.find(user => user.role === 'coordinator' && user.communityId === organizer.communityId)!;
      const startAt = new Date(Date.parse(state.settings.now) + 3600000).toISOString();
      const endAt = new Date(Date.parse(startAt) + 3600000).toISOString();
      const input = { kind: 'Food packing', area: organizer.area, startAt, endAt, capacity: 1, notes: 'Private note' };
      expect(() => service.execute(organizer.id, { action: 'create', input: { ...input, kind: 'Unlisted text' } })).toThrow();
      expect(() => service.execute(organizer.id, { action: 'create', input: { ...input, startAt: state.settings.now } })).toThrow();
      expect(() => service.execute(organizer.id, { action: 'create', input: { ...input, capacity: 101 } })).toThrow();
      service.execute(organizer.id, { action: 'create', input });
      const item = service.list(organizer.id).gatherings[0]!;
      expect(item).toMatchObject({ count: 0, joined: false, privateDetails: { notes: 'Private note', participants: [] } });
      service.execute(organizer.id, { action: 'join', id: item.id });
      expect(() => service.execute(organizer.id, { action: 'join', id: item.id })).toThrow(/already joined/);
      expect(() => service.execute(other.id, { action: 'join', id: item.id })).toThrow(/full/);
      const publicView = GatheringsProjectionSchema.parse(service.list(other.id));
      expect(publicView.gatherings[0]).toMatchObject({ count: 1, joined: false, privateDetails: null });
      expect(JSON.stringify(publicView)).not.toContain('Private note');
      expect(service.list(coordinator.id).gatherings[0]?.privateDetails?.participants).toEqual([organizer.name]);
      service.execute(organizer.id, { action: 'leave', id: item.id });
      service.execute(other.id, { action: 'join', id: item.id });
      if (other.role !== 'coordinator') expect(() => service.execute(other.id, { action: 'cancel', id: item.id })).toThrow();
      service.execute(coordinator.id, { action: 'cancel', id: item.id });
      expect(() => service.execute(other.id, { action: 'leave', id: item.id })).toThrow(/cancelled/);
      expect(() => service.execute(organizer.id, { action: 'join', id: item.id })).toThrow(/cancelled/);
      expect(service.list(coordinator.id).gatherings[0]).toMatchObject({ count: 1, cancelledAt: state.settings.now, privateDetails: { participants: [other.name] } });
    } finally { repo.close(); }
  });
  it('isolates communities and rejects joining after the end', () => {
    const repo = new SqliteRepository(':memory:');
    try {
      const state = seedState(); const actor = state.users[0]!; const outsider = state.users[1]!; outsider.communityId = 'another-community'; repo.replace(state);
      const service = new GatheringsService(repo);
      const startAt = new Date(Date.parse(state.settings.now) + 3600000).toISOString();
      const endAt = new Date(Date.parse(startAt) + 3600000).toISOString();
      service.execute(actor.id, { action: 'create', input: { kind: 'Skill sharing', area: actor.area, startAt, endAt, capacity: 2, notes: 'secret' } });
      const id = service.list(actor.id).gatherings[0]!.id;
      expect(service.list(outsider.id).gatherings).toEqual([]);
      expect(() => service.execute(outsider.id, { action: 'join', id })).toThrow(/not found/);
      repo.transaction(current => { current.settings.now = endAt; });
      expect(() => service.execute(actor.id, { action: 'join', id })).toThrow(/ended/);
      expect(() => service.list('unknown')).toThrow();
    } finally { repo.close(); }
  });
});
