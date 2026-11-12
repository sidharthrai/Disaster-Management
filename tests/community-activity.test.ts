import { describe, expect, it } from 'vitest';
import { communityActivity } from '../src/domain/activity';
import { seedState } from '../src/domain/seed';

describe('community activity', () => {
  it('excludes restricted and other-community requests and all free text', () => {
    const state = seedState();
    const other = structuredClone(state.requests[0]!); other.id = 'other'; other.communityId = 'cove'; state.requests.push(other);
    state.events.push({ id: 'hostile', requestId: 'req-grocery', actorId: 'u-mira', text: 'SECRET hostile text', at: state.settings.now });
    const result = communityActivity(state, 'u-mira');
    expect(result.items.some(item => item.requestId === 'req-private' || item.requestId === 'other')).toBe(false);
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect(result.items.filter(item => item.requestId === 'req-grocery' && item.kind === 'posted')).toHaveLength(1);
    expect(() => communityActivity(state, 'unknown')).toThrow();
  });
  it('recognizes backed requester confirmations, not closure or arbitrary event text', () => {
    const state = seedState(); const commitment = state.commitments.find(c => c.status === 'confirmed')!;
    const request = state.requests.find(r => r.id === commitment.requestId)!; const need = request.needs.find(n => n.id === commitment.needId)!;
    state.events = state.events.filter(event => !event.text.startsWith('Requester confirmed'));
    state.events.push({ id: 'confirm', requestId: request.id, actorId: request.requesterId, text: `Requester confirmed ${need.category.toLowerCase()} received. Other outstanding needs remain tracked.`, at: state.settings.now });
    state.events.push({ id: 'closure', requestId: 'req-grocery', actorId: 'u-mira', text: 'Case closed as referred. This is not counted as confirmed assistance.', at: state.settings.now });
    const confirmed = communityActivity(state, 'u-mira').items.filter(item => item.kind === 'confirmed');
    expect(confirmed).toEqual([{ id: 'confirmed:confirm', requestId: request.id, kind: 'confirmed', area: request.area, categories: [need.category], at: state.settings.now }]);
  });
  it('returns at most 30 items in deterministic time and id order', () => {
    const state = seedState(); const template = state.requests[0]!;
    for (let i = 0; i < 40; i++) state.requests.push({ ...structuredClone(template), id: `extra-${String(i).padStart(2, '0')}`, createdAt: state.settings.now });
    const result = communityActivity(state, 'u-mira');
    expect(result.items).toHaveLength(30);
    expect(result).toEqual(communityActivity({ ...state, requests: [...state.requests].reverse(), events: [...state.events].reverse() }, 'u-mira'));
    expect(result.items.map(item => item.id)).toEqual([...result.items.map(item => item.id)].sort());
  });
});
