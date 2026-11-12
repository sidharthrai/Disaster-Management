import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const base = (process.argv[2] || process.env.DEMO_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const origin = new URL(base).origin;
console.log('Requires an isolated demo server. Fictional records, profile and event changes remain; an active incident will be cleared.');
async function request(path, person, body, method = body === undefined ? 'GET' : 'POST', expected = 200) {
  const headers = { Origin: origin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (person.cookie) headers.Cookie = person.cookie;
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  const cookie = response.headers.get('set-cookie');
  if (cookie) person.cookie = cookie.split(';', 1)[0];
  assert.equal(response.status, expected, `${method} ${path}: unexpected status`);
  return response.json();
}
const persons = { mira: {}, coord: {}, org: {}, eli: {} };
for (const [key, id] of Object.entries({ mira: 'u-mira', coord: 'u-coord', org: 'u-org', eli: 'u-eli' })) await request('/api/session', persons[key], { id });
const { mira, coord, org, eli } = persons;
const state = person => request('/api/state', person);
const command = (person, body) => request('/api/command', person, body);
const snapshot = await state(coord);
assert.equal(snapshot.settings.clockMode, 'demo', 'Use an isolated demo server');
assert.ok(snapshot.users.every(user => user.synthetic), 'Expected fictional identities');
const directory = await request('/api/organizations', mira);
assert.deepEqual(directory.organizations.map(item => item.id).sort(), snapshot.users.filter(user => user.role === 'organization' && user.communityId === snapshot.actor.communityId).map(user => user.id).sort());
const profile = { about: 'Fictional community smoke check', services: ['Supplies'], serviceAreas: ['Riverside'], website: 'https://example.org' };
await request('/api/organizations', mira, profile, 'PUT', 403);
await request('/api/organizations', org, { ...profile, verified: true }, 'PUT', 400);
await request('/api/organizations', org, profile, 'PUT');
assert.deepEqual((await request('/api/organizations', mira)).organizations.find(item => item.id === 'u-org').profile, profile);
await request('/api/insights', mira, undefined, 'GET', 403);
const insights = await request('/api/insights', coord);
for (const key of ['totalRequests', 'everAcceptedRequests', 'activeCommitments', 'fullyResolvedRequests', 'confirmedNeeds', 'overdueUnresolvedRequests']) assert.ok(Number.isSafeInteger(insights[key]) && insights[key] >= 0);
const { medianHours, sampleCount, invalidExcludedCount } = insights.firstAcceptance;
assert.ok(Number.isSafeInteger(sampleCount) && sampleCount >= 0 && Number.isSafeInteger(invalidExcludedCount) && invalidExcludedCount >= 0);
assert.ok(sampleCount + invalidExcludedCount <= insights.everAcceptedRequests && insights.everAcceptedRequests <= insights.totalRequests);
assert.ok(sampleCount ? Number.isFinite(medianHours) && medianHours >= 0 : medianHours === null);
assert.equal(insights.participation.communityMembers, snapshot.users.filter(user => user.role === 'member').length);
assert.ok(insights.participation.helpersWithAcceptedCommitments <= insights.participation.communityMembers);
if (snapshot.settings.emergency) { await command(coord, { type: 'emergency', event: null }); console.log('Cleared the active demo incident.'); }
const now = (await state(coord)).settings.now;
async function createCase(isPrivate) {
  const text = `Fictional supplies check ${randomUUID()}`;
  const preview = await request('/api/intake', mira, { text, source: 'Website' });
  return (await command(mira, { type: 'createRequest', input: { text, source: 'Website', categories: ['Supplies'], area: 'Central Park', windowStart: new Date(Date.parse(now) + 3600000).toISOString(), windowEnd: new Date(Date.parse(now) + 12 * 3600000).toISOString(), previewToken: preview.previewToken, urgency: 'Routine', timingConfirmed: true, private: isPrivate } })).id;
}
const publicId = await createCase(false);
const privateId = await createCase(true);
await command(coord, { type: 'review', requestId: publicId });
const activity = await request('/api/community/activity', mira);
assert.ok(!activity.items.some(item => item.requestId === privateId || item.requestId === 'req-private'));
for (const item of activity.items) assert.deepEqual(Object.keys(item).sort(), ['area', 'at', 'categories', 'id', 'kind', 'requestId']);
const neighborhoods = await request('/api/neighborhoods', coord);
assert.deepEqual(neighborhoods.areas.map(item => item.area), ['Riverside', 'Maple Grove', 'Oakridge', 'Central Park', 'River Street']);
assert.ok(!neighborhoods.areas.flatMap(item => item.requests).some(item => item.id === privateId || item.id === 'req-private'));
const secret = `Fictional private resource description ${randomUUID()}`;
const resource = await command(org, { type: 'createResource', input: { name: `Fictional supplies ${randomUUID()}`, description: secret, category: 'Supplies', area: 'Riverside', capacityMode: 'consumable', capacity: 7 } });
const board = await request('/api/donations', mira);
assert.deepEqual(Object.keys(board).sort(), ['offers', 'resources']);
for (const row of board.resources) { assert.deepEqual(Object.keys(row).sort(), ['area', 'category', 'id', 'units']); assert.ok(['Groceries', 'Supplies'].includes(row.category)); }
for (const row of board.offers) { assert.deepEqual(Object.keys(row).sort(), ['area', 'category', 'endAt', 'id', 'startAt']); assert.ok(['Groceries', 'Supplies'].includes(row.category)); }
assert.ok(!JSON.stringify(board).includes(secret));
assert.equal(board.resources.find(item => item.id === resource.id)?.units, 7);
const zone = 'America/Chicago';
const day = formatInTimeZone(new Date(Date.parse(now) + 86400000), zone, 'yyyy-MM-dd');
const schedule = { description: `Fictional schedule ${randomUUID()}`, categories: ['Supplies'], areas: ['Central Park', 'Riverside'], startLocal: `${day}T12:00`, endLocal: `${day}T14:00`, weeks: 2, confirmed: true };
const before = (await state(eli)).offers.map(item => item.id).sort();
for (const invalid of [{ confirmed: false }, { categories: ['Medical'] }, { categories: ['Missing person'] }]) await request('/api/offers/schedule', eli, { ...schedule, ...invalid }, 'POST', 400);
assert.deepEqual((await state(eli)).offers.map(item => item.id).sort(), before);
const created = await request('/api/offers/schedule', eli, schedule);
assert.equal(created.ids.length, 4);
assert.equal(new Set(created.ids).size, 4);
const offers = (await state(eli)).offers.filter(item => created.ids.includes(item.id));
assert.equal(offers.length, 4);
const expected = [];
for (const week of [0, 1]) {
  const date = new Date(`${day}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + week * 7);
  const local = date.toISOString().slice(0, 10);
  for (const area of schedule.areas) expected.push(`${area}|${fromZonedTime(`${local}T12:00`, zone).toISOString()}|${fromZonedTime(`${local}T14:00`, zone).toISOString()}`);
}
assert.deepEqual(offers.map(item => `${item.area}|${item.startAt}|${item.endAt}`).sort(), expected.sort());
assert.ok(offers.every(item => item.userId === 'u-eli' && item.active && item.categories.length === 1 && item.categories[0] === 'Supplies'));
console.log(`Community HTTP checks passed for ${base}. Fictional records and event changes remain in the isolated demo database.`);
