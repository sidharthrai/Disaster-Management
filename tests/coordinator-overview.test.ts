import { expect, it } from 'vitest';
import { seedState } from '../src/domain/seed';
import { NetworkService } from '../src/domain/network';
import { SqliteRepository } from '../src/server/repository';
import { coordinatorMetrics, filterCoordinatorRequests } from '../src/lib/coordinator-overview';

it('counts open work and active helpers without treating closed cases as successful', () => {
  const repository = new SqliteRepository(':memory:');
  try {
    repository.replace(seedState());
    const snapshot = new NetworkService(repository).snapshot('u-coord');
    const first = snapshot.requests[0]!;
    const open = { ...first, id: 'open', status: 'Open' as const, closure: null, urgency: 'Urgent' as const, needs: [{ ...first.needs[0]!, id: 'need-open', status: 'open' as const }], flags: [{ kind: 'review', subjectId: 'open', severity: 'urgent' as const, description: 'Review' }] };
    const closed = { ...open, id: 'closed', status: 'Closed' as const, closure: { outcome: 'unconfirmed' as const, reason: '', actorId: 'u-coord', at: '' } };
    const awaiting = { ...open, id: 'awaiting', status: 'Awaiting confirmation' as const, urgency: 'Routine' as const, needs: [{ ...open.needs[0]!, id: 'need-awaiting', status: 'awaiting_confirmation' as const }], flags: [] };
    const commitment = { id: 'c', requestId: 'awaiting', needId: 'need-awaiting', helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'delivered' as const, createdAt: '', acceptedAt: '', completedAt: '' };
    expect(coordinatorMetrics({ requests: [open, closed, awaiting], commitments: [commitment] })).toEqual({ openRequests: 2, openNeedsWithoutHelper: 1, awaitingConfirmation: 1, urgentRequests: 1, reviewNeeded: 1, activeHelpers: 1 });
  } finally { repository.close(); }
});

it('combines helper selection with the other queue filters and ignores ended commitments', () => {
  const repository = new SqliteRepository(':memory:');
  try {
    repository.replace(seedState());
    const snapshot = new NetworkService(repository).snapshot('u-coord');
    const request = snapshot.requests[0]!;
    const base = { id: 'c', requestId: request.id, needId: request.needs[0]!.id, helperId: 'helper', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted' as const, createdAt: '', acceptedAt: '', completedAt: null };
    const filters = { preset: 'All' as const, search: request.title, status: request.status, category: request.needs[0]!.category, urgency: request.urgency, area: request.area, coordinator: '', helper: 'helper', flag: '' };
    expect(filterCoordinatorRequests([request], [base], filters)).toHaveLength(1);
    expect(filterCoordinatorRequests([request], [{ ...base, status: 'cancelled' }], filters)).toHaveLength(0);
    expect(filterCoordinatorRequests([request], [base], { ...filters, search: 'not a case title' })).toHaveLength(0);
  } finally { repository.close(); }
});

it('finds open needs without an active helper immediately, even with a coordinator owner', () => {
  const repository = new SqliteRepository(':memory:');
  try {
    repository.replace(seedState());
    const snapshot = new NetworkService(repository).snapshot('u-coord');
    const original = snapshot.requests[0]!;
    const request = { ...original, assignedCoordinatorId: 'u-coord', closure: null, status: 'Open' as const, needs: [{ ...original.needs[0]!, status: 'open' as const }] };
    const filters = { preset: 'Needs helper' as const, search: '', status: '', category: '', urgency: '', area: '', coordinator: '', helper: '', flag: '' };
    const commitment = { id: 'c', requestId: request.id, needId: request.needs[0]!.id, helperId: 'helper', offerId: null, resourceId: null, requesterApproved: false, helperApproved: false, status: 'proposed' as const, createdAt: '', acceptedAt: null, completedAt: null };
    expect(filterCoordinatorRequests([request], [commitment], filters)).toHaveLength(1);
    expect(filterCoordinatorRequests([request], [{ ...commitment, status: 'accepted' }], filters)).toHaveLength(0);
    expect(filterCoordinatorRequests([{ ...request, status: 'Closed', closure: { outcome: 'unconfirmed', reason: '', actorId: 'u-coord', at: '' } }], [], filters)).toHaveLength(0);
  } finally { repository.close(); }
});
