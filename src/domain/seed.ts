import { StateSchema, type State, type User, type HelpRequest, type Category } from './model';
import { publicSummary, safeTitle } from './safety';

export const DEMO_NOW = '2026-11-10T18:00:00.000Z';
export const hourFrom = (hours: number) => new Date(Date.parse(DEMO_NOW) + hours * 3600000).toISOString();
export function seedState(): State {
  const names = ['Mira Patel', 'Eli Navarro', 'Teo Mensah', 'Naila Brooks', 'Harbor Community Center', 'Riverton Shelter Collective', 'Maple Mobility Partners', 'Riverside Care Access', 'Amara Okafor', 'Luca Moretti', 'Imani Reyes', 'Rohan Mehta', 'Lena Sorensen', 'Zuri Kamau', 'Mateo Alvarez', 'Anika Desai', 'Noor Haddad', 'Jules Laurent', 'Kofi Adjei', 'Freya Lind', 'Devika Rao', 'Soren Berg', 'Paloma Vega', 'Tariq Malik', 'Elena Varga', 'Idris Bello', 'Celia Santos', 'Arjun Nair', 'Maelle Dubois', 'Bastian Rios'];
  const ids = ['u-mira', 'u-eli', 'u-teo', 'u-coord', 'u-org', 'u-shelter', 'u-transport', 'u-care'];
  const areas = ['Central Park', 'Riverside', 'Maple Grove', 'Oakridge', 'River Street'] as const;
  const users = names.map((name, i) => ({ id: ids[i] ?? `u-${i}`, name, role: i === 3 ? 'coordinator' : i >= 4 && i <= 7 ? 'organization' : 'member', communityId: 'riverton',
    area: i < 3 ? 'Central Park' : areas[i % areas.length]!, initials: name.split(' ').map(n => n[0]).slice(0, 2).join(''), color: ['sage', 'clay', 'sand', 'moss'][i % 4]!, verified: i === 3 || (i >= 4 && i <= 7), synthetic: true, qualifiedCategories: i === 7 ? ['Medical' as const] : [] }));
  users.push({ id: 'u-other', name: 'Cove Community Coordinator', role: 'coordinator', communityId: 'cove', area: 'Riverside', initials: 'CC', color: 'sage', verified: true, synthetic: true, qualifiedCategories: [] });
  const offers: State['offers'] = users.filter(u => u.role === 'member' && u.id !== 'u-mira').slice(0, 15).map((u, i) => ({
    id: u.id === 'u-eli' ? 'offer-eli' : u.id === 'u-teo' ? 'offer-teo' : `offer-${u.id}`, communityId: 'riverton', userId: u.id,
    description: i === 0 ? 'Happy to pick up groceries or share essential supplies.' : 'I can lend a hand around the neighborhood.',
    categories: i < 2 ? ['Groceries', 'Transport', 'Supplies'] : [(['Groceries', 'Transport', 'Supplies', 'Community'] satisfies Category[])[i % 4]!],
    area: u.area, startAt: hourFrom(-48), endAt: hourFrom(96), active: true, readyForEvent: null,
  }));
  const resources: State['resources'] = [
    { id: 'resource-food', ownerId: 'u-org', name: 'Community pantry parcels', category: 'Groceries', area: 'Central Park', capacity: 24 },
    { id: 'resource-water', ownerId: 'u-org', name: 'Drinking water & essential kits', category: 'Supplies', area: 'Riverside', capacity: 37 },
    { id: 'resource-shelter', ownerId: 'u-shelter', name: 'Temporary shelter referral spaces', category: 'Shelter', area: 'River Street', capacity: 12 },
    { id: 'resource-ride', ownerId: 'u-transport', name: 'Accessible non-rescue transportation', category: 'Transport', area: 'River Street', capacity: 3 },
    { id: 'resource-care', ownerId: 'u-care', name: 'Qualified care referral appointments', category: 'Medical', area: 'Riverside', capacity: 4 },
  ].map(r => ({ ...r, description: '', category: r.category as Category, area: r.area as User['area'], communityId: 'riverton', capacityMode: (['resource-food', 'resource-water'].includes(r.id) ? 'consumable' : 'concurrent') as 'consumable' | 'concurrent', reserved: 0, active: true, verifiedAt: DEMO_NOW, readyForEvent: null }));
  function request(id: string, owner: string, cats: Category[], area: User['area'], hoursAgo = 1): HelpRequest {
    return { assignedCoordinatorId: null, updatedAt: DEMO_NOW, incidentId: null, id, communityId: 'riverton', requesterId: owner, title: safeTitle(cats), summary: publicSummary(cats), rawContent: `Could someone help with ${cats.join(' and ').toLowerCase()} near ${area} today?`,
      area, windowStart: DEMO_NOW, windowEnd: hourFrom(4), urgency: 'Routine', source: 'Website', safetyFlags: [], restricted: false,
      needs: cats.map((category, i) => ({ id: id === 'req-grocery' ? 'need-grocery' : `${id}-need-${i}`, category, status: 'open' })),
      createdAt: hourFrom(-hoursAgo), reviewedBy: null, intakeProvenance: null, closure: null };
  }
  const requests = [request('req-grocery', 'u-mira', ['Groceries'], 'Central Park'), request('req-multi', 'u-8', ['Groceries', 'Transport'], 'Riverside', 5),
    request('req-supplies', 'u-9', ['Supplies'], 'Maple Grove', 3), request('req-community', 'u-10', ['Community'], 'Oakridge', 8)];
  const privateRequest = request('req-private', 'u-mira', ['Medical'], 'Riverside', 2);
  privateRequest.rawContent = 'PRIVATE: I need medical assistance and prescription access. Do not publish my condition.';
  privateRequest.restricted = true; privateRequest.safetyFlags = ['medical']; privateRequest.urgency = 'Critical review';
  requests.push(privateRequest);
  for (let i = 0; i < 18; i++) requests.push(request(`req-${i + 6}`, `u-${8 + i % 20}`, [(['Groceries', 'Transport', 'Supplies', 'Community'] satisfies Category[])[i % 4]!], areas[i % 5]!, i * 2 + 1));
  const commitments: State['commitments'] = [];
  for (let i = 0; i < 4; i++) {
    const r = requests[6 + i]!; const n = r.needs[0]!;
    const status = (['confirmed', 'confirmed', 'delivered', 'in_progress'] as const)[i]!;
    n.status = status === 'confirmed' ? 'resolved' : status === 'delivered' ? 'awaiting_confirmation' : 'in_progress';
    commitments.push({ id: `seed-commit-${i}`, requestId: r.id, needId: n.id, helperId: i % 2 ? 'u-eli' : 'u-teo', offerId: null, resourceId: null,
      requesterApproved: true, helperApproved: true, status, createdAt: hourFrom(-12), acceptedAt: hourFrom(-10), completedAt: status === 'in_progress' ? null : hourFrom(-7) });
    r.windowStart = hourFrom(-12 - i * 5); r.windowEnd = hourFrom(-8 - i * 5);
  }
  return StateSchema.parse({ users, offers, resources, requests, commitments,
    events: requests.map((r, i) => ({ id: `event-${i}`, requestId: r.id, actorId: r.requesterId, text: 'Request received. Details kept private; safe summary shared with the community.', at: r.createdAt })),
    messages: [], reports: [], settings: { now: DEMO_NOW, emergency: null } });
}

export function emptyState(): State { return StateSchema.parse({ users: [], offers: [], resources: [], requests: [], commitments: [], events: [], messages: [], reports: [], settings: { now: new Date().toISOString(), clockMode: 'live', emergency: null } }); }
