import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = (process.argv[2] || process.env.DEMO_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const origin = new URL(base).origin;
async function request(path, persona, body) {
  const headers = { Origin: origin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (persona?.cookie) headers.Cookie = persona.cookie;
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  const cookie = response.headers.get('set-cookie');
  if (cookie && persona) persona.cookie = cookie.split(';', 1)[0];
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { throw new Error(`${path} returned non-JSON (${response.status})`); }
  return { status: response.status, data };
}
async function command(persona, body, expected = 200) {
  const result = await request('/api/command', persona, body);
  assert.equal(result.status, expected, `${body.type}: unexpected status ${result.status}: ${JSON.stringify(result.data)}`);
  return result.data;
}
async function state(persona) { const result = await request('/api/state', persona); assert.equal(result.status, 200); return result.data; }
async function detail(persona, id) { const result = await request(`/api/requests/${encodeURIComponent(id)}`, persona); assert.equal(result.status, 200); return result.data; }
const people = { requester: {}, coordinator: {}, outsider: {}, organization: {} };
for (const [key, id] of Object.entries({ requester: 'u-mira', coordinator: 'u-coord', outsider: 'u-teo', organization: 'u-org' })) {
  assert.equal((await request('/api/session', people[key], { id })).status, 200, `Cannot select ${key}; use an isolated demo server`);
}
const { requester, coordinator, outsider, organization } = people;
const originalSettings = (await state(coordinator)).settings.followUp;
await command(coordinator, { type: 'followUpSettings', input: { unassignedHours: 1, responseHours: 1, confirmationHours: 1, acceptedIdleHours: 1, urgentReviewHours: 1 } });
const now = (await state(coordinator)).settings.now;
const windowStart = new Date(Date.parse(now) + 3600000).toISOString();
const windowEnd = new Date(Date.parse(now) + 12 * 3600000).toISOString();
async function create(label, urgency = 'Urgent') {
  const input = { text: `${label} groceries in Central Park ${randomUUID()}`, source: 'Website', categories: ['Groceries'], area: 'Central Park', windowStart, windowEnd };
  const preview = await request('/api/intake', requester, { text: input.text, source: input.source });
  assert.equal(preview.status, 200);
  assert.ok(preview.data.previewToken);
  return (await command(requester, { type: 'createRequest', input: { ...input, previewToken: preview.data.previewToken, urgency, timingConfirmed: true } })).id;
}
const id = await create('Workflow check');
assert.ok(id);
let caseView = await detail(coordinator, id);
assert.equal(caseView.request.urgency, 'Urgent');
const needId = caseView.request.needs[0].id;
await command(coordinator, { type: 'assignCoordinator', requestId: id, coordinatorId: 'u-other' }, 400);
await command(outsider, { type: 'assignCoordinator', requestId: id, coordinatorId: 'u-coord' }, 403);
await command(coordinator, { type: 'correctRequest', requestId: id, input: { categories: ['Groceries', 'Transport'], area: 'Central Park', windowStart, windowEnd, urgency: 'Urgent', note: 'Private correction details' } });
await command(coordinator, { type: 'addCoordinatorNote', requestId: id, text: 'Private coordinator workflow note' });
caseView = await detail(coordinator, id);
assert.ok(caseView.request.needs.some(n => n.id === needId));
assert.ok(caseView.coordinatorNotes.some(n => n.text === 'Private coordinator workflow note'));
for (const person of [requester, outsider]) {
  const projection = await detail(person, id);
  assert.deepEqual(projection.coordinatorNotes, []);
  assert.deepEqual(projection.followUpEpisodes, []);
  assert.ok(!JSON.stringify(projection).includes('Private correction details'));
}
await command(coordinator, { type: 'clock', hours: 1 });
await command(coordinator, { type: 'evaluateFollowUps' });
caseView = await detail(coordinator, id);
const episode = caseView.followUpEpisodes.find(e => e.kind === 'urgent_owner_review' && !e.resolvedAt);
assert.ok(episode, 'Urgent case lacks its owner/review follow-up');
await command(coordinator, { type: 'acknowledgeFollowUp', id: episode.id });
await command(coordinator, { type: 'resolveFollowUp', id: episode.id }, 400);
await command(coordinator, { type: 'escalateFollowUp', id: episode.id, coordinatorId: 'u-coord', note: 'Private escalation detail' });
let evaluated = await detail(coordinator, id);
let current = evaluated.followUpEpisodes.find(e => e.id === episode.id);
assert.ok(current.acknowledgedAt && !current.resolvedAt && current.escalations.some(e => e.note === 'Private escalation detail'));
let inbox = (await state(coordinator)).notifications.filter(n => n.requestId === id);
const notificationIds = inbox.map(n => n.id).sort();
assert.ok(notificationIds.length, 'Expected a coordinator notification');
await command(coordinator, { type: 'evaluateFollowUps' });
assert.deepEqual((await state(coordinator)).notifications.filter(n => n.requestId === id).map(n => n.id).sort(), notificationIds, 'Repeated evaluation duplicated notifications');
const notification = inbox[0];
await command(outsider, { type: 'markNotificationRead', id: notification.id }, 404);
await command(coordinator, { type: 'markNotificationRead', id: notification.id });
assert.ok((await state(coordinator)).notifications.find(n => n.id === notification.id).readAt);
assert.ok(!(await state(outsider)).notifications.some(n => n.id === notification.id));
await command(coordinator, { type: 'assignCoordinator', requestId: id, coordinatorId: 'u-coord' });
await command(coordinator, { type: 'review', requestId: id });
current = (await detail(coordinator, id)).followUpEpisodes.find(e => e.id === episode.id);
assert.ok(current.resolvedAt && current.acknowledgedAt && current.escalations.length, 'Resolved episode lost history');

const resourceInput = { name: `Workflow pantry ${randomUUID()}`, description: 'Fictional workflow check', category: 'Groceries', area: 'Central Park', capacityMode: 'consumable', capacity: 2 };
await command(organization, { type: 'createResource', input: { ...resourceInput, category: 'Medical' } }, 403);
const resourceId = (await command(organization, { type: 'createResource', input: resourceInput })).id;
await command(outsider, { type: 'editResource', id: resourceId, input: { ...resourceInput, active: true, ready: false } }, 403);
await command(organization, { type: 'editResource', id: resourceId, input: { ...resourceInput, capacity: 0, active: true, ready: false } }, 400);
await command(organization, { type: 'editResource', id: resourceId, input: { ...resourceInput, capacity: 3, active: true, ready: false } });
// Two accepted connections reserve two independent units; capacity cannot undercut them.
const secondId = await create('Second resource workflow check', 'Routine');
for (const requestId of [id, secondId]) {
  const view = await detail(requester, requestId);
  const grocery = view.request.needs.find(n => n.category === 'Groceries');
  assert.ok(view.matches.some(m => m.id === resourceId && m.needId === grocery.id), 'New resource is not matchable');
  const proposalId = (await command(requester, { type: 'propose', requestId, needId: grocery.id, offerId: null, resourceId })).id;
  await command(organization, { type: 'respond', id: proposalId, accept: true });
}
await command(organization, { type: 'editResource', id: resourceId, input: { ...resourceInput, capacity: 1, active: true, ready: false } }, 400);
await command(coordinator, { type: 'clock', hours: 1 });
assert.ok((await detail(coordinator, secondId)).followUpEpisodes.some(e => e.kind === 'accepted_idle' && !e.resolvedAt));
await command(organization, { type: 'editResource', id: resourceId, input: { ...resourceInput, capacity: 2, active: false, ready: false } });
assert.ok((await detail(coordinator, secondId)).followUpEpisodes.some(e => e.kind === 'resource_loss' && !e.resolvedAt));
await command(organization, { type: 'editResource', id: resourceId, input: { ...resourceInput, capacity: 2, active: true, ready: false } });
assert.ok((await detail(coordinator, secondId)).followUpEpisodes.some(e => e.kind === 'resource_loss' && e.resolvedAt));
let dashboard = (await state(coordinator)).emergencyDashboard;
assert.ok(dashboard && dashboard.network.requests >= 1);
assert.equal((await state(requester)).emergencyDashboard, null);
await command(coordinator, { type: 'emergency', event: 'Flood' });
const before = (await state(coordinator)).emergencyDashboard;
const incidentId = await create('Incident workflow check', 'Routine');
const after = (await state(coordinator)).emergencyDashboard;
assert.equal(after.incident.type, 'Flood');
assert.equal(after.incidentLinked.requests, before.incidentLinked.requests + 1);
assert.equal(after.network.requests, before.network.requests + 1);
assert.equal((await detail(coordinator, incidentId)).request.incidentId, after.incident.id);
await command(organization, { type: 'editResource', id: resourceId, input: { ...resourceInput, capacity: 3, active: true, ready: true } });
assert.equal((await state(coordinator)).emergencyDashboard.resources.ready, after.resources.ready + 1);
await command(coordinator, { type: 'emergency', event: null });
await command(coordinator, { type: 'followUpSettings', input: originalSettings });
process.stdout.write(`Operations HTTP checks passed for ${base}. Demo records and clock changes remain in the isolated database.\n`);
