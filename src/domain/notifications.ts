import { randomUUID } from 'node:crypto';
import type { State } from './model';

/** Creates recipient-specific, content-free in-app notifications. */
export class NotificationService {
  private add(state: State, requestId: string, recipientId: string, kind: string, sourceId: string, text: string): void {
    const dedupeKey = `${kind}|${sourceId}|${recipientId}`;
    if (state.notifications.some(notification => notification.dedupeKey === dedupeKey)) return;
    state.notifications.push({ id: randomUUID(), recipientId, requestId, kind, text, dedupeKey, createdAt: state.settings.now, readAt: null });
  }

  notifyEvent(state: State, requestId: string, eventId: string, actorId: string): void {
    const request = state.requests.find(item => item.id === requestId);
    if (!request || !state.events.some(event => event.id === eventId && event.requestId === requestId)) return;
    const commitments = state.commitments.filter(commitment => commitment.requestId === requestId);
    const helpers = new Set(commitments.filter(commitment => !['cancelled', 'rejected'].includes(commitment.status)).map(commitment => commitment.helperId));
    // A cancellation event is recorded after the status changes; its latest participant still needs notice.
    for (const need of request.needs) {
      const latest = commitments.filter(commitment => commitment.needId === need.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
      if (latest?.status === 'cancelled') helpers.add(latest.helperId);
    }
    for (const user of state.users) {
      if (user.communityId !== request.communityId || user.id === actorId) continue;
      const isCoordinator = user.role === 'coordinator';
      const isRequester = user.id === request.requesterId;
      const isHelper = helpers.has(user.id) && (!request.restricted || (user.role === 'organization' && user.verified));
      if (isCoordinator || isRequester || isHelper) this.add(state, requestId, user.id, 'event', eventId, 'There is an update to a request.');
    }
  }

  notifyFollowUp(state: State, requestId: string, episodeId: string): void {
    const request = state.requests.find(item => item.id === requestId);
    const episode = state.followUpEpisodes.find(item => item.id === episodeId && item.requestId === requestId && !item.resolvedAt);
    if (!request || !episode) return;
    for (const user of state.users) {
      if (user.communityId === request.communityId && user.role === 'coordinator') this.add(state, requestId, user.id, 'follow_up', episodeId, 'A request needs coordinator attention.');
    }
    const commitment = state.commitments.find(item => item.id === episode.subjectId && item.requestId === request.id);
    const recipients = new Set<string>();
    if (episode.kind === 'unassigned') recipients.add(request.requesterId);
    if (episode.kind === 'confirmation') recipients.add(request.requesterId);
    if (episode.kind === 'accepted_idle' && commitment) recipients.add(commitment.helperId);
    if (episode.kind === 'response' && commitment) {
      if (!commitment.requesterApproved) recipients.add(request.requesterId);
      if (!commitment.helperApproved) recipients.add(commitment.helperId);
    }
    for (const recipientId of recipients) {
      const user = state.users.find(item => item.id === recipientId && item.communityId === request.communityId);
      const authorized = user && (!request.restricted || user.id === request.requesterId || user.role === 'coordinator' || (user.role === 'organization' && user.verified && state.commitments.some(item => item.requestId === request.id && item.helperId === user.id && !['cancelled', 'rejected'].includes(item.status))));
      if (authorized) this.add(state, requestId, recipientId, 'follow_up_reminder', episodeId, 'A request needs your attention.');
    }
  }
}
