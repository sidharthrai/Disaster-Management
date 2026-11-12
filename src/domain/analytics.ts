import { z } from 'zod';
import { AreaSchema, CategorySchema, isActive, requireCondition, type Commitment, type State } from './model';
import { resourceIsFresh } from './resource-availability';

const wasAccepted = (c: Commitment) => c.acceptedAt !== null || ['accepted', 'in_progress', 'delivered', 'confirmed'].includes(c.status);

const count = z.number().int().nonnegative();
export const InsightsResponseSchema = z.object({
  asOf: z.iso.datetime(), clockMode: z.enum(['demo', 'live']), totalRequests: count, everAcceptedRequests: count,
  activeCommitments: count, fullyResolvedRequests: count, confirmedNeeds: count, overdueUnresolvedRequests: count,
  firstAcceptance: z.object({ medianHours: z.number().finite().nonnegative().nullable(), sampleCount: count, invalidExcludedCount: count }),
  participation: z.object({ helpersWithAcceptedCommitments: count, communityMembers: count }),
  resources: z.array(z.object({ id: z.string(), name: z.string(), category: CategorySchema, area: AreaSchema,
    capacityMode: z.enum(['consumable', 'concurrent']), capacity: count, reserved: count, available: count,
    active: z.boolean(), fresh: z.boolean(), incidentReady: z.boolean(), qualified: z.boolean(), eligible: z.boolean(),
    synthetic: z.boolean(), ownerKnown: z.boolean(), updatedAt: z.iso.datetime() })),
});
export class InsightsService {
  build(state: State, actorId: string) {
    const actor = state.users.find(user => user.id === actorId);
    requireCondition(actor, 'Sign in required.', 401);
    requireCondition(actor.role === 'coordinator', 'Coordinator permission is required.', 403);
    const requests = state.requests.filter(request => request.communityId === actor.communityId);
    const requestIds = new Set(requests.map(request => request.id));
    const commitments = state.commitments.filter(commitment => requestIds.has(commitment.requestId));
    const accepted = commitments.filter(wasAccepted);
    const byRequest = new Map<string, Commitment[]>();
    for (const commitment of accepted) byRequest.set(commitment.requestId, [...(byRequest.get(commitment.requestId) ?? []), commitment]);
    const durations: number[] = []; let invalidExcludedCount = 0;
    const now = Date.parse(state.settings.now);
    for (const request of requests) {
      const connections = byRequest.get(request.id);
      if (!connections) continue;
      const timestamps = connections.map(c => c.acceptedAt === null ? NaN : Date.parse(c.acceptedAt)).filter(Number.isFinite);
      const start = Date.parse(request.createdAt);
      if (timestamps.length !== connections.length) { invalidExcludedCount++; continue; }
      const first = timestamps.length ? Math.min(...timestamps) : NaN;
      const duration = first - start;
      if (!Number.isFinite(duration) || !Number.isFinite(now) || start > now || timestamps.some(timestamp => timestamp > now) || duration < 0) { invalidExcludedCount++; continue; }
      durations.push(duration / 3600000);
    }
    durations.sort((a, b) => a - b);
    const midpoint = Math.floor(durations.length / 2);
    const medianHours = !durations.length ? null : durations.length % 2 ? durations[midpoint]! : (durations[midpoint - 1]! + durations[midpoint]!) / 2;
    const members = state.users.filter(user => user.communityId === actor.communityId && user.role === 'member');
    const memberIds = new Set(members.map(member => member.id));
    const helpers = new Set(accepted.filter(c => memberIds.has(c.helperId)).map(c => c.helperId));
    const resources = state.resources.filter(resource => resource.communityId === actor.communityId).map(resource => {
      const owner = state.users.find(user => user.id === resource.ownerId && user.communityId === actor.communityId);
      const fresh = resourceIsFresh(resource, state.settings.now);
      const incidentReady = !state.settings.emergency || resource.readyForEvent === state.settings.emergency.id;
      const qualified = Boolean(owner && owner.role === 'organization' && owner.verified && (resource.category !== 'Medical' || owner.qualifiedCategories.includes('Medical')) && resource.category !== 'Missing person');
      return { id: resource.id, name: resource.name, category: resource.category, area: resource.area, capacityMode: resource.capacityMode, capacity: resource.capacity, reserved: resource.reserved, available: Math.max(0, resource.capacity - resource.reserved), active: resource.active, fresh, incidentReady, qualified, eligible: resource.active && fresh && incidentReady && qualified && resource.capacity > resource.reserved, synthetic: owner?.synthetic ?? false, ownerKnown: Boolean(owner), updatedAt: resource.verifiedAt };
    });
    return {
      asOf: state.settings.now, clockMode: state.settings.clockMode,
      totalRequests: requests.length, everAcceptedRequests: byRequest.size,
      activeCommitments: commitments.filter(isActive).length,
      fullyResolvedRequests: requests.filter(request => !request.closure && request.needs.length > 0 && request.needs.every(need => need.status === 'resolved')).length,
      confirmedNeeds: requests.reduce((sum, request) => sum + request.needs.filter(need => need.status === 'resolved').length, 0),
      overdueUnresolvedRequests: requests.filter(request => !request.closure && request.needs.some(need => need.status !== 'resolved') && now > Date.parse(request.windowEnd)).length,
      firstAcceptance: { medianHours, sampleCount: durations.length, invalidExcludedCount },
      participation: { helpersWithAcceptedCommitments: helpers.size, communityMembers: members.length }, resources,
    };
  }
}
export type Insights = ReturnType<InsightsService['build']>;
