import assert from 'node:assert/strict';

const base = (process.argv[2] || process.env.DEMO_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const origin = new URL(base).origin;

async function request(path, { persona, method = 'GET', body } = {}) {
  const headers = { Origin: origin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (persona?.cookie) headers.Cookie = persona.cookie;
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie && persona) persona.cookie = setCookie.split(';', 1)[0];
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { throw new Error(`${method} ${path} returned non-JSON: ${text.slice(0, 200)}`); }
  }
  return { response, data };
}

async function check(condition, message) { assert.ok(condition, message); }
async function mutate(persona, body) {
  const result = await request('/api/command', { persona, method: 'POST', body });
  assert.equal(result.response.status, 200, `Command ${body.type} failed: ${JSON.stringify(result.data)}`);
  return result.data;
}
async function snapshot(persona) {
  const result = await request('/api/state', { persona });
  assert.equal(result.response.status, 200, `State request failed: ${JSON.stringify(result.data)}`);
  return result.data;
}
async function detail(persona, id) {
  const result = await request(`/api/requests/${encodeURIComponent(id)}`, { persona });
  return result;
}

async function reviewedInput(persona, input) {
  const preview = await request('/api/intake', { persona, method: 'POST', body: { text: input.text, source: input.source } });
  assert.equal(preview.response.status, 200, 'The request needs a valid intake preview.');
  assert.ok(preview.data.previewToken, 'Intake did not return a signed preview.');
  return { ...input, previewToken: preview.data.previewToken, urgency: preview.data.extraction.urgency, timingConfirmed: true };
}

const personas = { mira: {}, eli: {}, teo: {}, naila: {}, org: {} };
for (const [name, id] of Object.entries({ mira: 'u-mira', eli: 'u-eli', teo: 'u-teo', naila: 'u-coord', org: 'u-org' })) {
  const result = await request('/api/session', { persona: personas[name], method: 'POST', body: { id } });
  assert.equal(result.response.status, 200, `Could not select ${name}: ${JSON.stringify(result.data)}`);
}

const intake = await request('/api/intake', { persona: personas.mira, method: 'POST', body: { text: 'I need groceries in Central Park today, please.' } });
assert.equal(intake.response.status, 200, `Default intake failed: ${JSON.stringify(intake.data)}`);
assert.ok(intake.data.extraction.categories.includes('Groceries'), 'No-key intake did not identify groceries.');
assert.equal(intake.data.extraction.area, 'Central Park', 'No-key intake did not identify Central Park.');
assert.equal(intake.data.provider, 'Deterministic fallback', 'The smoke check requires the default no-key provider.');

const initial = await snapshot(personas.mira);
if (initial.settings.emergency) {
  await mutate(personas.naila, { type: 'emergency', event: null });
  process.stdout.write('Cleared the active simulated incident in this test database before everyday matching checks.\n');
}
const now = initial.settings.now;
const windowStart = new Date(Date.parse(now) + 60 * 60_000).toISOString();
const windowEnd = new Date(Date.parse(now) + 3 * 60 * 60_000).toISOString();
const input = {
  text: `Demo check groceries and transport in Central Park. Token ${crypto.randomUUID()}.`,
  categories: ['Groceries', 'Transport'], area: 'Central Park', windowStart, windowEnd, source: 'Website',
};
const noPreview = await request('/api/command', { persona: personas.mira, method: 'POST', body: { type: 'createRequest', input } });
assert.notEqual(noPreview.response.status, 200, 'Creation without a reviewed intake preview was accepted.');
const created = await mutate(personas.mira, { type: 'createRequest', input: await reviewedInput(personas.mira, input) });
const requestId = created.id;
assert.ok(requestId, 'Request creation returned no ID.');
let miraDetail = await detail(personas.mira, requestId);
assert.equal(miraDetail.response.status, 200);
assert.equal(miraDetail.data.rawContent.includes('Demo check'), true, 'Requester cannot read their original request text.');
const groceryNeed = miraDetail.data.request.needs.find(need => need.category === 'Groceries');
assert.ok(groceryNeed, 'Created request has no grocery need.');
const eligibleOffer = miraDetail.data.matches.find(match => match.kind === 'offer' && match.helperId === 'u-eli' && match.needId === groceryNeed.id);
assert.ok(eligibleOffer, 'Eli has no eligible grocery offer for the created request.');
await mutate(personas.mira, { type: 'propose', requestId, needId: groceryNeed.id, offerId: eligibleOffer.id, resourceId: null });

