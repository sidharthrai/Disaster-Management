import { expect, it } from 'vitest';
import { SqliteRepository } from '../src/server/repository';
import { seedState } from '../src/domain/seed';
import { OrganizationApprovalsService } from '../src/domain/organization-approvals';
import { ResourceService } from '../src/domain/resources';
import { MatchingService } from '../src/domain/matching';

const input = { description: 'Local pantry', services: ['Groceries'], serviceAreas: ['Riverside'] };
const create = () => { const repo = new SqliteRepository(':memory:'); repo.replace(seedState()); return { repo, service: new OrganizationApprovalsService(repo) }; };
it('restricts application privacy and decisions, and records transitions without replay', () => {
  const { repo, service } = create();
  try {
    service.execute('u-mira', { action: 'apply', input });
    const application = service.list('u-mira').applications[0]!;
    expect(service.list('u-eli').applications).toEqual([]);
    expect(service.list('u-other').applications).toEqual([]);
    expect(() => service.execute('u-other', { action: 'approve', id: application.id, reason: 'yes' })).toThrow();
    expect(() => service.execute('u-eli', { action: 'approve', id: application.id, reason: 'yes' })).toThrow();
    expect(() => service.execute('u-mira', { action: 'apply', input })).toThrow();
    expect(() => service.execute('u-coord', { action: 'approve', id: application.id, reason: ' ', verified: true })).toThrow();
    service.execute('u-coord', { action: 'approve', id: application.id, reason: 'Reviewed' });
    expect(() => service.execute('u-coord', { action: 'approve', id: application.id, reason: 'Again' })).toThrow();
    expect(repo.read().users.find(user => user.id === 'u-mira')).toMatchObject({ role: 'organization', verified: true, qualifiedCategories: [] });
    service.execute('u-coord', { action: 'revoke', id: application.id, reason: 'Review changed' });
    expect(() => service.execute('u-coord', { action: 'revoke', id: application.id, reason: 'Again' })).toThrow();
    expect(service.list('u-mira').applications[0]?.history.map(entry => entry.action)).toEqual(['submitted', 'approved', 'revoked']);
    expect(repo.read().users.find(user => user.id === 'u-mira')).toMatchObject({ role: 'organization', verified: false });
    service.execute('u-mira', { action: 'apply', input });
    const next = service.list('u-mira').applications.find(item => item.status === 'pending')!;
    service.execute('u-mira', { action: 'withdraw', id: next.id });
    expect(() => service.execute('u-coord', { action: 'decline', id: next.id, reason: 'late' })).toThrow();
  } finally { repo.close(); }
});
it('rejects sensitive claims and dormant qualifications even when qualifications drift after submission', () => {
  const { repo, service } = create();
  try {
    expect(() => service.execute('u-mira', { action: 'apply', input: { ...input, services: ['Medical'] } })).toThrow();
    expect(() => service.execute('u-mira', { action: 'apply', input: { ...input, services: ['Missing person'] } })).toThrow();
    service.execute('u-mira', { action: 'apply', input });
    const id = service.list('u-mira').applications[0]!.id;
    repo.transaction(state => { state.users.find(user => user.id === 'u-mira')!.qualifiedCategories = ['Medical']; });
    expect(() => service.execute('u-coord', { action: 'approve', id, reason: 'Review' })).toThrow(/operator review/);
    expect(repo.read().users.find(user => user.id === 'u-mira')).toMatchObject({ role: 'member', qualifiedCategories: ['Medical'] });
    expect(service.list('u-mira').applications[0]?.status).toBe('pending');
  } finally { repo.close(); }
});
it('allows ordinary resources after approval and removes them from matching after revocation without changing history', () => {
  const { repo, service } = create();
  try {
    service.execute('u-mira', { action: 'apply', input });
    const id = service.list('u-mira').applications[0]!.id;
    service.execute('u-coord', { action: 'approve', id, reason: 'Reviewed' });
    let resourceId = '';
    repo.transaction(state => {
      const owner = state.users.find(user => user.id === 'u-mira')!;
      const request = state.requests.find(item => item.id === 'req-grocery')!;
      request.requesterId = 'u-eli';
      resourceId = new ResourceService().create(state, owner, { name: 'Food', description: '', category: 'Groceries', area: request.area, capacityMode: 'consumable', capacity: 2 });
      expect(() => new ResourceService().create(state, owner, { name: 'Care', description: '', category: 'Medical', area: request.area, capacityMode: 'concurrent', capacity: 1 })).toThrow();
      const viewer = state.users.find(user => user.id === 'u-coord')!;
      expect(new MatchingService().find(state, request, viewer).some(match => match.id === resourceId)).toBe(true);
    });
    const before = repo.read().commitments;
    service.execute('u-coord', { action: 'revoke', id, reason: 'Review changed' });
    const state = repo.read();
    expect(state.commitments).toEqual(before);
    expect(state.resources.some(resource => resource.id === resourceId)).toBe(true);
    expect(new MatchingService().find(state, state.requests.find(item => item.id === 'req-grocery')!, state.users.find(user => user.id === 'u-coord')!).some(match => match.id === resourceId)).toBe(false);
  } finally { repo.close(); }
});
it('blocks self-decisions after role drift and records declines', () => {
  const { repo, service } = create();
  try {
    service.execute('u-mira', { action: 'apply', input });
    const id = service.list('u-mira').applications[0]!.id;
    repo.transaction(state => { state.users.find(user => user.id === 'u-mira')!.role = 'coordinator'; });
    expect(() => service.execute('u-mira', { action: 'approve', id, reason: 'self' })).toThrow();
    repo.transaction(state => { state.users.find(user => user.id === 'u-mira')!.role = 'member'; });
    service.execute('u-coord', { action: 'decline', id, reason: 'More detail needed' });
    expect(service.list('u-mira').applications[0]).toMatchObject({ status: 'declined', history: [{ action: 'submitted' }, { action: 'declined', actorId: 'u-coord', reason: 'More detail needed' }] });
  } finally { repo.close(); }
});
it('defaults applications when loading legacy state', () => {
  const { repo } = create();
  try {
    const legacy = JSON.parse(JSON.stringify(seedState()));
    delete legacy.organizationApplications;
    repo.replace(legacy);
    expect(repo.read().organizationApplications).toEqual([]);
  } finally { repo.close(); }
});
