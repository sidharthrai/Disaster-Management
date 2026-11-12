import { afterEach, describe, expect, it } from 'vitest';
import { SqliteRepository } from '../src/server/repository';
import { seedState } from '../src/domain/seed';
import { MatchingService } from '../src/domain/matching';
import { NetworkService } from '../src/domain/network';
import { OfferScheduleService, previewOfferSchedule } from '../src/domain/offer-schedule';

const repositories: SqliteRepository[] = [];
function setup() { const repo = new SqliteRepository(':memory:'); repositories.push(repo); repo.replace(seedState()); return repo; }
afterEach(() => repositories.splice(0).forEach(repo => repo.close()));
const input = { description: 'I can deliver supplies.', categories: ['Supplies'], areas: ['Central Park', 'Riverside'], startLocal: '2026-11-15T09:00', endLocal: '2026-11-15T11:00', weeks: 3, confirmed: true };

describe('weekly offer schedules', () => {
  it('preserves wall time across daylight saving transitions and rejects gaps', () => {
    const preview = previewOfferSchedule({ ...input, startLocal: '2027-03-07T09:00', endLocal: '2027-03-07T11:00' });
    expect(preview.map(w => w.startAt)).toEqual(['2027-03-07T15:00:00.000Z', '2027-03-14T14:00:00.000Z', '2027-03-21T14:00:00.000Z']);
    expect(() => previewOfferSchedule({ ...input, startLocal: '2027-03-07T02:30', endLocal: '2027-03-07T03:30' })).toThrow();
    const fall = previewOfferSchedule({ ...input, startLocal: '2027-10-31T01:30', endLocal: '2027-10-31T03:30' });
    expect(fall.map(w => w.startLocal)).toEqual(['2027-10-31T01:30', '2027-11-07T01:30', '2027-11-14T01:30']);
    expect(fall[1]?.startAt).toMatch(/^2027-11-07T0[67]:30:00.000Z$/);
  });
  it('creates separate offers for the actor community with no changes on invalid input', () => {
    const repo = setup(); const service = new OfferScheduleService(repo); const before = repo.read().offers.length;
    expect(() => service.create('u-eli', { ...input, categories: ['Medical'] })).toThrow();
    expect(() => service.create('missing', input)).toThrow();
    expect(() => service.create('u-eli', { ...input, weeks: 5 })).toThrow();
    expect(() => service.create('u-eli', { ...input, confirmed: false })).toThrow();
    expect(repo.read().offers).toHaveLength(before);
    const ids = service.create('u-eli', input); const offers = repo.read().offers.filter(o => ids.includes(o.id));
    expect(offers).toHaveLength(6); expect(new Set(offers.map(o => o.communityId))).toEqual(new Set(['riverton']));
    expect(new Set(offers.map(o => o.area))).toEqual(new Set(input.areas));
    expect(offers.every(o => o.userId === 'u-eli' && o.active && o.readyForEvent === null)).toBe(true);
  });
  it('rejects past, excessive and invalid windows atomically', () => {
    const repo = setup(); const service = new OfferScheduleService(repo); const before = repo.read().offers.length;
    for (const bad of [{ startLocal: '2026-11-01T09:00', endLocal: '2026-11-01T11:00' }, { endLocal: '2026-11-16T10:00' }, { areas: [] }, { areas: ['Riverside', 'Riverside'] }]) expect(() => service.create('u-eli', { ...input, ...bad })).toThrow();
    expect(repo.read().offers).toHaveLength(before);
    const maximum = service.create('u-eli', { ...input, weeks: 4, areas: ['Riverside', 'Maple Grove', 'Oakridge', 'Central Park', 'River Street'] });
    expect(maximum).toHaveLength(20);
  });
  it('matches the dated windows and areas while respecting pause and busy commitments', () => {
    const repo = setup(); const ids = new OfferScheduleService(repo).create('u-eli', input); const network = new NetworkService(repo);
    const state = repo.read(); const viewer = state.users.find(u => u.id === 'u-mira')!; const base = state.requests.find(r => r.id === 'req-grocery')!;
    const matcher = new MatchingService();
    for (const id of ids) {
      const offer = state.offers.find(o => o.id === id)!;
      const request = { ...base, area: offer.area, windowStart: offer.startAt, windowEnd: offer.endAt, restricted: false, needs: [{ id: 'schedule-need', category: 'Supplies' as const, status: 'open' as const }] };
      expect(matcher.find(state, request, viewer).some(match => match.id === id)).toBe(true);
    }
    const offer = state.offers.find(o => o.id === ids[0])!;
    const request = { ...base, area: offer.area, windowStart: offer.startAt, windowEnd: offer.endAt, restricted: false, needs: [{ id: 'schedule-need', category: 'Supplies' as const, status: 'open' as const }] };
    network.setOffer('u-eli', offer.id, false, false);
    expect(matcher.find(repo.read(), request, viewer).some(match => match.id === offer.id)).toBe(false);
    state.requests.push({ ...request, id: 'busy-request' });
    state.commitments.push({ id: 'busy', requestId: 'busy-request', needId: 'schedule-need', helperId: 'u-eli', offerId: offer.id, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted', createdAt: state.settings.now, acceptedAt: state.settings.now, completedAt: null });
    expect(matcher.find(state, request, viewer).some(match => match.id === offer.id)).toBe(false);
  });

});
