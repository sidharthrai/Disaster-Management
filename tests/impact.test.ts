import { describe, expect, it } from 'vitest';
import { publicImpact, PublicImpactSchema } from '../src/domain/impact';
import { seedState } from '../src/domain/seed';

describe('public impact', () => {
  it('separates request outcomes from confirmed needs and administrative closures', () => {
    const state = seedState();
    const template = state.requests[0]!;
    const request = structuredClone(template);
    request.needs = [{ id: 'a', category: 'Groceries', status: 'resolved' }, { id: 'b', category: 'Transport', status: 'open' }];
    const resolved = structuredClone(request); resolved.id = 'resolved'; resolved.needs[1]!.status = 'resolved';
    const closed = structuredClone(resolved); closed.id = 'closed'; closed.closure = { outcome: 'referred', reason: 'private reason', actorId: 'private actor', at: state.settings.now };
    state.requests = [request, resolved, closed];
    const result = publicImpact(state);
    expect(result).toEqual({ submittedRequests: 3, openRequests: 1, fullyResolvedRequests: 1, confirmedNeeds: 3, categories: [{ category: 'Groceries', requests: 3 }, { category: 'Transport', requests: 3 }] });
    expect(PublicImpactSchema.parse(result)).toEqual(result);
  });

  it('excludes private, incident, sensitive and other community records and emits no case details', () => {
    const state = seedState();
    const template = structuredClone(state.requests[0]!);
    template.rawContent = 'SECRET CONTENT'; template.id = 'SECRET-ID'; template.requesterId = 'SECRET-PERSON';
    const restricted = structuredClone(template); restricted.restricted = true;
    const incident = structuredClone(template); incident.incidentId = 'SECRET-INCIDENT';
    const flagged = structuredClone(template); flagged.safetyFlags = ['sensitive'];
    const medical = structuredClone(template); medical.needs[0]!.category = 'Medical';
    const other = structuredClone(template); other.communityId = 'other';
    state.requests = [template, restricted, incident, flagged, medical, other];
    const result = publicImpact(state);
    expect(result.submittedRequests).toBe(1);
    expect(result.openRequests).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/SECRET|Medical|Riverside|Central Park/);
  });
});
