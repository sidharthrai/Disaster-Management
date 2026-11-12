import { afterEach, describe, expect, it } from 'vitest';
import { SqliteRepository } from '../src/server/repository';
import { NetworkService } from '../src/domain/network';
import { seedState } from '../src/domain/seed';

const repositories: SqliteRepository[] = [];
function setup() {
  const repository = new SqliteRepository(':memory:'); repositories.push(repository);
  repository.replace(seedState());
  return { repository, network: new NetworkService(repository) };
}
afterEach(() => { repositories.splice(0).forEach(repository => repository.close()); });

describe('persistent community workflows', () => {
  it('requires both approvals, then confirms each need independently', () => {
    const { network } = setup();
    const id = network.createRequest('u-mira', { text: 'Groceries and a ride near Central Park today', categories: ['Groceries', 'Transport'], area: 'Central Park', windowStart: '2026-11-10T18:00:00.000Z', windowEnd: '2026-11-10T22:00:00.000Z', source: 'Website' });
    const detail = network.detail('u-mira', id);
    const need = detail.request.needs[0]!;
    const proposal = network.propose('u-eli', id, need.id, 'offer-eli', null);
    expect(network.detail('u-mira', id).request.needs[0]?.status).toBe('open');
    network.respond('u-mira', proposal, true);
    network.progress('u-eli', proposal, 'start');
    network.progress('u-eli', proposal, 'deliver');
    expect(network.detail('u-mira', id).status).toBe('Awaiting confirmation');
    expect(() => network.progress('u-eli', proposal, 'confirm')).toThrow();
    network.progress('u-mira', proposal, 'confirm');
    expect(network.detail('u-mira', id).status).not.toBe('Resolved');
    expect(network.detail('u-mira', id).request.needs[1]?.status).toBe('open');
  });
  it('does not leak raw intake in lists or detail to unrelated members', () => {
    const { network } = setup();
    const snapshot = network.snapshot('u-eli');
    expect(JSON.stringify(snapshot.requests)).not.toContain('rawContent');
    expect(JSON.stringify(snapshot.requests)).not.toContain('PRIVATE');
    expect(() => network.detail('u-eli', 'req-private')).toThrow();
    expect(network.detail('u-coord', 'req-private').rawContent).toContain('PRIVATE');
  });
  it('blocks private messages before agreement and access from outsiders', () => {
    const { network } = setup();
    expect(() => network.message('u-eli', 'req-grocery', 'unknown', 'hello')).toThrow();
    const proposal = network.propose('u-eli', 'req-grocery', 'need-grocery', 'offer-eli', null);
    network.respond('u-mira', proposal, true);
    network.message('u-eli', 'req-grocery', proposal, 'Meet by the blue gate');
    expect(network.detail('u-mira', 'req-grocery').messages).toHaveLength(1);
    expect(network.detail('u-teo', 'req-grocery').messages).toHaveLength(0);
  });
  it('rejects competing commitments and releases a cancelled need', () => {
    const { network } = setup();
    const p = network.propose('u-eli', 'req-grocery', 'need-grocery', 'offer-eli', null);
    network.respond('u-mira', p, true);
    expect(() => network.propose('u-teo', 'req-grocery', 'need-grocery', 'offer-teo', null)).toThrow();
    network.progress('u-eli', p, 'cancel');
    expect(network.detail('u-mira', 'req-grocery').request.needs[0]?.status).toBe('open');
    expect(network.detail('u-coord', 'req-grocery').flags.some(f => f.kind === 'cancelled')).toBe(true);
  });
  it('requires coordinator privileges and keeps administrative closure out of success', () => {
    const { network } = setup();
    expect(() => network.closeRequest('u-eli', 'req-grocery', 'unconfirmed', 'No response')).toThrow();
    const before = network.snapshot('u-coord').metrics.confirmed;
    network.closeRequest('u-coord', 'req-grocery', 'unconfirmed', 'Requester unavailable after follow-up');
    expect(network.snapshot('u-coord').metrics.confirmed).toBe(before);
    expect(network.detail('u-coord', 'req-grocery').status).toBe('Closed');
  });
  it('activates the same network but requires incident readiness to be renewed', () => {
    const { network } = setup();
    const count = network.snapshot('u-coord').users.length;
    expect(network.detail('u-mira', 'req-grocery').matches.length).toBeGreaterThan(0);
    network.setEmergency('u-coord', 'Flood');
    expect(network.snapshot('u-coord').users.length).toBe(count);
    expect(network.detail('u-mira', 'req-grocery').matches).toHaveLength(0);
    network.setOffer('u-eli', 'offer-eli', true, true);
    expect(network.detail('u-mira', 'req-grocery').matches.some(m => m.helperId === 'u-eli')).toBe(true);
  });
  it('follow-up is repeatable and cannot be triggered by ordinary members', () => {
    const { network } = setup();
    expect(() => network.advanceClock('u-eli', 6)).toThrow();
    network.advanceClock('u-coord', 6);
    const first = network.detail('u-coord', 'req-grocery').flags;
    const second = network.detail('u-coord', 'req-grocery').flags;
    expect(first).toEqual(second);
    expect(first.some(f => f.kind === 'unassigned')).toBe(true);
  });
  it('enforces community boundaries', () => {
    const { network } = setup();
    expect(() => network.detail('u-other', 'req-grocery')).toThrow();
    expect(network.snapshot('u-other').requests).toHaveLength(0);
  });
});

