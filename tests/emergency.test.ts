import { expect, it } from 'vitest';
import { seedState } from '../src/domain/seed';
import { buildEmergencyDashboard } from '../src/domain/emergency';
import { SnapshotSchema } from '../src/domain/views';
import { SqliteRepository } from '../src/server/repository';
import { NetworkService } from '../src/domain/network';

it('separates incident-linked cases, counts readiness and orders the queue', () => {
  const state = seedState(); const actor = state.users.find(u => u.id === 'u-coord')!;
  state.settings.emergency = { id: 'event', type: 'Flood', name: 'Flood', startedAt: state.settings.now };
  const [first, second] = state.requests; first!.incidentId = 'event'; first!.urgency = 'Urgent'; second!.urgency = 'Critical review';
  state.resources[0]!.readyForEvent = 'event'; state.resources[0]!.reserved = state.resources[0]!.capacity;
  state.resources[1]!.readyForEvent = 'event'; state.resources[1]!.verifiedAt = '2020-01-01T00:00:00.000Z';
  const dashboard = buildEmergencyDashboard(state, actor);
  expect(dashboard.network.requests).toBe(state.requests.length); expect(dashboard.incidentLinked.requests).toBe(1);
  expect(dashboard.resources.ready).toBe(0); expect(dashboard.resources.reserved).toBe(state.resources[0]!.capacity);
  expect(dashboard.priorityQueue[0]!.urgency).toBe('Critical review');
  expect(() => buildEmergencyDashboard(state, state.users.find(u => u.id === 'u-mira')!)).toThrow();
});

it('sorts equal urgency by overdue, age, and ID and keeps other communities out', () => {
  const state = seedState(); const actor = state.users.find(u => u.id === 'u-coord')!;
  state.requests = state.requests.slice(0, 3);
  for (const request of state.requests) { request.urgency = 'Urgent'; request.createdAt = '2026-11-10T17:00:00.000Z'; request.windowEnd = '2026-11-10T17:30:00.000Z'; }
  state.requests[0]!.id = 'b'; state.requests[1]!.id = 'a'; state.requests[2]!.id = 'c';
  state.requests[2]!.windowEnd = '2026-11-10T20:00:00.000Z';
  const outside = structuredClone(state.requests[0]!); outside.id = 'outside'; outside.communityId = 'cove'; state.requests.push(outside);
  const dashboard = buildEmergencyDashboard(state, actor);
  expect(dashboard.priorityQueue.map(r => r.requestId)).toEqual(['a', 'b', 'c']);
  expect(dashboard.network.requests).toBe(3);
});

it('projects eligibility and review needs without mixing resource units or communities', () => {
  const state = seedState(); const actor = state.users.find(u => u.id === 'u-coord')!;
  state.settings.emergency = { id: 'event', type: 'Flood', name: 'Flood', startedAt: state.settings.now };
  for (const resource of state.resources) resource.readyForEvent = 'event';
  const shelter = state.resources.find(r => r.category === 'Shelter')!;
  shelter.reserved = shelter.capacity;
  const transport = state.resources.find(r => r.category === 'Transport')!;
  transport.verifiedAt = '2020-01-01T00:00:00.000Z';
  const other = structuredClone(shelter); other.id = 'outside-resource'; other.communityId = 'cove'; state.resources.push(other);
  const dashboard = buildEmergencyDashboard(state, actor);
  expect(dashboard.resources.list.find(r => r.id === shelter.id)).toMatchObject({ eligible: false, available: 0, partnerName: 'Riverton Shelter Collective' });
  expect(dashboard.resources.list.find(r => r.id === transport.id)).toMatchObject({ eligible: false, available: 3 });
  expect(dashboard.resources.list.some(r => r.id === 'outside-resource')).toBe(false);
  expect(dashboard.resources.ready).toBe(3);
  expect(SnapshotSchema.shape.emergencyDashboard.parse(dashboard)).toEqual(dashboard);
  expect(dashboard.reviewQueue.some(r => r.requestId === 'req-private')).toBe(true);
  expect(dashboard.reviewQueue.some(r => r.requestId === 'req-grocery')).toBe(false);
  state.requests.find(r => r.id === 'req-private')!.reviewedBy = actor.id;
  state.requests.find(r => r.id === 'req-private')!.assignedCoordinatorId = actor.id;
  expect(buildEmergencyDashboard(state, actor).reviewQueue.some(r => r.requestId === 'req-private')).toBe(false);
});


it('requires eligible owners and exposes the dashboard only to coordinators', () => {
  const state = seedState(); const actor = state.users.find(u => u.id === 'u-coord')!;
  state.users.find(u => u.id === 'u-care')!.qualifiedCategories = [];
  const resource = buildEmergencyDashboard(state, actor).resources.list.find(r => r.category === 'Medical');
  expect(resource).toMatchObject({ eligible: false, reasons: ['Owner or category is not eligible'] });
  const repository = new SqliteRepository(':memory:');
  try {
    repository.replace(state);
    const network = new NetworkService(repository);
    const member = network.snapshot('u-eli');
    expect(member.emergencyDashboard).toBeNull();
    expect(member.requests.some(r => r.id === 'req-private')).toBe(false);
    const coordinator = SnapshotSchema.parse(network.snapshot(actor.id));
    expect(coordinator.emergencyDashboard?.reviewQueue.some(r => r.requestId === 'req-private')).toBe(true);
  } finally { repository.close(); }
});
