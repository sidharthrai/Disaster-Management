import { z } from 'zod';
import { AreaSchema, CategorySchema, requireCondition, type State } from './model';

export const CommunityActivityItemSchema = z.object({
  id: z.string(), requestId: z.string(), kind: z.enum(['posted', 'confirmed']),
  area: AreaSchema, categories: z.array(CategorySchema), at: z.string(),
});
export const CommunityActivitySchema = z.object({ items: z.array(CommunityActivityItemSchema) });
export type CommunityActivityItem = z.infer<typeof CommunityActivityItemSchema>;

/** Project only known transitions; persisted event text is never returned. */
export function communityActivity(state: State, userId: string): z.infer<typeof CommunityActivitySchema> {
  const actor = state.users.find(user => user.id === userId);
  requireCondition(actor, 'Choose a valid demo identity.', 401);
  const items: CommunityActivityItem[] = [];
  for (const request of state.requests) {
    if (request.communityId !== actor.communityId || request.restricted) continue;
    if (Number.isFinite(Date.parse(request.createdAt))) {
      items.push({ id: `posted:${request.id}`, requestId: request.id, kind: 'posted', area: request.area, categories: [...new Set(request.needs.map(need => need.category))], at: request.createdAt });
    }
    for (const event of state.events) {
      if (event.requestId !== request.id || event.actorId !== request.requesterId || !Number.isFinite(Date.parse(event.at))) continue;
      const need = request.needs.find(candidate => event.text === `Requester confirmed ${candidate.category.toLowerCase()} received. Other outstanding needs remain tracked.` && state.commitments.some(commitment => commitment.requestId === request.id && commitment.needId === candidate.id && commitment.status === 'confirmed'));
      if (need) items.push({ id: `confirmed:${event.id}`, requestId: request.id, kind: 'confirmed', area: request.area, categories: [need.category], at: event.at });
    }
  }
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { items: items.slice(0, 30) };
}
