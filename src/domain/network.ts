import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AreaSchema, CategorySchema, DomainError, isActive, requestStatus, requireCondition, type Commitment, type HelpRequest, type PublicRequest, type State, type User } from './model';
import type { Repository } from './store';
import type { VerifiedPreview } from '../server/intake-preview';
import { MatchingService } from './matching';
import { FollowUpService } from './followup';
import { publicSummary, safeTitle, safetyFlags } from './safety';

import { CreateRequestSchema, CreateOfferSchema, type CreateRequestInput, type CreateOfferInput } from './inputs';
export class NetworkService {
  constructor(private readonly repository: Repository) {}
  private user(state: State, id: string) { const user = state.users.find(u => u.id === id); requireCondition(user, 'Choose a valid demo identity.', 401); return user; }
  private request(state: State, user: User, id: string) {
    const request = state.requests.find(r => r.id === id && r.communityId === user.communityId);
    requireCondition(request, 'Request not found.', 404);
    const invitedOrganization = user.role === 'organization' && user.verified && state.commitments.some(c => c.requestId === request.id && c.helperId === user.id && !['cancelled', 'rejected'].includes(c.status));
    requireCondition(!request.restricted || user.role === 'coordinator' || request.requesterId === user.id || invitedOrganization, 'This request is private to its requester and authorized coordinators.', 403);
    return request;
  }
  private coordinator(user: User) { requireCondition(user.role === 'coordinator', 'Coordinator permission is required.', 403); }
  private event(state: State, requestId: string, actorId: string, text: string) { state.events.push({ id: randomUUID(), requestId, actorId, text, at: state.settings.now }); }
  private publicRequest(request: HelpRequest): PublicRequest {
    const { rawContent: _raw, safetyFlags: _flags, reviewedBy: _review, intakeProvenance: _provenance, ...safe } = request;
    return { ...safe, closure: safe.closure ? { ...safe.closure, reason: 'Administrative outcome recorded privately.' } : null };
  }
  private canCoordinate(state: State, request: HelpRequest, user: User) {
    return user.role === 'coordinator' || user.id === request.requesterId || state.commitments.some(c => c.requestId === request.id && c.helperId === user.id && (isActive(c) || c.status === 'confirmed'));
  }
  publicOverview() {
    const state = this.repository.read();
    const requests = state.requests.filter(r => r.communityId === 'riverton' && !r.restricted);
    return { metrics: { members: state.users.filter(u => u.communityId === 'riverton').length, offers: state.offers.filter(o => o.communityId === 'riverton' && o.active).length, confirmed: requests.filter(r => requestStatus(r) === 'Resolved').length, open: requests.filter(r => !r.closure && requestStatus(r) !== 'Resolved').length }, examples: requests.filter(r => !r.closure && requestStatus(r) !== 'Resolved').slice(0, 4).flatMap(r => r.needs.filter(n => n.status === 'open').map(n => ({ category: n.category, area: r.area, windowEnd: r.windowEnd }))).slice(0, 4) };
  }
  snapshot(userId: string) {
    const state = this.repository.read(); const actor = this.user(state, userId);
    const requests = state.requests.filter(r => r.communityId === actor.communityId && (!r.restricted || r.requesterId === actor.id || actor.role === 'coordinator' || (actor.role === 'organization' && actor.verified && state.commitments.some(c => c.requestId === r.id && c.helperId === actor.id && !['cancelled', 'rejected'].includes(c.status)))));
    const commitments = state.commitments.filter(c => requests.some(r => r.id === c.requestId) && (actor.role === 'coordinator' || c.helperId === actor.id || requests.some(r => r.id === c.requestId && r.requesterId === actor.id)));
    return { actor, users: state.users.filter(u => u.communityId === actor.communityId), requests: requests.map(r => ({ ...this.publicRequest(r), status: requestStatus(r), flags: new FollowUpService().evaluate(state, r) })),
      offers: state.offers.filter(o => o.communityId === actor.communityId).map(o => ({ ...o, description: o.userId === actor.id ? o.description : `Offers ${o.categories.join(', ').toLowerCase()} in ${o.area}.` })),
      resources: state.resources.filter(r => r.communityId === actor.communityId), commitments, settings: state.settings,
      reports: actor.role === 'coordinator' ? state.reports.filter(report => requests.some(r => r.id === report.requestId)) : [],
      metrics: { members: state.users.filter(u => u.communityId === actor.communityId).length, open: requests.filter(r => !r.closure && requestStatus(r) !== 'Resolved').length,
        confirmed: requests.filter(r => requestStatus(r) === 'Resolved').length, needsAttention: requests.filter(r => new FollowUpService().evaluate(state, r).length > 0).length,
        offers: state.offers.filter(o => o.communityId === actor.communityId && o.active).length } };
  }
  detail(userId: string, requestId: string) {
    const state = this.repository.read(); const actor = this.user(state, userId); const request = this.request(state, actor, requestId);
    const allowed = this.canCoordinate(state, request, actor);
    const ownerOrCoordinator = actor.id === request.requesterId || actor.role === 'coordinator';
    const commitments = state.commitments.filter(c => c.requestId === requestId && (ownerOrCoordinator || c.helperId === actor.id));
    return { request: this.publicRequest(request), status: requestStatus(request), rawContent: ownerOrCoordinator ? request.rawContent : null,
      safetyFlags: ownerOrCoordinator ? request.safetyFlags : [], reviewedBy: ownerOrCoordinator ? request.reviewedBy : null,
      closureReason: ownerOrCoordinator ? request.closure?.reason ?? null : null,
      canCoordinate: allowed, commitments,
      messages: state.messages.filter(m => m.requestId === requestId && (ownerOrCoordinator || (m.commitmentId !== null && commitments.some(c => c.id === m.commitmentId && c.helperId === actor.id && (isActive(c) || c.status === 'confirmed'))))),
      events: state.events.filter(e => e.requestId === requestId && (ownerOrCoordinator || e.actorId === actor.id)),
      matches: new MatchingService().find(state, request, actor), flags: ownerOrCoordinator ? new FollowUpService().evaluate(state, request) : [],
      potentialDuplicates: actor.role === 'coordinator' ? state.requests.filter(r => r.id !== requestId && r.communityId === request.communityId && r.area === request.area && r.needs.some(n => request.needs.some(own => own.category === n.category)) && Math.abs(Date.parse(r.createdAt) - Date.parse(request.createdAt)) < 24 * 3600000).map(r => ({ id: r.id, title: r.title, reason: 'Same neighborhood and overlapping category within 24 demo hours. Review only; never automatically merged.' })) : [] };
  }
  createRequest(userId: string, input: CreateRequestInput, preview?: VerifiedPreview) {
    const parsed = CreateRequestSchema.parse(input);
    return this.repository.transaction(state => {
      const actor = this.user(state, userId);
      requireCondition(Date.parse(parsed.windowEnd) > Date.parse(parsed.windowStart), 'End time must be after start time.');
      requireCondition(Date.parse(parsed.windowEnd) > Date.parse(state.settings.now), 'Choose a future demo time window.');
      const forced: z.infer<typeof CategorySchema>[] = [];
      const flags = [...new Set([...safetyFlags(parsed.text), ...(preview?.result.extraction.safetyFlags ?? [])])];
      if (parsed.private) flags.push('manual_private');
      if (flags.includes('medical')) forced.push('Medical');
      if (flags.includes('missing_person')) forced.push('Missing person');
      const categories = [...new Set([...parsed.categories, ...forced])];
      if (categories.some(c => c === 'Medical' || c === 'Missing person') && !flags.length) flags.push('sensitive');
      const id = randomUUID();
      state.requests.unshift({ id, communityId: actor.communityId, requesterId: actor.id, title: safeTitle(categories), summary: publicSummary(categories), rawContent: parsed.text,
        area: parsed.area, windowStart: parsed.windowStart, windowEnd: parsed.windowEnd, urgency: flags.length ? 'Critical review' : parsed.urgency ?? (/urgent|asap/i.test(parsed.text) ? 'Urgent' : 'Routine'),
        safetyFlags: flags, restricted: flags.length > 0, source: parsed.source,
        needs: categories.map(category => ({ id: randomUUID(), category, status: 'open' })), createdAt: state.settings.now, reviewedBy: null, intakeProvenance: preview && parsed.urgency ? { ...preview.result, suggestedUrgency: preview.result.extraction.urgency, selectedUrgency: parsed.urgency } : null, closure: null });
      this.event(state, id, actor.id, flags.length ? 'Private request received. Authorized human review required.' : 'Request posted with a safe summary. Original intake is private.');
      return id;
    });
  }
  createOffer(userId: string, input: CreateOfferInput) {
    const parsed = CreateOfferSchema.parse(input);
    return this.repository.transaction(state => {
      const actor = this.user(state, userId);
      requireCondition(!parsed.categories.some(c => ['Medical', 'Missing person'].includes(c)), 'Specialized assistance is handled through qualified organization resources.');
      requireCondition(Date.parse(parsed.endAt) > Date.parse(parsed.startAt) && Date.parse(parsed.endAt) > Date.parse(state.settings.now), 'Choose a valid future availability window.');
      const id = randomUUID(); state.offers.unshift({ ...parsed, id, userId: actor.id, communityId: actor.communityId, active: true, readyForEvent: null }); return id;
    });
  }
  propose(userId: string, requestId: string, needId: string, offerId: string | null, resourceId: string | null) {
    return this.repository.transaction(state => {
      const actor = this.user(state, userId); const request = this.request(state, actor, requestId);
      requireCondition(!request.closure, 'This request is closed.');
      const need = request.needs.find(n => n.id === needId); requireCondition(need?.status === 'open', 'This need already has an active connection.');
      requireCondition(Boolean(offerId) !== Boolean(resourceId), 'Select one offer or resource.');
      if (request.restricted) { this.coordinator(actor); requireCondition(request.reviewedBy, 'Review this restricted request before proposing a referral.'); }
      const match = new MatchingService().find(state, request, actor).find(m => m.needId === needId && m.id === (offerId ?? resourceId));
      requireCondition(match, 'This helper/resource is no longer eligible. Refresh availability and incident readiness.');
      requireCondition(actor.role === 'coordinator' || actor.id === request.requesterId || actor.id === match.helperId, 'Only the requester, helper, or coordinator can propose this connection.', 403);
      requireCondition(!state.commitments.some(c => c.needId === needId && c.helperId === match.helperId && c.status === 'proposed'), 'A proposal for this connection is already waiting.');
      requireCondition(match.helperId !== request.requesterId, 'Requester and helper must be different participants.');
      const id = randomUUID();
      state.commitments.push({ id, requestId, needId, helperId: match.helperId, offerId, resourceId, requesterApproved: actor.id === request.requesterId,
        helperApproved: actor.id === match.helperId, status: 'proposed', createdAt: state.settings.now, acceptedAt: null, completedAt: null });
      this.event(state, requestId, actor.id, `Connection proposed for ${need.category.toLowerCase()}; both participants must agree.`);
      return id;
    });
  }
  private commitment(state: State, actor: User, id: string) {
    const commitment = state.commitments.find(c => c.id === id); requireCondition(commitment, 'Connection not found.', 404);
    const request = state.requests.find(r => r.id === commitment.requestId && r.communityId === actor.communityId); requireCondition(request, 'Connection not found.', 404);
    requireCondition(actor.id === request.requesterId || actor.id === commitment.helperId || actor.role === 'coordinator', 'This connection belongs to other members.', 403);
    return { commitment, request };
  }
  respond(userId: string, id: string, accept: boolean) {
    this.repository.transaction(state => {
      const actor = this.user(state, userId); const { commitment, request } = this.commitment(state, actor, id);
      requireCondition(!request.closure && commitment.status === 'proposed', 'This proposal is no longer pending.');
      requireCondition(actor.id === request.requesterId || actor.id === commitment.helperId, 'Only the two participants can give consent.', 403);
      requireCondition(commitment.helperId !== request.requesterId, 'Requester and helper must be different participants.');
      if (!accept) { commitment.status = 'rejected'; this.event(state, request.id, actor.id, 'Connection declined. The need remains open.'); return; }
      if (actor.id === request.requesterId) commitment.requesterApproved = true;
      if (actor.id === commitment.helperId) commitment.helperApproved = true;
      if (commitment.helperApproved && commitment.requesterApproved) {
        const coordinatorViewer = state.users.find(u => u.communityId === actor.communityId && u.role === 'coordinator') ?? actor;
        const match = new MatchingService().find(state, request, coordinatorViewer).find(m => m.needId === commitment.needId && m.id === (commitment.offerId ?? commitment.resourceId));
        requireCondition(match, 'Availability changed. This connection cannot be accepted; please choose another helper.');
        const need = request.needs.find(n => n.id === commitment.needId); requireCondition(need?.status === 'open', 'Another connection already fulfills this need.');
        if (commitment.resourceId) { const resource = state.resources.find(r => r.id === commitment.resourceId); requireCondition(resource && resource.reserved < resource.capacity, 'Resource capacity is no longer available.'); resource.reserved++; }
        commitment.status = 'accepted'; commitment.acceptedAt = state.settings.now; need.status = 'connected';
        for (const other of state.commitments.filter(c => c.needId === need.id && c.id !== id && c.status === 'proposed')) other.status = 'rejected';
        this.event(state, request.id, actor.id, `Both participants agreed on ${need.category.toLowerCase()}. Private coordination is now available.`);
        return;
      }
      this.event(state, request.id, actor.id, 'One participant agreed; waiting for the other participant.');
    });
  }
  private releaseResource(state: State, c: Commitment) {
    if (!c.resourceId || !isActive(c)) return;
    const resource = state.resources.find(r => r.id === c.resourceId);
    if (resource && (resource.capacityMode === 'concurrent' || c.status !== 'delivered')) {
      requireCondition(resource.reserved > 0, 'Resource reservation is inconsistent.');
      resource.reserved--;
    }
  }
  progress(userId: string, id: string, action: 'start' | 'deliver' | 'confirm' | 'cancel') {
    this.repository.transaction(state => {
      const actor = this.user(state, userId); const { commitment: c, request } = this.commitment(state, actor, id);
      requireCondition(!request.closure, 'This request is closed.');
      const need = request.needs.find(n => n.id === c.needId); requireCondition(need, 'Need not found.');
      if (action === 'cancel') {
        requireCondition(isActive(c) || c.status === 'proposed', 'This connection cannot be cancelled.');
        this.releaseResource(state, c);
        if (isActive(c)) need.status = 'open'; c.status = 'cancelled';
        this.event(state, request.id, actor.id, 'Connection cancelled. The affected need is open for a new connection.'); return;
      }
      if (action === 'confirm') {
        requireCondition(actor.id === request.requesterId, 'Only the requester confirms received assistance. Coordinators can document a separate closure.', 403);
        requireCondition(c.status === 'delivered', 'The helper must report delivery before confirmation.');
        this.releaseResource(state, c);
        c.status = 'confirmed'; need.status = 'resolved';
        this.event(state, request.id, actor.id, `Requester confirmed ${need.category.toLowerCase()} received. Other outstanding needs remain tracked.`); return;
      }
      requireCondition(actor.id === c.helperId, 'Only the assigned helper can report progress.', 403);
      if (action === 'start') { requireCondition(c.status === 'accepted', 'Start requires an agreed connection.'); c.status = 'in_progress'; need.status = 'in_progress'; }
      if (action === 'deliver') { requireCondition(c.status === 'in_progress', 'Start assistance before reporting delivery.'); c.status = 'delivered'; c.completedAt = state.settings.now; need.status = 'awaiting_confirmation'; }
      this.event(state, request.id, actor.id, action === 'start' ? `Assistance started for ${need.category.toLowerCase()}.` : `Helper reported ${need.category.toLowerCase()} delivered. Awaiting requester confirmation.`);
    });
  }
  message(userId: string, requestId: string, commitmentId: string, text: string) {
    const message = z.string().trim().min(1).max(2000).parse(text);
    this.repository.transaction(state => {
      const actor = this.user(state, userId); const request = this.request(state, actor, requestId);
      const c = state.commitments.find(item => item.id === commitmentId && item.requestId === requestId);
      requireCondition(c && (isActive(c) || c.status === 'confirmed') && (actor.id === request.requesterId || actor.id === c.helperId || actor.role === 'coordinator'), 'Private coordination opens for the agreed participants.', 403);
      state.messages.push({ id: randomUUID(), requestId, commitmentId, actorId: actor.id, text: message, at: state.settings.now });
    });
  }
  review(userId: string, requestId: string) {
    this.repository.transaction(state => { const actor = this.user(state, userId); this.coordinator(actor); const request = this.request(state, actor, requestId);
      request.reviewedBy = actor.id; this.event(state, requestId, actor.id, 'Coordinator reviewed the request. Sensitive referrals still require qualified partners and participant agreement.'); });
  }
  closeRequest(userId: string, requestId: string, outcome: NonNullable<HelpRequest['closure']>['outcome'], reason: string) {
    const note = z.string().trim().min(8).max(500).parse(reason);
    this.repository.transaction(state => {
      const actor = this.user(state, userId); const request = this.request(state, actor, requestId);
      if (outcome !== 'withdrawn') this.coordinator(actor);
      else requireCondition(actor.role === 'coordinator' || actor.id === request.requesterId, 'Only the requester can withdraw.', 403);
      requireCondition(!request.closure && requestStatus(request) !== 'Resolved', 'This request already has a final outcome.');
      request.closure = { outcome, reason: note, actorId: actor.id, at: state.settings.now };
      for (const c of state.commitments.filter(c => c.requestId === requestId && (isActive(c) || c.status === 'proposed'))) {
        this.releaseResource(state, c);
        c.status = 'cancelled';
      }
      this.event(state, requestId, actor.id, `Case closed as ${outcome.replaceAll('_', ' ')}. This is not counted as confirmed assistance.`);
    });
  }
  setEmergency(userId: string, type: NonNullable<State['settings']['emergency']>['type'] | null) {
    this.repository.transaction(state => { const actor = this.user(state, userId); this.coordinator(actor);
      requireCondition(actor.communityId === 'riverton', 'This demo incident is available only for Riverton.');
      state.settings.emergency = type ? { id: randomUUID(), type, name: `Riverton ${type.toLowerCase()} response`, startedAt: state.settings.now } : null;
      for (const request of state.requests.filter(r => r.communityId === actor.communityId && !r.closure)) this.event(state, request.id, actor.id, type ? `SIMULATION: ${type} response activated. Existing offers and resources must reconfirm incident readiness.` : 'SIMULATION: Everyday operation restored.'); });
  }
  setOffer(userId: string, offerId: string, active: boolean, ready: boolean) {
    this.repository.transaction(state => { const actor = this.user(state, userId); const offer = state.offers.find(o => o.id === offerId && o.communityId === actor.communityId); requireCondition(offer, 'Offer not found.', 404);
      requireCondition(actor.id === offer.userId, 'Only an offer owner can update availability.', 403); offer.active = active; offer.readyForEvent = ready ? state.settings.emergency?.id ?? null : null; });
  }
  setResource(userId: string, id: string, capacity: number, active: boolean, ready: boolean) {
    this.repository.transaction(state => { const actor = this.user(state, userId); const resource = state.resources.find(r => r.id === id && r.communityId === actor.communityId); requireCondition(resource, 'Resource not found.', 404);
      requireCondition(actor.id === resource.ownerId, 'Only the organization owning a resource can reaffirm availability.', 403);
      requireCondition(Number.isInteger(capacity) && capacity >= resource.reserved && capacity <= 10000, 'Capacity must cover current reservations and be at most 10,000.');
      resource.capacity = capacity; resource.active = active; resource.verifiedAt = state.settings.now; resource.readyForEvent = ready ? state.settings.emergency?.id ?? null : null; });
  }
  advanceClock(userId: string, hours: number) { this.repository.transaction(state => { this.coordinator(this.user(state, userId)); requireCondition(Number.isInteger(hours) && hours >= 0 && hours <= 24, 'Advance between 0 and 24 hours.'); state.settings.now = new Date(Date.parse(state.settings.now) + hours * 3600000).toISOString(); }); }
  report(userId: string, requestId: string, reason: string) {
    const text = z.string().trim().min(8).max(500).parse(reason);
    this.repository.transaction(state => { const actor = this.user(state, userId); this.request(state, actor, requestId); state.reports.push({ id: randomUUID(), requestId, actorId: actor.id, reason: text, at: state.settings.now, resolved: false }); });
  }
  moderate(userId: string, reportId: string, hide: boolean) {
    this.repository.transaction(state => { const actor = this.user(state, userId); this.coordinator(actor); const report = state.reports.find(r => r.id === reportId); requireCondition(report, 'Report not found.'); const request = this.request(state, actor, report.requestId);
      report.resolved = true; if (hide) {
        request.restricted = true; request.reviewedBy = null;
        if (!request.safetyFlags.includes('moderation')) request.safetyFlags.push('moderation');
        for (const c of state.commitments.filter(c => c.requestId === request.id && (isActive(c) || c.status === 'proposed'))) {
          const helper = state.users.find(u => u.id === c.helperId);
          if (c.resourceId && helper?.role === 'organization' && helper.verified) continue;
          this.releaseResource(state, c);
          const need = request.needs.find(n => n.id === c.needId);
          if (need && isActive(c)) need.status = 'open';
          c.status = 'cancelled';
        }
      }
      this.event(state, request.id, actor.id, hide ? 'Coordinator restricted community visibility after a report.' : 'Coordinator reviewed the community report.'); });
  }
}
export type Snapshot = ReturnType<NetworkService['snapshot']>;
export type RequestDetail = ReturnType<NetworkService['detail']>;
