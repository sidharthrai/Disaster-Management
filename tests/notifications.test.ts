import { describe, expect, it } from 'vitest';
import { NotificationService } from '../src/domain/notifications';
import { seedState } from '../src/domain/seed';

describe('in-app notifications', () => {
  it('deduplicates safe event notifications to relevant community participants', () => {
    const state = seedState(); const request = state.requests.find(r => r.id === 'req-grocery')!;
    state.commitments.push({ id: 'test', requestId: request.id, needId: request.needs[0]!.id, helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted', createdAt: state.settings.now, acceptedAt: state.settings.now, completedAt: null });
    state.events.push({ id: 'secret-event', requestId: request.id, actorId: request.requesterId, text: 'Sensitive case details', at: state.settings.now });
    const service = new NotificationService();
    service.notifyEvent(state, request.id, 'secret-event', request.requesterId);
    service.notifyEvent(state, request.id, 'secret-event', request.requesterId);
    expect(state.notifications.map(n => n.recipientId).sort()).toEqual(['u-coord', 'u-eli']);
    expect(state.notifications.every(n => !n.text.includes('Sensitive'))).toBe(true);
  });

  it('does not notify a helper who lacks access to a restricted request', () => {
    const state = seedState(); const request = state.requests.find(r => r.id === 'req-private')!;
    state.commitments.push({ id: 'test', requestId: request.id, needId: request.needs[0]!.id, helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted', createdAt: state.settings.now, acceptedAt: state.settings.now, completedAt: null });
    state.events.push({ id: 'event-test', requestId: request.id, actorId: 'u-coord', text: 'private', at: state.settings.now });
    new NotificationService().notifyEvent(state, request.id, 'event-test', 'u-coord');
    expect(state.notifications.map(n => n.recipientId)).toEqual([request.requesterId]);
  });
});
