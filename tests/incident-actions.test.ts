import { describe, expect, it } from 'vitest';
import { incidentAction, orderCommunityRequests } from '../src/lib/incident-actions';

describe('incident actions', () => {
  it('routes each role to its available incident action', () => {
    expect(incidentAction('coordinator').href).toBe('/emergency');
    expect(incidentAction('organization').href).toBe('/resources');
    expect(incidentAction('member').href).toBe('/activity');
  });

  it('keeps everyday order and prioritizes incident requests deterministically without mutation', () => {
    const requests = [
      { id: 'routine', urgency: 'Routine' as const, windowEnd: '2026-11-12T00:00:00Z', createdAt: '2026-11-10T00:00:00Z' },
      { id: 'b', urgency: 'Urgent' as const, windowEnd: '2026-11-10T00:00:00Z', createdAt: '2026-11-09T00:00:00Z' },
      { id: 'a', urgency: 'Urgent' as const, windowEnd: '2026-11-10T00:00:00Z', createdAt: '2026-11-09T00:00:00Z' },
      { id: 'later', urgency: 'Urgent' as const, windowEnd: '2026-11-12T00:00:00Z', createdAt: '2026-11-08T00:00:00Z' },
      { id: 'critical', urgency: 'Critical review' as const, windowEnd: '2026-11-12T00:00:00Z', createdAt: '2026-11-11T00:00:00Z' },
    ];
    const now = '2026-11-11T00:00:00Z';
    expect(orderCommunityRequests(requests, false, now).map(r => r.id)).toEqual(['routine', 'b', 'a', 'later', 'critical']);
    expect(orderCommunityRequests(requests, true, now).map(r => r.id)).toEqual(['critical', 'a', 'b', 'later', 'routine']);
    expect(requests.map(r => r.id)).toEqual(['routine', 'b', 'a', 'later', 'critical']);
  });
});
