import { afterEach, expect, it } from 'vitest';
import { NetworkService } from '../src/domain/network';
import { seedState } from '../src/domain/seed';
import { DetailSchema, SnapshotSchema } from '../src/domain/views';
import { SqliteRepository } from '../src/server/repository';

const repositories: SqliteRepository[] = [];
function setup() {
  const repository = new SqliteRepository(':memory:');
  repositories.push(repository);
  repository.replace(seedState());
  return { repository, network: new NetworkService(repository) };
}
afterEach(() => repositories.splice(0).forEach(repository => repository.close()));

it('limits assignment and private notes to same-community coordinators and preserves them in the wire schema', () => {
  const { network } = setup();
  expect(() => network.assignCoordinator('u-eli', 'req-grocery', 'u-coord')).toThrow();
  expect(() => network.assignCoordinator('u-coord', 'req-grocery', 'u-other')).toThrow();
  network.assignCoordinator('u-coord', 'req-grocery', 'u-coord');
  network.addCoordinatorNote('u-coord', 'req-grocery', 'Private coordinator context');
  const coordinator = DetailSchema.parse(network.detail('u-coord', 'req-grocery'));
  expect(coordinator.coordinatorNotes[0]?.text).toBe('Private coordinator context');
  expect(coordinator.request.assignedCoordinatorId).toBe('u-coord');
  expect(DetailSchema.parse(network.detail('u-mira', 'req-grocery')).coordinatorNotes).toEqual([]);
  expect(JSON.stringify(SnapshotSchema.parse(network.snapshot('u-eli')))).not.toContain('Private coordinator context');
  expect(SnapshotSchema.parse(network.snapshot('u-coord')).emergencyDashboard).not.toBeNull();
});

it('preserves committed needs and revokes ordinary helper access when a correction becomes sensitive', () => {
  const { network } = setup();
  const proposal = network.propose('u-eli', 'req-grocery', 'need-grocery', 'offer-eli', null);
  network.respond('u-mira', proposal, true);
  const original = network.detail('u-coord', 'req-grocery').request;
  const input = { categories: ['Groceries', 'Medical'] as const, area: original.area, windowStart: original.windowStart, windowEnd: original.windowEnd, urgency: original.urgency, note: 'The requester also needs qualified medical help.' };
  expect(() => network.correctRequest('u-coord', original.id, { ...input, categories: ['Medical'] })).toThrow(/history/);
  expect(() => network.correctRequest('u-coord', original.id, { ...input, categories: [...input.categories], area: 'Oakridge' })).toThrow(/active/);
  network.review('u-coord', original.id);
  network.correctRequest('u-coord', original.id, { ...input, categories: [...input.categories] });
  const corrected = network.detail('u-coord', original.id);
  expect(corrected.request.needs.find(need => need.category === 'Groceries')?.id).toBe('need-grocery');
  expect(corrected.request.restricted).toBe(true);
  expect(corrected.reviewedBy).toBeNull();
  expect(corrected.commitments.find(c => c.id === proposal)?.status).toBe('cancelled');
  expect(() => network.detail('u-eli', original.id)).toThrow();
  expect(network.detail('u-mira', original.id).coordinatorNotes).toEqual([]);
});

it('exposes reconciled episodes and notifications through validated projections', () => {
  const { network } = setup();
  network.advanceClock('u-coord', 6);
  const snapshot = SnapshotSchema.parse(network.snapshot('u-coord'));
  expect(snapshot.notifications.length).toBeGreaterThan(0);
  expect(snapshot.requests.find(r => r.id === 'req-grocery')?.flags.length).toBeGreaterThan(0);
  expect(DetailSchema.parse(network.detail('u-coord', 'req-grocery')).followUpEpisodes.length).toBeGreaterThan(0);
  expect(SnapshotSchema.parse(network.snapshot('u-eli')).notifications.every(n => n.requestId !== 'req-private')).toBe(true);
});
