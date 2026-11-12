import type { HelpRequest, User } from '../domain/model';

type PriorityRequest = Pick<HelpRequest, 'id' | 'urgency' | 'windowEnd' | 'createdAt'>;

const urgencyRank: Record<HelpRequest['urgency'], number> = {
  'Critical review': 0,
  Urgent: 1,
  'Time sensitive': 2,
  Routine: 3,
};

export function incidentAction(role: User['role']) {
  switch (role) {
    case 'coordinator': return { href: '/emergency', label: 'View incident dashboard' };
    case 'organization': return { href: '/resources', label: 'Review resource readiness' };
    case 'member': return { href: '/activity', label: 'Confirm offer readiness' };
  }
}

export function orderCommunityRequests<T extends PriorityRequest>(requests: readonly T[], incidentActive: boolean, now: string): T[] {
  const result = [...requests];
  if (!incidentActive) return result;
  const currentTime = Date.parse(now);
  return result.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]
    || Number(Date.parse(b.windowEnd) < currentTime) - Number(Date.parse(a.windowEnd) < currentTime)
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id));
}
