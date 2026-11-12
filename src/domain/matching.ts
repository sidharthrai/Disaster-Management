import { isActive, type HelpRequest, type State, type User } from './model';
export type Match = { id: string; needId: string; category: string; helperId: string; helperName: string; kind: 'offer' | 'resource'; score: number; reasons: string[] };
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);
}
export class MatchingService {
  find(state: State, request: HelpRequest, viewer: User): Match[] {
    if (request.closure || (request.restricted && viewer.role !== 'coordinator')) return [];
    const result: Match[] = [];
    const busy = (helperId: string) => state.commitments.some(c => {
      if (c.helperId !== helperId || !isActive(c)) return false;
      const other = state.requests.find(r => r.id === c.requestId);
      return other && overlaps(request.windowStart, request.windowEnd, other.windowStart, other.windowEnd);
    });
    const eventId = state.settings.emergency?.id;
    for (const need of request.needs.filter(n => n.status === 'open')) {
      if (!request.restricted) for (const offer of state.offers) {
        const helper = state.users.find(u => u.id === offer.userId);
        if (!helper || helper.id === request.requesterId || offer.communityId !== request.communityId || !offer.active) continue;
        if (!offer.categories.includes(need.category) || offer.area !== request.area || busy(helper.id)) continue;
        if (Date.parse(offer.startAt) > Date.parse(request.windowStart) || Date.parse(offer.endAt) < Date.parse(request.windowEnd)) continue;
        if (Date.parse(request.windowEnd) < Date.parse(state.settings.now)) continue;
        if (eventId && offer.readyForEvent !== eventId) continue;
        result.push({ id: offer.id, needId: need.id, category: need.category, helperId: helper.id, helperName: helper.name, kind: 'offer', score: 3,
          reasons: [`Offers ${need.category.toLowerCase()}`, `Serves ${request.area}`, 'Available for the requested window', ...(eventId ? ['Readiness reconfirmed for this incident'] : [])] });
      }
      for (const resource of state.resources) {
        const helper = state.users.find(u => u.id === resource.ownerId);
        if (!helper || helper.id === request.requesterId || helper.role !== 'organization' || !helper.verified || resource.communityId !== request.communityId || !resource.active || resource.capacity <= resource.reserved) continue;
        if (need.category === 'Medical' && !helper.qualifiedCategories.includes('Medical')) continue;
        if (resource.category !== need.category || resource.area !== request.area || need.category === 'Missing person') continue;
        if (Date.parse(request.windowEnd) < Date.parse(state.settings.now)) continue;
        if (Date.parse(state.settings.now) - Date.parse(resource.verifiedAt) > 24 * 3600000) continue;
        if (eventId && resource.readyForEvent !== eventId) continue;
        result.push({ id: resource.id, needId: need.id, category: need.category, helperId: helper.id, helperName: resource.name, kind: 'resource', score: 4,
          reasons: [`Provides ${need.category.toLowerCase()}`, `Serves ${request.area}`, `${resource.capacity - resource.reserved} demo units available`, 'Availability updated within 24 demo hours', ...(eventId ? ['Readiness reconfirmed for this incident'] : [])] });
      }
    }
    return result.sort((a, b) => b.score - a.score || a.helperName.localeCompare(b.helperName));
  }
}
