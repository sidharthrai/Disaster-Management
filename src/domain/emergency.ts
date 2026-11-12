import { requestStatus, requireCondition, type HelpRequest, type State, type User } from './model';
import { resourceIsFresh } from './resources';
import { FollowUpService } from './followup';

function summarize(requests: HelpRequest[]) {
  const categories: Record<string, number> = {}; const progress: Record<string, number> = {};
  for (const request of requests) {
    const status = requestStatus(request);
    progress[status] = (progress[status] ?? 0) + 1;
    for (const need of request.needs) categories[need.category] = (categories[need.category] ?? 0) + 1;
  }
  return { requests: requests.length, open: requests.filter(r => !r.closure && requestStatus(r) !== 'Resolved').length, resolved: requests.filter(r => requestStatus(r) === 'Resolved').length, categories, progress };
}

export function buildEmergencyDashboard(state: State, actor: User) {
  requireCondition(actor.role === 'coordinator', 'Coordinator permission is required.', 403);
  const requests = state.requests.filter(r => r.communityId === actor.communityId);
  const incident = state.settings.emergency;
  const resources = state.resources.filter(r => r.communityId === actor.communityId);
  const resourceList = resources.map(resource => {
    const owner = state.users.find(user => user.id === resource.ownerId && user.communityId === actor.communityId);
    const reasons: string[] = [];
    if (!resource.active) reasons.push('Paused');
    if (resource.capacity <= resource.reserved) reasons.push('No remaining capacity');
    if (!resourceIsFresh(resource, state.settings.now)) reasons.push('Availability is stale or invalid');
    if (incident && resource.readyForEvent !== incident.id) reasons.push('Incident readiness not confirmed');
    if (!owner || owner.role !== 'organization' || !owner.verified || (resource.category === 'Medical' && !owner.qualifiedCategories.includes('Medical')) || resource.category === 'Missing person') reasons.push('Owner or category is not eligible');
    return { id: resource.id, name: resource.name, category: resource.category, area: resource.area, capacityMode: resource.capacityMode, capacity: resource.capacity, reserved: resource.reserved, available: Math.max(0, resource.capacity - resource.reserved), eligible: reasons.length === 0, reasons, partnerName: owner?.name ?? null, synthetic: owner?.synthetic ?? false };
  });
  const followUp = new FollowUpService();
  const rank = { 'Critical review': 0, Urgent: 1, 'Time sensitive': 2, Routine: 3 };
  const priorityQueue = requests.filter(r => !r.closure && requestStatus(r) !== 'Resolved')
    .map(r => ({ requestId: r.id, urgency: r.urgency, createdAt: r.createdAt, overdue: Date.parse(r.windowEnd) < Date.parse(state.settings.now) }))
    .sort((a, b) => rank[a.urgency] - rank[b.urgency] || Number(b.overdue) - Number(a.overdue) || a.createdAt.localeCompare(b.createdAt) || a.requestId.localeCompare(b.requestId));
  const requestsById = new Map(requests.map(request => [request.id, request]));
  const reviewQueue = priorityQueue.flatMap(item => {
    const request = requestsById.get(item.requestId);
    if (!request) return [];
    const reasons = followUp.evaluate(state, request).filter(flag => flag.kind === 'review' || flag.kind === 'urgent_owner_review').map(flag => flag.description);
    return reasons.length ? [{ ...item, reasons }] : [];
  });
  return { incident, network: summarize(requests), incidentLinked: summarize(incident ? requests.filter(r => r.incidentId === incident.id) : []), resources: { total: resources.length, active: resources.filter(r => r.active).length, ready: resourceList.filter(r => r.eligible).length, reserved: resources.reduce((sum, r) => sum + r.reserved, 0), list: resourceList }, priorityQueue, reviewQueue };
}
