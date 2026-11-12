import { randomUUID } from 'node:crypto';
import { type HelpRequest, type State, requestStatus } from './model';
export type FollowUp = { kind: string; subjectId: string; severity: 'attention' | 'urgent'; description: string };
export class FollowUpService {
  evaluate(state: State, request: HelpRequest): FollowUp[] {
    if (request.closure || requestStatus(request) === 'Resolved') return [];
    const flags: FollowUp[] = [];
    const now = Date.parse(state.settings.now); const hours = (at: string) => (now - Date.parse(at)) / 3600000;
    const settings = state.settings.followUp; const commitments = state.commitments.filter(c => c.requestId === request.id);
    const add = (kind: string, subjectId: string, severity: FollowUp['severity'], description: string) => flags.push({ kind, subjectId, severity, description });
    if (request.restricted && !request.reviewedBy) add('review', request.id, 'urgent', 'Restricted request needs authorized review.');
    if (['Urgent', 'Critical review'].includes(request.urgency) && hours(request.createdAt) >= settings.urgentReviewHours && (!request.assignedCoordinatorId || !request.reviewedBy)) add('urgent_owner_review', request.id, 'urgent', 'Urgent request needs an assigned coordinator and review.');
    for (const need of request.needs.filter(n => n.status === 'open')) {
      if (hours(request.createdAt) >= settings.unassignedHours) add('unassigned', need.id, 'attention', 'An open need has no active commitment.');
      const latest = commitments.filter(c => c.needId === need.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
      if (latest?.status === 'cancelled') add('cancelled', need.id, 'attention', 'A cancelled connection left this need open.');
    }
    for (const c of commitments) {
      if (c.status === 'proposed' && hours(c.createdAt) >= settings.responseHours) add('response', c.id, 'attention', 'A proposed connection awaits agreement.');
      if (c.status === 'accepted' && c.acceptedAt && hours(c.acceptedAt) >= settings.acceptedIdleHours) add('accepted_idle', c.id, 'attention', 'An agreed connection has not started.');
      if (c.status === 'delivered' && c.completedAt && hours(c.completedAt) >= settings.confirmationHours) add('confirmation', c.id, 'attention', 'Reported delivery awaits requester confirmation.');
      if (['accepted', 'in_progress'].includes(c.status)) {
        const resource = state.resources.find(r => r.id === c.resourceId); const offer = state.offers.find(o => o.id === c.offerId); const incident = state.settings.emergency?.id;
        if ((c.resourceId && (!resource || !resource.active || hours(resource.verifiedAt) > 24 || (incident && resource.readyForEvent !== incident))) || (c.offerId && (!offer || !offer.active || (incident && offer.readyForEvent !== incident) || now > Date.parse(offer.endAt)))) add('resource_loss', c.id, 'urgent', 'An active connection source is unavailable or needs readiness confirmation.');
      }
    }
    if (now > Date.parse(request.windowEnd) && request.needs.some(n => n.status !== 'resolved')) add('overdue', request.id, 'urgent', 'The requested window passed with needs unresolved.');
    return flags;
  }
  reconcile(state: State) {
    const active = new Set<string>();
    for (const request of state.requests) for (const flag of this.evaluate(state, request)) {
      const key = `${request.id}|${flag.kind}|${flag.subjectId}`; active.add(key);
      if (state.followUpEpisodes.some(e => e.requestId === request.id && e.kind === flag.kind && e.subjectId === flag.subjectId && !e.resolvedAt)) continue;
      const id = randomUUID(); state.followUpEpisodes.push({ id, requestId: request.id, ...flag, openedAt: state.settings.now, acknowledgedAt: null, acknowledgedBy: null, resolvedAt: null, escalations: [] });
      for (const user of state.users.filter(u => u.communityId === request.communityId && u.role === 'coordinator')) state.notifications.push({ id: randomUUID(), recipientId: user.id, requestId: request.id, kind: 'follow_up', text: 'A request needs coordinator attention.', dedupeKey: `${id}|${user.id}`, createdAt: state.settings.now, readAt: null });
    }
    for (const episode of state.followUpEpisodes) if (!episode.resolvedAt && !active.has(`${episode.requestId}|${episode.kind}|${episode.subjectId}`)) episode.resolvedAt = state.settings.now;
  }
}
