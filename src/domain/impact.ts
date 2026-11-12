import { z } from 'zod';
import { CategorySchema, type State } from './model';

const count = z.number().int().nonnegative();
export const PublicImpactSchema = z.object({
  submittedRequests: count,
  openRequests: count,
  fullyResolvedRequests: count,
  confirmedNeeds: count,
  categories: z.array(z.object({ category: CategorySchema, requests: count })),
});
export type PublicImpact = z.infer<typeof PublicImpactSchema>;

/** Aggregate ordinary community requests without exposing case details. */
export function publicImpact(state: State): PublicImpact {
  const requests = state.requests.filter(request => request.communityId === 'riverton' && !request.restricted && request.incidentId === null && request.safetyFlags.length === 0 && request.needs.every(need => need.category !== 'Medical' && need.category !== 'Missing person'));
  const categories = new Map<z.infer<typeof CategorySchema>, number>();
  let openRequests = 0;
  let fullyResolvedRequests = 0;
  let confirmedNeeds = 0;
  for (const request of requests) {
    for (const category of new Set(request.needs.map(need => need.category))) categories.set(category, (categories.get(category) ?? 0) + 1);
    if (request.closure) continue;
    const resolved = request.needs.filter(need => need.status === 'resolved').length;
    confirmedNeeds += resolved;
    if (request.needs.length > 0 && resolved === request.needs.length) fullyResolvedRequests++;
    else openRequests++;
  }
  return PublicImpactSchema.parse({ submittedRequests: requests.length, openRequests, fullyResolvedRequests, confirmedNeeds,
    categories: [...categories].sort(([a], [b]) => a.localeCompare(b)).map(([category, requests]) => ({ category, requests })) });
}
