import { describe, expect, it } from 'vitest';
import { InsightsService } from '../src/domain/analytics';
import { seedState } from '../src/domain/seed';

describe('fictional seed history', () => {
  it('records each commitment in chronological order with the responsible participants', () => {
    const state = seedState();
    const now = Date.parse(state.settings.now);
    for (const commitment of state.commitments) {
      const request = state.requests.find(item => item.id === commitment.requestId);
      expect(request).toBeDefined();
      if (!request) throw new Error('Seed commitment has no request');
      const need = request.needs.find(item => item.id === commitment.needId);
      expect(need).toBeDefined();
      if (!need) throw new Error('Seed commitment has no need');
      const events = state.events.filter(event => event.requestId === request.id);
      const times = events.map(event => Date.parse(event.at));
      expect(times.every(Number.isFinite)).toBe(true);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(times[0]).toBe(Date.parse(request.createdAt));
      expect(times.every(time => time <= now)).toBe(true);
      expect(Date.parse(commitment.createdAt)).toBeGreaterThanOrEqual(Date.parse(request.createdAt));
      expect(Date.parse(commitment.acceptedAt ?? '')).toBeGreaterThan(Date.parse(commitment.createdAt));
      expect(Date.parse(commitment.acceptedAt ?? '')).toBeLessThanOrEqual(now);
      expect(Date.parse(request.windowStart)).toBeGreaterThanOrEqual(Date.parse(request.createdAt));
      expect(Date.parse(request.windowEnd)).toBeGreaterThan(Date.parse(request.windowStart));
      const proposal = events.find(event => event.text.startsWith('Connection proposed'));
      const acceptance = events.find(event => event.text.startsWith('Both participants agreed'));
      expect(proposal).toMatchObject({ actorId: request.requesterId, at: commitment.createdAt });
      expect(acceptance).toMatchObject({ actorId: commitment.helperId, at: commitment.acceptedAt });
      const start = events.find(event => event.text.startsWith('Assistance started'));
      expect(start?.actorId).toBe(commitment.helperId);
      expect(Date.parse(start?.at ?? '')).toBeGreaterThanOrEqual(Date.parse(commitment.acceptedAt ?? ''));
      const delivery = events.find(event => event.text.startsWith('Helper reported'));
      const confirmation = events.find(event => event.text.startsWith('Requester confirmed'));
      if (commitment.status === 'in_progress') {
        expect(need.status).toBe('in_progress');
        expect(commitment.completedAt).toBeNull();
        expect(delivery).toBeUndefined();
        expect(confirmation).toBeUndefined();
      } else {
        expect(delivery?.actorId).toBe(commitment.helperId);
        expect(delivery?.at).toBe(commitment.completedAt);
        expect(Date.parse(delivery?.at ?? '')).toBeGreaterThanOrEqual(Date.parse(start?.at ?? ''));
        if (commitment.status === 'confirmed') {
          expect(need.status).toBe('resolved');
          expect(confirmation?.actorId).toBe(request.requesterId);
          expect(Date.parse(confirmation?.at ?? '')).toBeGreaterThanOrEqual(Date.parse(delivery?.at ?? ''));
        } else {
          expect(commitment.status).toBe('delivered');
          expect(need.status).toBe('awaiting_confirmation');
          expect(confirmation).toBeUndefined();
        }
      }
      expect(request.updatedAt).toBe(events.at(-1)?.at);
    }
  });

  it('provides a finite, valid acceptance sample to coordinator insights', () => {
    const state = seedState();
    const sample = new InsightsService().build(state, 'u-coord').firstAcceptance;
    expect(sample.sampleCount).toBe(state.commitments.length);
    expect(sample.invalidExcludedCount).toBe(0);
    expect(sample.medianHours).not.toBeNull();
    expect(Number.isFinite(sample.medianHours)).toBe(true);
    expect(sample.medianHours).toBeGreaterThan(0);
  });
});
