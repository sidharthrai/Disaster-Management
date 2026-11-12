import { describe, expect, it } from 'vitest';
import { donationBoard, DonationBoardSchema } from '../src/domain/donations';
import { hourFrom, seedState } from '../src/domain/seed';

describe('donation board projection', () => {
  it('returns only allowlisted same-community categories and no private text', () => {
    const state = seedState();
    state.resources[0]!.name = 'SECRET resource name'; state.resources[0]!.description = 'SECRET resource detail';
    state.offers[0]!.description = 'SECRET offer'; state.requests[0]!.rawContent = 'SECRET request';
    state.resources.push({ ...state.resources[0]!, id: 'other', communityId: 'cove' });
    state.offers.push({ ...state.offers[0]!, id: 'other-offer', communityId: 'cove' });
    const board = donationBoard(state, 'u-mira');
    expect(DonationBoardSchema.parse(board)).toEqual(board);
    expect(JSON.stringify(board)).not.toMatch(/SECRET|Medical|req-private|other-offer|"other"/);
    expect(board.resources.some(item => item.id === 'resource-food')).toBe(true);
    expect(board.offers.some(item => item.id === 'offer-eli')).toBe(true);
    expect(() => donationBoard(state, 'unknown')).toThrow();
  });
  it('excludes stale, paused, depleted, non-consumable and unverified resources', () => {
    const state = seedState(); const base = state.resources[0]!;
    state.resources = [base,
      { ...base, id: 'old', verifiedAt: hourFrom(-25) }, { ...base, id: 'future', verifiedAt: hourFrom(1) },
      { ...base, id: 'paused', active: false }, { ...base, id: 'empty', reserved: base.capacity },
      { ...base, id: 'concurrent', capacityMode: 'concurrent' }, { ...base, id: 'member', ownerId: 'u-eli' },
      { ...base, id: 'wrong-community-owner', ownerId: 'u-other' },
    ];
    expect(donationBoard(state, 'u-mira').resources.map(item => item.id)).toEqual([base.id]);
    state.users.find(user => user.id === base.ownerId)!.verified = false;
    expect(donationBoard(state, 'u-mira').resources).toEqual([]);
  });
  it('requires current incident readiness and excludes expired or paused offers', () => {
    const state = seedState();
    state.settings.emergency = { id: 'incident', type: 'Flood', name: 'Flood', startedAt: state.settings.now };
    state.resources[0]!.readyForEvent = 'incident';
    state.offers[0]!.readyForEvent = 'incident';
    state.offers.push({ ...state.offers[0]!, id: 'expired', endAt: hourFrom(-1) }, { ...state.offers[0]!, id: 'paused', active: false });
    const board = donationBoard(state, 'u-mira');
    expect(board.resources.map(item => item.id)).toEqual(['resource-food']);
    expect(new Set(board.offers.map(item => item.id))).toEqual(new Set(['offer-eli']));
  });
});
