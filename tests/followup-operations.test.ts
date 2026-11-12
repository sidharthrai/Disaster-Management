import { describe, expect, it } from 'vitest';
import { FollowUpService } from '../src/domain/followup';
import { hourFrom, seedState } from '../src/domain/seed';
import type { State } from '../src/domain/model';

function fixture() {
  const state = seedState();
  const request = state.requests.find(r => r.id === 'req-multi')!;
  state.requests = [request];
  state.commitments = [];
  request.createdAt = hourFrom(-4);
  request.windowEnd = hourFrom(4);
  return { state, request, service: new FollowUpService() };
}
function commitment(state: State, requestId: string, needId: string, overrides: Partial<State['commitments'][number]> = {}) {
  const item: State['commitments'][number] = { id: 'c1', requestId, needId, helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted', createdAt: hourFrom(-5), acceptedAt: hourFrom(-2), completedAt: null, ...overrides };
  state.commitments.push(item);
  return item;
}

describe('follow-up operations', () => {
  it('evaluates each open need and the latest cancelled connection independently of other active needs', () => {
    const { state, request, service } = fixture();
    commitment(state, request.id, request.needs[0]!.id, { status: 'cancelled' });
    commitment(state, request.id, request.needs[0]!.id, { id: 'new-proposal', status: 'proposed', createdAt: hourFrom(-1) });
    commitment(state, request.id, request.needs[1]!.id, { id: 'other-active', status: 'in_progress' });
    const flags = service.evaluate(state, request);
    expect(flags.filter(f => f.kind === 'cancelled').map(f => f.subjectId)).toEqual([request.needs[0]!.id]);
    expect(flags.filter(f => f.kind === 'unassigned').map(f => f.subjectId)).toEqual([request.needs[0]!.id]);
  });

  it('uses each lifecycle timestamp and requires both urgent owner and review', () => {
    const { state, request, service } = fixture();
    request.urgency = 'Urgent'; request.createdAt = hourFrom(-1);
    const c = commitment(state, request.id, request.needs[0]!.id, { createdAt: hourFrom(-10), acceptedAt: hourFrom(-1) });
    expect(service.evaluate(state, request).map(f => f.kind)).toContain('urgent_owner_review');
    expect(service.evaluate(state, request).map(f => f.kind)).not.toContain('accepted_idle');
    c.acceptedAt = hourFrom(-2);
    expect(service.evaluate(state, request).map(f => f.kind)).toContain('accepted_idle');
    request.assignedCoordinatorId = 'u-coord'; request.reviewedBy = 'u-coord';
    expect(service.evaluate(state, request).map(f => f.kind)).not.toContain('urgent_owner_review');
    c.status = 'delivered'; c.completedAt = hourFrom(-2);
    expect(service.evaluate(state, request).map(f => f.kind)).toContain('confirmation');
    c.status = 'proposed'; c.createdAt = hourFrom(-2);
    expect(service.evaluate(state, request).map(f => f.kind)).toContain('response');
  });

  it('detects source loss only for active work and accepts fully reserved capacity', () => {
    const { state, request, service } = fixture();
    const resource = state.resources[0]!; resource.capacity = resource.reserved = 1;
    const c = commitment(state, request.id, request.needs[0]!.id, { resourceId: resource.id });
    expect(service.evaluate(state, request).map(f => f.kind)).not.toContain('resource_loss');
    resource.active = false;
    expect(service.evaluate(state, request).map(f => f.kind)).toContain('resource_loss');
    c.status = 'delivered';
    expect(service.evaluate(state, request).map(f => f.kind)).not.toContain('resource_loss');
    c.status = 'in_progress'; resource.active = true; resource.verifiedAt = hourFrom(-25);
    expect(service.evaluate(state, request).map(f => f.kind)).toContain('resource_loss');
    resource.verifiedAt = state.settings.now; state.settings.emergency = { id: 'incident', type: 'Flood', name: 'Simulation', startedAt: state.settings.now };
    expect(service.evaluate(state, request).map(f => f.kind)).toContain('resource_loss');
  });

  it('preserves acknowledged history, resolves disappeared predicates and creates a fresh recurrence once', () => {
    const { state, request, service } = fixture();
    service.reconcile(state); const episode = state.followUpEpisodes.find(e => e.kind === 'unassigned')!;
    episode.acknowledgedAt = state.settings.now; episode.acknowledgedBy = 'u-coord';
    const count = state.notifications.length; service.reconcile(state);
    expect(episode.resolvedAt).toBeNull(); expect(state.notifications).toHaveLength(count);
    request.needs.find(n => n.id === episode.subjectId)!.status = 'connected'; service.reconcile(state);
    expect(episode.resolvedAt).toBe(state.settings.now);
    request.needs.find(n => n.id === episode.subjectId)!.status = 'open'; service.reconcile(state); service.reconcile(state);
    const episodes = state.followUpEpisodes.filter(e => e.kind === 'unassigned' && e.subjectId === episode.subjectId);
    expect(episodes).toHaveLength(2); expect(episodes[1]!.id).not.toBe(episode.id);
    expect(state.notifications).toHaveLength(count + 2);
    expect(state.notifications.filter(n => n.dedupeKey.includes(episodes[1]!.id)).map(n => n.recipientId).sort()).toEqual([request.requesterId, 'u-coord'].sort());
  });

  it('flags restricted review immediately and overdue unresolved work', () => {
    const { state, request, service } = fixture();
    request.restricted = true; request.createdAt = state.settings.now; request.windowEnd = hourFrom(-1);
    expect(service.evaluate(state, request).map(f => f.kind)).toEqual(expect.arrayContaining(['review', 'overdue']));
    request.closure = { outcome: 'withdrawn', reason: '', actorId: request.requesterId, at: state.settings.now };
    expect(service.evaluate(state, request)).toEqual([]);
  });
});
