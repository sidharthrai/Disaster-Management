import { expect, it } from 'vitest';
import { SqliteRepository } from '../src/server/repository';
import { seedState } from '../src/domain/seed';
import { OrganizationApprovalsService } from '../src/domain/organization-approvals';
import { ResourceService } from '../src/domain/resources';
import { NetworkService } from '../src/domain/network';
import { FollowUpService } from '../src/domain/followup';

it('revocation removes private progress access and flags the resource while preserving cancellation', () => {
  const repo = new SqliteRepository(':memory:'); repo.replace(seedState());
  try {
    const approvals = new OrganizationApprovalsService(repo); const network = new NetworkService(repo);
    approvals.execute('u-mira', { action: 'apply', input: { description: 'Local pantry', services: ['Groceries'], serviceAreas: ['Central Park'] } });
    const id = approvals.list('u-mira').applications[0]!.id;
    approvals.execute('u-coord', { action: 'approve', id, reason: 'Reviewed' });
    let resourceId = '';
    repo.transaction(state => {
      const request = state.requests.find(item => item.id === 'req-grocery')!;
      request.requesterId = 'u-eli'; request.restricted = true; request.reviewedBy = 'u-coord';
      resourceId = new ResourceService().create(state, state.users.find(user => user.id === 'u-mira')!, { name: 'Food', description: '', category: 'Groceries', area: request.area, capacityMode: 'concurrent', capacity: 2 });
    });
    const connection = network.propose('u-coord', 'req-grocery', 'need-grocery', null, resourceId);
    network.respond('u-mira', connection, true); network.respond('u-eli', connection, true);
    expect(network.detail('u-mira', 'req-grocery').request.id).toBe('req-grocery');
    approvals.execute('u-coord', { action: 'revoke', id, reason: 'Approval revoked' });
    expect(() => network.detail('u-mira', 'req-grocery')).toThrow();
    expect(() => network.progress('u-mira', connection, 'start')).toThrow();
    const state = repo.read();
    expect(new FollowUpService().evaluate(state, state.requests.find(item => item.id === 'req-grocery')!).some(flag => flag.kind === 'resource_loss' && flag.subjectId === connection)).toBe(true);
    repo.transaction(current => { current.commitments.find(item => item.id === connection)!.status = 'in_progress'; });
    expect(() => network.progress('u-mira', connection, 'deliver')).toThrow();
    network.progress('u-mira', connection, 'cancel');
    expect(repo.read().commitments.find(item => item.id === connection)?.status).toBe('cancelled');
  } finally { repo.close(); }
});

it('flags loss of medical qualification for an active resource', () => {
  const state = seedState(); const request = state.requests.find(item => item.id === 'req-private')!;
  state.commitments.push({ id: 'medical', requestId: request.id, needId: request.needs[0]!.id, helperId: 'u-care', offerId: null, resourceId: 'resource-care', requesterApproved: true, helperApproved: true, status: 'accepted', createdAt: state.settings.now, acceptedAt: state.settings.now, completedAt: null });
  const evaluate = () => new FollowUpService().evaluate(state, request).some(flag => flag.kind === 'resource_loss' && flag.subjectId === 'medical');
  expect(evaluate()).toBe(false);
  state.users.find(user => user.id === 'u-care')!.qualifiedCategories = [];
  expect(evaluate()).toBe(true);
});

it('allows the requester to confirm already reported delivery after revocation', () => {
  const repo = new SqliteRepository(':memory:'); const state = seedState();
  const request = state.requests.find(item => item.id === 'req-grocery')!;
  request.restricted = true; request.needs[0]!.status = 'awaiting_confirmation';
  state.users.find(user => user.id === 'u-org')!.verified = false;
  state.resources.find(item => item.id === 'resource-food')!.reserved = 1;
  state.commitments.push({ id: 'delivered-before-revocation', requestId: request.id, needId: request.needs[0]!.id, helperId: 'u-org', offerId: null, resourceId: 'resource-food', requesterApproved: true, helperApproved: true, status: 'delivered', createdAt: state.settings.now, acceptedAt: state.settings.now, completedAt: state.settings.now });
  repo.replace(state);
  try {
    new NetworkService(repo).progress(request.requesterId, 'delivered-before-revocation', 'confirm');
    expect(repo.read().commitments.find(item => item.id === 'delivered-before-revocation')?.status).toBe('confirmed');
  } finally { repo.close(); }
});
