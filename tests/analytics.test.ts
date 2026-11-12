import { describe, expect, it } from 'vitest';
import { seedState, hourFrom } from '../src/domain/seed';
import { InsightsResponseSchema, InsightsService } from '../src/domain/analytics';

describe('coordinator insights', () => {
  it('enforces identity, coordinator role and community boundaries without exposing private text', () => {
    const state = seedState(); const service = new InsightsService();
    expect(() => service.build(state, 'missing')).toThrow();
    expect(() => service.build(state, 'u-mira')).toThrow();
    const other = service.build(state, 'u-other');
    expect(other.totalRequests).toBe(0);
    expect(other.resources).toEqual([]);
    const result = service.build(state, 'u-coord');
    expect(JSON.stringify(result)).not.toContain('prescription');
    expect(result.totalRequests).toBe(state.requests.filter(r => r.communityId === 'riverton').length);
  });
  it('reports request and need outcomes separately and excludes bad timing records', () => {
    const state = seedState(); state.requests = state.requests.slice(0, 3); state.commitments = [];
    const [a, b, c] = state.requests; if (!a || !b || !c) throw new Error('seed requests missing');
    a.createdAt = hourFrom(-5); a.needs[0]!.status = 'resolved';
    b.createdAt = hourFrom(-5); b.needs[0]!.status = 'resolved'; b.windowEnd = hourFrom(-1);
    c.createdAt = hourFrom(-5); c.windowEnd = hourFrom(-1);
    const base = { needId: a.needs[0]!.id, helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'confirmed' as const, createdAt: hourFrom(-4), completedAt: null };
    state.commitments.push({ ...base, id: 'a', requestId: a.id, acceptedAt: hourFrom(-3) }, { ...base, id: 'b', requestId: b.id, acceptedAt: hourFrom(-1) }, { ...base, id: 'c', requestId: c.id, acceptedAt: hourFrom(-6) });
    const result = new InsightsService().build(state, 'u-coord');
    expect(result.fullyResolvedRequests).toBe(1); expect(result.confirmedNeeds).toBe(2); expect(result.overdueUnresolvedRequests).toBe(2);
    expect(result.everAcceptedRequests).toBe(3); expect(result.firstAcceptance).toEqual({ medianHours: 3, sampleCount: 2, invalidExcludedCount: 1 });
    expect(result.participation).toEqual({ helpersWithAcceptedCommitments: 1, communityMembers: state.users.filter(u => u.communityId === 'riverton' && u.role === 'member').length });
  });
  it('excludes missing and invalid historical acceptance times without inventing them', () => {
    const state = seedState(); state.requests = state.requests.slice(0, 2); state.commitments = [];
    const [a, b] = state.requests; if (!a || !b) throw new Error('seed requests missing');
    const base = { needId: a.needs[0]!.id, helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted' as const, createdAt: hourFrom(-4), completedAt: null };
    state.commitments.push({ ...base, id: 'missing', requestId: a.id, acceptedAt: null }, { ...base, id: 'invalid', requestId: b.id, acceptedAt: 'invalid' });
    expect(new InsightsService().build(state, 'u-coord').firstAcceptance).toEqual({ medianHours: null, sampleCount: 0, invalidExcludedCount: 2 });
  });
  it('keeps capacities separate and flags freshness, eligibility and synthetic ownership', () => {
    const state = seedState(); state.resources[0]!.verifiedAt = hourFrom(-25); state.resources[1]!.active = false;
    const result = new InsightsService().build(state, 'u-coord');
    expect(result.resources).toHaveLength(state.resources.length);
    expect(result.resources.find(r => r.id === state.resources[0]!.id)).toMatchObject({ fresh: false, eligible: false, synthetic: true });
    expect(result.resources.find(r => r.id === state.resources[1]!.id)).toMatchObject({ active: false, eligible: false });
    expect(result.resources.some(r => r.capacityMode === 'consumable')).toBe(true);
    expect(result.resources.some(r => r.capacityMode === 'concurrent')).toBe(true);
  });
});

it('excludes future creation and acceptance timestamps from the median', () => {
  const state = seedState(); state.requests = state.requests.slice(0, 2); state.commitments = [];
  const [a, b] = state.requests; if (!a || !b) throw new Error('seed requests missing');
  a.createdAt = hourFrom(-1); b.createdAt = hourFrom(1);
  const base = { needId: a.needs[0]!.id, helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted' as const, createdAt: hourFrom(-1), completedAt: null };
  state.commitments.push({ ...base, id: 'future-acceptance', requestId: a.id, acceptedAt: hourFrom(1) }, { ...base, id: 'future-creation', requestId: b.id, acceptedAt: hourFrom(2) });
  expect(new InsightsService().build(state, 'u-coord').firstAcceptance).toEqual({ medianHours: null, sampleCount: 0, invalidExcludedCount: 2 });
});


it('validates insights responses and strips unexpected private data', () => {
  const response = new InsightsService().build(seedState(), 'u-coord');
  const parsed = InsightsResponseSchema.parse({ ...response, rawContent: 'private' });
  expect(JSON.stringify(parsed)).not.toContain('private');
  expect(InsightsResponseSchema.safeParse({ ...response, firstAcceptance: { medianHours: 'bad' } }).success).toBe(false);
  expect(InsightsResponseSchema.safeParse({ ...response, asOf: 'not-a-date' }).success).toBe(false);
  const [resource, ...otherResources] = response.resources;
  if (!resource) throw new Error('seed resources missing');
  expect(InsightsResponseSchema.safeParse({ ...response, resources: [{ ...resource, updatedAt: 'not-a-date' }, ...otherResources] }).success).toBe(false);
  expect(InsightsResponseSchema.safeParse(response).success).toBe(true);
});
