import { isActive, type Commitment } from '../domain/model';
import type { SnapshotSchema } from '../domain/views';
import type { z } from 'zod';

type Request = z.infer<typeof SnapshotSchema>['requests'][number];
export const coordinatorPresets = ['All', 'Needs helper', 'No coordinator owner', 'Awaiting response', 'In progress', 'Overdue', 'Awaiting confirmation', 'Escalated'] as const;
type Filters = { preset: (typeof coordinatorPresets)[number]; search: string; status: string; category: string; urgency: string; area: string; coordinator: string; helper: string; flag: string };

function isOpen(request: Request) { return !request.closure && request.status !== 'Resolved' && request.status !== 'Closed'; }

export function coordinatorMetrics({ requests, commitments }: { requests: Request[]; commitments: Commitment[] }) {
  const open = requests.filter(isOpen);
  const openIds = new Set(open.map(request => request.id));
  const active = commitments.filter(commitment => openIds.has(commitment.requestId) && isActive(commitment));
  const activeNeedIds = new Set(active.map(commitment => commitment.needId));
  return {
    openRequests: open.length,
    openNeedsWithoutHelper: open.reduce((count, request) => count + request.needs.filter(need => need.status === 'open' && !activeNeedIds.has(need.id)).length, 0),
    awaitingConfirmation: open.filter(request => request.status === 'Awaiting confirmation').length,
    urgentRequests: open.filter(request => request.urgency === 'Urgent' || request.urgency === 'Critical review').length,
    reviewNeeded: open.filter(request => request.flags.some(flag => flag.kind === 'review' || flag.kind === 'urgent_owner_review')).length,
    activeHelpers: new Set(active.map(commitment => commitment.helperId)).size,
  };
}

export function filterCoordinatorRequests(requests: Request[], commitments: Commitment[], filters: Filters) {
  const byRequest = new Map<string, Commitment[]>();
  for (const commitment of commitments) {
    const connections = byRequest.get(commitment.requestId) ?? [];
    connections.push(commitment);
    byRequest.set(commitment.requestId, connections);
  }
  const query = filters.search.trim().toLowerCase();
  return requests.filter(request => {
    const connections = byRequest.get(request.id) ?? [];
    const presetMatch = filters.preset === 'All' || (filters.preset === 'Needs helper' && isOpen(request) && request.needs.some(need => need.status === 'open' && !connections.some(c => c.needId === need.id && isActive(c)))) || (filters.preset === 'No coordinator owner' && !request.assignedCoordinatorId && isOpen(request)) || (filters.preset === 'Awaiting response' && connections.some(c => c.status === 'proposed')) || (filters.preset === 'In progress' && request.status === 'In progress') || (filters.preset === 'Overdue' && request.flags.some(f => f.kind === 'overdue')) || (filters.preset === 'Awaiting confirmation' && request.status === 'Awaiting confirmation') || (filters.preset === 'Escalated' && request.escalated);
    return presetMatch && (!query || `${request.title} ${request.summary} ${request.id}`.toLowerCase().includes(query)) && (!filters.status || request.status === filters.status) && (!filters.category || request.needs.some(need => need.category === filters.category)) && (!filters.urgency || request.urgency === filters.urgency) && (!filters.area || request.area === filters.area) && (!filters.coordinator || (filters.coordinator === 'unassigned' ? !request.assignedCoordinatorId : request.assignedCoordinatorId === filters.coordinator)) && (!filters.helper || connections.some(c => c.helperId === filters.helper && isActive(c))) && (!filters.flag || (filters.flag === 'any' ? request.flags.length > 0 : request.flags.some(f => f.kind === filters.flag)));
  });
}
