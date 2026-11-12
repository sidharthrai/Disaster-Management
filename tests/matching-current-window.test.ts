import { describe, expect, it } from 'vitest';
import { MatchingService } from '../src/domain/matching';
import { hourFrom, seedState } from '../src/domain/seed';

function fixture() {
  const state = seedState();
  const request = state.requests.find(item => item.id === 'req-grocery')!;
  const offer = state.offers.find(item => item.id === 'offer-eli')!;
  const viewer = state.users.find(item => item.id === 'u-coord')!;
  state.commitments = [];
  const match = () => new MatchingService().find(state, request, viewer).find(item => item.id === offer.id);
  return { state, request, offer, match };
}

describe('matching the remaining request window', () => {
  it('matches an offer starting now for a request already underway, without accepting a future gap or partial end coverage', () => {
    const { request, offer, match } = fixture();
    request.windowStart = hourFrom(-1); request.windowEnd = hourFrom(4); offer.startAt = hourFrom(0); offer.endAt = hourFrom(4);
    expect(match()?.reasons).toContain('Available for the remaining requested window');
    offer.startAt = hourFrom(1); expect(match()).toBeUndefined();
    offer.startAt = hourFrom(0); offer.endAt = hourFrom(3); expect(match()).toBeUndefined();
  });

  it('rejects expired windows including the exact end and requires full coverage of future windows', () => {
    const { request, offer, match } = fixture();
    request.windowStart = hourFrom(-2); request.windowEnd = hourFrom(0); offer.startAt = hourFrom(-2); offer.endAt = hourFrom(5);
    expect(match()).toBeUndefined();
    request.windowEnd = hourFrom(-1); expect(match()).toBeUndefined();
    request.windowStart = hourFrom(2); request.windowEnd = hourFrom(4); offer.startAt = hourFrom(2); offer.endAt = hourFrom(4);
    expect(match()?.reasons).toContain('Available for the requested window');
    offer.startAt = hourFrom(3); expect(match()).toBeUndefined();
  });

  it('still excludes a helper with overlapping active work', () => {
    const { state, request, offer, match } = fixture();
    request.windowStart = hourFrom(-1); request.windowEnd = hourFrom(4); offer.startAt = hourFrom(0); offer.endAt = hourFrom(4);
    expect(match()).toBeDefined();
    const other = state.requests.find(item => item.id === 'req-multi')!;
    other.windowStart = hourFrom(1); other.windowEnd = hourFrom(3);
    state.commitments.push({ id: 'busy', requestId: other.id, needId: other.needs[0]!.id, helperId: offer.userId, offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted', createdAt: state.settings.now, acceptedAt: state.settings.now, completedAt: null });
    expect(match()).toBeUndefined();
  });
});
