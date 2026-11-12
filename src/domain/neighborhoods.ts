import { z } from 'zod';
import { areas, AreaSchema, CategorySchema, requestStatus, requireCondition, type State } from './model';
import { resourceIsFresh } from './resource-availability';

const RequestSummarySchema = z.object({ id: z.string(), categories: z.array(CategorySchema) });
const AreaSummarySchema = z.object({
  area: AreaSchema, requests: z.array(RequestSummarySchema), activeOffers: z.number().int().nonnegative(),
  availableResources: z.number().int().nonnegative(), unavailableResources: z.number().int().nonnegative(),
});
export const NeighborhoodsProjectionSchema = z.object({ areas: z.array(AreaSummarySchema), asOf: z.string() });
export type NeighborhoodsProjection = z.infer<typeof NeighborhoodsProjectionSchema>;

/** Community-facing projection: never includes restricted cases or user-entered text. */
export function neighborhoods(state: State, actorId: string): NeighborhoodsProjection {
  const actor = state.users.find(user => user.id === actorId);
  requireCondition(actor, 'Sign in required.', 401);
  return { asOf: state.settings.now, areas: areas.map(area => {
    const requests = state.requests.filter(request => request.communityId === actor.communityId && request.area === area && !request.restricted && !request.closure && requestStatus(request) !== 'Resolved')
      .map(request => ({ id: request.id, categories: [...new Set(request.needs.filter(need => need.status !== 'resolved').map(need => need.category))] }));
    const activeOffers = state.offers.filter(offer => offer.communityId === actor.communityId && offer.area === area && offer.active).length;
    let availableResources = 0; let unavailableResources = 0;
    for (const resource of state.resources) {
      if (resource.communityId !== actor.communityId || resource.area !== area) continue;
      const owner = state.users.find(user => user.id === resource.ownerId && user.communityId === actor.communityId);
      const qualified = owner?.role === 'organization' && owner.verified && resource.category !== 'Missing person' && (resource.category !== 'Medical' || owner.qualifiedCategories.includes('Medical'));
      const ready = !state.settings.emergency || resource.readyForEvent === state.settings.emergency.id;
      if (qualified && ready && resource.active && resource.capacity > resource.reserved && resourceIsFresh(resource, state.settings.now)) availableResources++;
      else unavailableResources++;
    }
    return { area, requests, activeOffers, availableResources, unavailableResources };
  }) };
}
