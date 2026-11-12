import { afterEach, describe, expect, it, vi } from 'vitest';
import { seedState } from '../src/domain/seed';
import { SqliteRepository } from '../src/server/repository';
import { followUpTick } from '../src/server/followup-runner';
import { NetworkService } from '../src/domain/network';

afterEach(() => vi.useRealTimers());

describe('automatic follow-up', () => {
  it('uses elapsed live time, deduplicates reminders, and resolves the episode', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const store = new SqliteRepository(':memory:');
    try {
      const state = seedState();
      const request = state.requests.find(item => item.id === 'req-multi')!;
      state.requests = [request]; state.commitments = []; state.followUpEpisodes = []; state.notifications = [];
      state.settings.clockMode = 'live';
      request.createdAt = new Date().toISOString(); request.windowEnd = '2026-01-02T00:00:00Z';
      store.replace(state);
      followUpTick(store);
      expect(store.read().followUpEpisodes.filter(item => item.kind === 'unassigned')).toHaveLength(0);
      vi.setSystemTime(new Date('2026-01-01T06:00:00Z'));
      followUpTick(store); followUpTick(store);
      const after = store.read();
      const episode = after.followUpEpisodes.find(item => item.kind === 'unassigned')!;
      const reminders = after.notifications.filter(item => item.dedupeKey.includes(episode.id));
      expect(reminders.map(item => item.recipientId).sort()).toEqual([request.requesterId, 'u-coord'].sort());
      expect(new Set(reminders.map(item => item.dedupeKey)).size).toBe(reminders.length);
      store.transaction(current => { current.requests[0]!.needs.find(item => item.id === episode.subjectId)!.status = 'connected'; });
      expect(store.read().followUpEpisodes.find(item => item.id === episode.id)?.resolvedAt).toBe('2026-01-01T06:00:00.000Z');
    } finally { store.close(); }
  });

  it('reminds only authorized participants awaiting agreement and keeps private content out of notifications', () => {
    const store = new SqliteRepository(':memory:');
    try {
      const state = seedState(); const request = state.requests.find(item => item.id === 'req-multi')!;
      state.requests = [request]; state.commitments = []; state.followUpEpisodes = []; state.notifications = [];
      request.restricted = true; request.rawContent = 'private details';
      const need = request.needs[0]!;
      state.commitments.push({ id: 'private-proposal', requestId: request.id, needId: need.id, helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: false, helperApproved: false, status: 'proposed', createdAt: new Date(Date.parse(state.settings.now) - 3 * 3600000).toISOString(), acceptedAt: null, completedAt: null });
      store.replace(state); followUpTick(store); followUpTick(store);
      const after = store.read(); const episode = after.followUpEpisodes.find(item => item.kind === 'response')!;
      const recipients = after.notifications.filter(item => item.dedupeKey.includes(episode.id));
      expect(recipients.map(item => item.recipientId).sort()).toEqual([request.requesterId, 'u-coord'].sort());
      expect(JSON.stringify(recipients)).not.toContain('private details');
      expect(new NetworkService(store).snapshot('u-eli').notifications.some(item => item.requestId === request.id)).toBe(false);
    } finally { store.close(); }
  });

  it('reminds the helper for idle work and the requester for confirmation', () => {
    const store = new SqliteRepository(':memory:');
    try {
      const state = seedState(); const request = state.requests.find(item => item.id === 'req-multi')!;
      state.requests = [request]; state.commitments = []; state.followUpEpisodes = []; state.notifications = [];
      const old = new Date(Date.parse(state.settings.now) - 5 * 3600000).toISOString();
      state.commitments.push({ id: 'idle', requestId: request.id, needId: request.needs[0]!.id, helperId: 'u-eli', offerId: null, resourceId: null, requesterApproved: true, helperApproved: true, status: 'accepted', createdAt: old, acceptedAt: old, completedAt: null });
      store.replace(state); followUpTick(store); followUpTick(store);
      let after = store.read();
      const idle = after.followUpEpisodes.find(item => item.kind === 'accepted_idle')!;
      expect(after.notifications.filter(item => item.kind === 'follow_up_reminder' && item.dedupeKey.includes(idle.id)).map(item => item.recipientId)).toEqual(['u-eli']);
      store.transaction(current => { const commitment = current.commitments[0]!; commitment.status = 'delivered'; commitment.completedAt = old; });
      followUpTick(store);
      after = store.read();
      const confirmation = after.followUpEpisodes.find(item => item.kind === 'confirmation')!;
      expect(after.notifications.filter(item => item.kind === 'follow_up_reminder' && item.dedupeKey.includes(confirmation.id)).map(item => item.recipientId)).toEqual([request.requesterId]);
      expect(after.followUpEpisodes.find(item => item.id === idle.id)?.resolvedAt).not.toBeNull();
    } finally { store.close(); }
  });

  it('keeps the demo clock fixed during a tick', () => {
    const store = new SqliteRepository(':memory:');
    try {
      const state = seedState(); store.replace(state); followUpTick(store);
      expect(store.read().settings.now).toBe(state.settings.now);
    } finally { store.close(); }
  });
});
