import { describe, expect, it } from 'vitest';
import { seedState } from '../src/domain/seed';
import { ResourceService } from '../src/domain/resources';
import { MatchingService } from '../src/domain/matching';

describe('resource operations', () => {
  it('protects ownership, qualification, capacity and historical semantics', () => {
    const state = seedState(); const service = new ResourceService();
    const owner = state.users.find(u => u.id === 'u-org')!; const other = state.users.find(u => u.id === 'u-shelter')!;
    const input = { name: 'Food', description: '', category: 'Groceries' as const, area: 'Central Park' as const, capacityMode: 'consumable' as const, capacity: 2 };
    const id = service.create(state, owner, input); const resource = state.resources.find(r => r.id === id)!;
    expect(() => service.edit(state, other, id, { ...input, active: true, ready: false })).toThrow();
    expect(() => service.create(state, owner, { ...input, category: 'Medical' })).toThrow();
    resource.reserved = 2;
    expect(() => service.setAvailability(state, owner, id, 2, true, false)).not.toThrow();
    expect(() => service.setAvailability(state, owner, id, 1, true, false)).toThrow();
    state.commitments.push({ id: 'past', requestId: 'x', needId: 'x', helperId: owner.id, offerId: null, resourceId: id, requesterApproved: false, helperApproved: false, status: 'rejected', createdAt: state.settings.now, acceptedAt: null, completedAt: null });
    expect(() => service.edit(state, owner, id, { ...input, category: 'Supplies', active: true, ready: false })).toThrow();
  });
  it('requires verified qualified medical resources with fresh availability', () => {
    const state = seedState(); const request = state.requests.find(r => r.id === 'req-private')!; const viewer = state.users.find(u => u.id === 'u-coord')!; const owner = state.users.find(u => u.id === 'u-care')!;
    const find = () => new MatchingService().find(state, request, viewer).filter(m => m.kind === 'resource');
    expect(find()).toHaveLength(1);
    owner.qualifiedCategories = []; expect(find()).toHaveLength(0);
    owner.qualifiedCategories = ['Medical']; owner.verified = false; expect(find()).toHaveLength(0);
    owner.verified = true; state.resources.find(r => r.id === 'resource-care')!.verifiedAt = '2020-01-01T00:00:00.000Z'; expect(find()).toHaveLength(0);
  });
});

it('does not autonomously match specialized offers, missing-person resources, or the requester’s own resource', () => {
  const state = seedState(); const viewer = state.users.find(u => u.id === 'u-coord')!; const request = state.requests.find(r => r.id === 'req-grocery')!;
  const offer = state.offers[0]!; offer.categories = ['Medical', 'Missing person']; offer.area = request.area;
  const resource = state.resources[0]!; resource.category = 'Missing person';
  request.needs[0]!.category = 'Missing person';
  expect(new MatchingService().find(state, request, viewer)).toHaveLength(0);
  request.needs[0]!.category = 'Medical';
  expect(new MatchingService().find(state, request, viewer).filter(m => m.kind === 'offer')).toHaveLength(0);
  request.needs[0]!.category = 'Groceries'; resource.category = 'Groceries'; request.requesterId = resource.ownerId;
  expect(new MatchingService().find(state, request, viewer).some(m => m.id === resource.id)).toBe(false);
});