describe('privacy and resource invariants', () => {
  it('isolates replacement threads and revokes cancelled helpers', () => {
    const { network } = setup();
    const first = network.propose('u-eli', 'req-grocery', 'need-grocery', 'offer-eli', null);
    network.respond('u-mira', first, true);
    network.message('u-eli', 'req-grocery', first, 'First helper private note');
    network.progress('u-eli', first, 'cancel');
    const second = network.propose('u-teo', 'req-grocery', 'need-grocery', 'offer-teo', null);
    network.respond('u-mira', second, true);
    network.message('u-teo', 'req-grocery', second, 'Second helper private note');
    expect(network.detail('u-eli', 'req-grocery').messages).toEqual([]);
    expect(network.detail('u-teo', 'req-grocery').messages.map(m => m.text)).toEqual(['Second helper private note']);
    expect(network.detail('u-mira', 'req-grocery').messages).toHaveLength(2);
    expect(() => network.message('u-eli', 'req-grocery', second, 'intrusion')).toThrow();
  });
  it('keeps a manual private request in the reviewed organization referral workflow', () => {
    const { network } = setup();
    const id = network.createRequest('u-mira', { text: 'I need groceries in Central Park', categories: ['Groceries'], area: 'Central Park', windowStart: '2026-11-10T18:00:00.000Z', windowEnd: '2026-11-10T22:00:00.000Z', source: 'Website', private: true });
    expect(() => network.detail('u-eli', id)).toThrow();
    const need = network.detail('u-coord', id).request.needs[0]!;
    expect(() => network.propose('u-coord', id, need.id, null, 'resource-food')).toThrow();
    network.review('u-coord', id);
    const c = network.propose('u-coord', id, need.id, null, 'resource-food');
    network.respond('u-mira', c, true);
    expect(network.detail('u-org', id).commitments[0]?.status).toBe('proposed');
    network.respond('u-org', c, true);
    expect(network.detail('u-org', id).commitments[0]?.status).toBe('accepted');
  });
  it('revokes helper access and progress when moderation restricts a case', () => {
    const { network } = setup();
    const c = network.propose('u-eli', 'req-grocery', 'need-grocery', 'offer-eli', null);
    network.respond('u-mira', c, true);
    network.report('u-teo', 'req-grocery', 'Personal details need review');
    const report = network.snapshot('u-coord').reports[0]!;
    network.moderate('u-coord', report.id, true);
    expect(() => network.detail('u-eli', 'req-grocery')).toThrow();
    expect(() => network.progress('u-eli', c, 'start')).toThrow();
    expect(network.detail('u-coord', 'req-grocery').request.needs[0]?.status).toBe('open');
  });
  it('consumes delivered stock but releases pre-delivery stock and concurrent capacity', () => {
    const { network } = setup();
    const first = network.propose('u-mira', 'req-grocery', 'need-grocery', null, 'resource-food');
    network.respond('u-org', first, true);
    network.progress('u-org', first, 'cancel');
    expect(network.snapshot('u-mira').resources.find(r => r.id === 'resource-food')?.reserved).toBe(0);
    const second = network.propose('u-mira', 'req-grocery', 'need-grocery', null, 'resource-food');
    network.respond('u-org', second, true);
    network.progress('u-org', second, 'start');
    network.progress('u-org', second, 'deliver');
    network.progress('u-mira', second, 'cancel');
    expect(network.snapshot('u-mira').resources.find(r => r.id === 'resource-food')?.reserved).toBe(1);
    const id = network.createRequest('u-mira', { text: 'Need a ride in River Street', categories: ['Transport'], area: 'River Street', windowStart: '2026-11-10T18:00:00.000Z', windowEnd: '2026-11-10T22:00:00.000Z', source: 'Website' });
    const need = network.detail('u-mira', id).request.needs[0]!;
    const ride = network.propose('u-mira', id, need.id, null, 'resource-ride');
    network.respond('u-transport', ride, true);
    network.progress('u-transport', ride, 'start');
    network.progress('u-transport', ride, 'deliver');
    network.progress('u-mira', ride, 'confirm');
    expect(network.snapshot('u-mira').resources.find(r => r.id === 'resource-ride')?.reserved).toBe(0);
    expect(() => network.progress('u-mira', ride, 'confirm')).toThrow();
  });
  it('excludes self-owned resources and public overview private records', () => {
    const { network } = setup();
    const id = network.createRequest('u-org', { text: 'Need groceries in Central Park', categories: ['Groceries'], area: 'Central Park', windowStart: '2026-11-10T18:00:00.000Z', windowEnd: '2026-11-10T22:00:00.000Z', source: 'Website' });
    expect(network.detail('u-org', id).matches.some(m => m.id === 'resource-food')).toBe(false);
    const overview = JSON.stringify(network.publicOverview());
    expect(overview).not.toContain('req-private');
    expect(overview).not.toContain('rawContent');
    expect(overview).not.toContain('Medical');
  });
});

