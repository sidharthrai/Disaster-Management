import { describe, expect, it } from 'vitest';
import { neighborhoods, NeighborhoodsProjectionSchema } from '../src/domain/neighborhoods';
import { areas } from '../src/domain/model';
import { seedState } from '../src/domain/seed';

describe('neighborhood overview', () => {
  it('uses the fixed areas and excludes restricted, other-community and user-entered text even for coordinators', () => {
    const state = seedState();
    const coordinator = state.users.find(user => user.role === 'coordinator')!;
    const request = state.requests.find(item => !item.restricted && item.communityId === coordinator.communityId)!;
    request.title = 'SECRET title'; request.summary = 'SECRET summary'; request.rawContent = 'SECRET raw';
    state.requests.push({ ...structuredClone(request), id: 'other-community', communityId: 'elsewhere' });
    state.requests.push({ ...structuredClone(request), id: 'restricted', restricted: true });
    state.events.push({ id: 'event', requestId: request.id, actorId: coordinator.id, text: 'SECRET event', at: state.settings.now });
    const result = neighborhoods(state, coordinator.id);
    expect(NeighborhoodsProjectionSchema.parse(result)).toEqual(result);
    expect(result.areas.map(item => item.area)).toEqual([...areas]);
    expect(result.areas.flatMap(item => item.requests).map(item => item.id)).not.toContain('restricted');
    expect(result.areas.flatMap(item => item.requests).map(item => item.id)).not.toContain('other-community');
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect(() => neighborhoods(state, 'unknown')).toThrow();
  });
  it('separates fresh, qualified, ready and available resource listings from stale or unavailable listings', () => {
    const state = seedState();
    const owner = state.users.find(user => user.role === 'organization' && user.verified)!;
    const template = state.resources.find(resource => resource.ownerId === owner.id)!;
    state.settings.emergency = { id: 'incident', type: 'Flood', name: 'Test', startedAt: state.settings.now };
    const base = { ...template, communityId: owner.communityId, area: areas[0], category: 'Supplies' as const, active: true, capacity: 4, reserved: 1, verifiedAt: state.settings.now, readyForEvent: 'incident' };
    state.resources = [
      { ...base, id: 'ready' },
      { ...base, id: 'stale', verifiedAt: '2000-01-01T00:00:00Z' },
      { ...base, id: 'not-ready', readyForEvent: null },
      { ...base, id: 'full', reserved: 4 },
      { ...base, id: 'other', communityId: 'elsewhere' },
    ];
    const result = neighborhoods(state, owner.id).areas[0]!;
    expect(result.availableResources).toBe(1);
    expect(result.unavailableResources).toBe(3);
  });
});
