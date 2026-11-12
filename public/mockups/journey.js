/* Browser-only demonstration model. No API, database, credentials, or authentication. */
class PrototypeJourney {
  constructor() {
    this.key = 'community-help-connected-prototype-v1';
    this.data = this.empty();
    try {
      const saved = JSON.parse(sessionStorage.getItem(this.key) || 'null');
      if (this.isValid(saved)) this.data = saved;
    } catch { /* file:// or restricted storage: use memory for this tab. */ }
  }
  empty() { return { version: 1, persona: null, request: null }; }
  isValid(value) {
    const string = v => typeof v === 'string';
    if (!value || value.version !== 1 || ![null, 'mira', 'eli'].includes(value.persona)) return false;
    const r = value.request;
    if (r === null) return true;
    return r && ['raw', 'area', 'timing', 'createdAt'].every(k => string(r[k])) &&
      ['open', 'invited', 'connected', 'in_progress', 'awaiting_confirmation', 'resolved', 'follow_up'].includes(r.stage) &&
      Array.isArray(r.events) && r.events.every(e => e && string(e.title) && string(e.actor) && string(e.time)) &&
      Array.isArray(r.messages) && r.messages.every(m => m && ['mira', 'eli'].includes(m.actor) && string(m.text));
  }
  save() { try { sessionStorage.setItem(this.key, JSON.stringify(this.data)); } catch { /* Memory-only operation still works. */ } }
  signIn(persona) { this.assert(['mira', 'eli'].includes(persona), 'Choose a fictional demo persona.'); this.data.persona = persona; this.save(); }
  signOut() { this.data.persona = null; this.save(); }
  get request() { return this.data.request; }
  get persona() { return this.data.persona; }
  assert(condition, message) { if (!condition) throw new Error(message); }
  requireStage(stage) { this.assert(this.request && this.request.stage === stage, 'That step is not available yet.'); }
  requirePersona(persona) { this.assert(this.persona === persona, `Use the ${persona === 'mira' ? 'requester' : 'helper'} preview for this action.`); }
  addEvent(title) {
    this.assert(this.request, 'Create a request first.');
    this.request.events.push({ title, actor: this.persona === 'eli' ? 'Eli Navarro' : 'Mira Patel', time: 'Just now · demo' });
    this.save();
  }
  create({ raw, area, timing }) {
    this.requirePersona('mira');
    this.assert(typeof raw === 'string' && raw.trim().length >= 12 && raw.length <= 1200, 'Describe the fictional grocery request in 12–1,200 characters.');
    this.assert(['Central Park', 'Riverside', 'Maple Grove', 'Oakridge'].includes(area), 'Choose a general neighborhood.');
    this.assert(['Today, 1–5 PM', 'Tomorrow, 9 AM–noon'].includes(timing), 'Choose a timeframe.');
    this.data.request = { raw: raw.trim(), area, timing, stage: 'open', createdAt: 'Today · demo', events: [], messages: [] };
    this.addEvent('Request posted with a safe public summary. Original message kept separate.');
  }
  get hasMatch() { return Boolean(this.request && ['Central Park', 'Riverside'].includes(this.request.area) && this.request.timing === 'Today, 1–5 PM'); }
  invite() {
    this.requirePersona('mira'); this.requireStage('open');
    this.assert(this.hasMatch, 'Eli does not cover this request’s area and time.');
    this.request.stage = 'invited'; this.addEvent('Mira invited Eli. Requester agreement recorded; waiting for Eli.');
  }
  respond(accept) {
    this.requirePersona('eli'); this.requireStage('invited');
    this.request.stage = accept ? 'connected' : 'open';
    this.addEvent(accept ? 'Eli accepted. Both neighbors agreed; private coordination opened.' : 'Eli declined. The request stays open for another connection.');
  }
  start() { this.requirePersona('eli'); this.requireStage('connected'); this.request.stage = 'in_progress'; this.addEvent('Eli started the grocery pickup. Assistance is in progress.'); }
  deliver() { this.requirePersona('eli'); this.requireStage('in_progress'); this.request.stage = 'awaiting_confirmation'; this.addEvent('Eli reported delivery. Waiting for Mira to confirm receiving groceries.'); }
  confirm() { this.requirePersona('mira'); this.requireStage('awaiting_confirmation'); this.request.stage = 'resolved'; this.addEvent('Mira confirmed receiving groceries. The request is now resolved.'); }
  followUp() { this.requirePersona('mira'); this.requireStage('awaiting_confirmation'); this.request.stage = 'follow_up'; this.addEvent('Mira reported that help is still needed. Follow-up required; no successful outcome counted.'); }
  cancel() {
    this.assert(this.request && ['invited', 'connected', 'in_progress'].includes(this.request.stage), 'This connection cannot be cancelled now.');
    this.request.stage = 'open'; this.request.messages = [];
    this.addEvent('Connection cancelled. The grocery need is open again; private coordination is closed.');
  }
  get privateOpen() { return Boolean(this.request && ['connected', 'in_progress', 'awaiting_confirmation', 'resolved', 'follow_up'].includes(this.request.stage)); }
  message(text) {
    this.assert(this.persona && this.privateOpen, 'Both neighbors must agree before private coordination opens.');
    this.assert(typeof text === 'string' && text.trim().length > 0 && text.length <= 500, 'Write a message of 1–500 characters.');
    this.request.messages.push({ actor: this.persona, text: text.trim() }); this.save();
  }
  reset() { this.data = this.empty(); this.save(); }
}