it('rechecks finite resource capacity when competing proposals are accepted', () => {
  const { repository, network } = setup();
  repository.transaction(state => { const r = state.resources.find(item => item.id === 'resource-food')!; r.capacity = 1; });
  const make = (userId: string) => network.createRequest(userId, { text: 'Need groceries in Central Park', categories: ['Groceries'], area: 'Central Park', windowStart: '2026-11-10T18:00:00.000Z', windowEnd: '2026-11-10T22:00:00.000Z', source: 'Website' });
  const one = make('u-mira'); const two = make('u-eli');
  const a = network.propose('u-mira', one, network.detail('u-mira', one).request.needs[0]!.id, null, 'resource-food');
  const b = network.propose('u-eli', two, network.detail('u-eli', two).request.needs[0]!.id, null, 'resource-food');
  network.respond('u-org', a, true);
  expect(() => network.respond('u-org', b, true)).toThrow();
  expect(repository.read().resources.find(r => r.id === 'resource-food')?.reserved).toBe(1);
});

it('retains consumed stock after administrative closure', () => {
  const { network } = setup();
  const c = network.propose('u-mira', 'req-grocery', 'need-grocery', null, 'resource-food');
  network.respond('u-org', c, true);
  network.progress('u-org', c, 'start'); network.progress('u-org', c, 'deliver');
  network.closeRequest('u-coord', 'req-grocery', 'unconfirmed', 'Unable to contact requester');
  expect(network.snapshot('u-coord').resources.find(r => r.id === 'resource-food')?.reserved).toBe(1);
});