// Untrusted body fields must not select a different actor; the server uses the signed cookie.
const forged = await request('/api/command', { persona: personas.teo, method: 'POST', body: { type: 'respond', id: (await detail(personas.mira, requestId)).data.commitments[0].id, accept: true, actorId: 'u-eli' } });
assert.equal(forged.response.status, 403, 'Unsigned actor fields bypassed authorization.');
assert.ok(!forged.data?.error?.includes('Unknown key'), 'The command contract should ignore or reject actor fields, but authorization must still deny Teo.');

const commitmentId = miraDetail.data.commitments[0]?.id ?? (await detail(personas.mira, requestId)).data.commitments[0]?.id;
assert.ok(commitmentId, 'Proposal did not create a commitment.');
await mutate(personas.mira, { type: 'message', requestId, commitmentId, text: 'Private detail before acceptance must be denied.' }).then(() => { throw new Error('A private message was accepted before mutual agreement.'); }, error => {
  assert.match(error.message, /Command message failed/);
});
const proposal = await detail(personas.mira, requestId);
assert.equal(proposal.data.commitments.find(item => item.id === commitmentId).status, 'proposed');
await mutate(personas.eli, { type: 'respond', id: commitmentId, accept: true });
await mutate(personas.eli, { type: 'progress', id: commitmentId, action: 'start' });
await mutate(personas.eli, { type: 'progress', id: commitmentId, action: 'deliver' });
await mutate(personas.mira, { type: 'message', requestId, commitmentId, text: 'Groceries are at the agreed pickup point.' });
const eliRead = await detail(personas.eli, requestId);
assert.equal(eliRead.response.status, 200);
assert.ok(eliRead.data.messages.some(message => message.commitmentId === commitmentId && message.text === 'Groceries are at the agreed pickup point.'), 'Accepted participant cannot read the private thread.');
const teoRead = await detail(personas.teo, requestId);
assert.equal(teoRead.response.status, 200);
assert.ok(!teoRead.data.messages.some(message => message.text === 'Groceries are at the agreed pickup point.'), 'Unrelated member read private message text.');
const unauthorized = await detail(personas.teo, 'req-private');
assert.equal(unauthorized.response.status, 403, 'Unrelated member could read a restricted request.');
await mutate(personas.mira, { type: 'progress', id: commitmentId, action: 'confirm' });
miraDetail = await detail(personas.mira, requestId);
assert.equal(miraDetail.data.commitments.find(item => item.id === commitmentId).status, 'confirmed');
assert.ok(miraDetail.data.request.needs.some(need => need.category === 'Transport' && need.status === 'open'), 'Confirming groceries incorrectly resolved the transport need.');

const wrongOrigin = await fetch(`${base}/api/command`, { method: 'POST', headers: { Origin: 'https://invalid.example', 'Content-Type': 'application/json', Cookie: personas.mira.cookie }, body: JSON.stringify({ type: 'progress', id: commitmentId, action: 'confirm' }) });
assert.equal(wrongOrigin.status, 403, 'Cross-origin command was accepted.');

const beforeClose = (await snapshot(personas.mira)).metrics.confirmed;
const unconfirmed = await mutate(personas.mira, { type: 'createRequest', input: await reviewedInput(personas.mira, {
  text: `Demo check unconfirmed follow-up. Token ${crypto.randomUUID()}.`, categories: ['Groceries'], area: 'Central Park', windowStart, windowEnd, source: 'Website',
}) });
await mutate(personas.naila, { type: 'close', requestId: unconfirmed.id, outcome: 'unconfirmed', reason: 'No requester response after follow-up.' });
const afterClose = await snapshot(personas.naila);
assert.equal(afterClose.metrics.confirmed, beforeClose, 'Unconfirmed closure increased confirmed assistance.');
assert.ok(afterClose.requests.find(item => item.id === unconfirmed.id)?.closure, 'Coordinator closure did not persist.');

// Leave the lifecycle request in its final state. The unconfirmed closure is intentionally retained for inspection.
await check(true, 'Demo check finished.');
process.stdout.write(`Demo HTTP checks passed for ${base}. Created lifecycle request ${requestId} and unconfirmed request ${unconfirmed.id}. The script did not reset the database.\n`);
