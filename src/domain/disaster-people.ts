import { z } from 'zod';
import { AreaSchema, CommunityCheckInSchema, CommunityNoticeSchema, PeopleAgeGroupSchema, PeopleRecordSchema, PeopleStatusSchema, requireCondition, type State } from './model';
import type { Repository } from './store';

const NameSchema = z.string().trim().min(2).max(100).regex(/^[\p{L}\p{M} .'-]+$/u, 'Enter a name only, without contact or location details.');
const CommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('report'), personName: NameSchema, relationship: z.enum(['family', 'friend', 'neighbor', 'other']), area: AreaSchema, ageGroup: PeopleAgeGroupSchema, lastSeenAt: z.iso.datetime().nullable().optional(), lastKnownContext: z.string().trim().max(500).optional(), authorized: z.literal(true), shareWithCommunity: z.boolean().default(false), shareAdultName: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal('check_in'), area: AreaSchema, shareWithCommunity: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal('set_visibility'), id: z.string().uuid(), shared: z.boolean() }).strict(),
  z.object({ action: z.literal('tip'), id: z.string().uuid(), text: z.string().trim().min(1).max(500) }).strict(),
  z.object({ action: z.literal('review'), id: z.string().uuid(), status: PeopleStatusSchema }).strict(),
  z.object({ action: z.literal('request_information'), id: z.string().uuid(), question: z.string().trim().min(1).max(500) }).strict(),
  z.object({ action: z.literal('reply_information'), id: z.string().uuid(), reply: z.string().trim().min(1).max(500) }).strict(),
]);
export const PeopleProjectionSchema = z.object({ records: z.array(PeopleRecordSchema), communityNotices: z.array(CommunityNoticeSchema), communityCheckIns: z.array(CommunityCheckInSchema) }).strict();

export class DisasterPeopleService {
  constructor(private readonly repository: Repository) {}
  private actor(state: State, id: string) {
    const actor = state.users.find(user => user.id === id);
    requireCondition(actor, 'Sign in required.', 401);
    return actor;
  }
  list(actorId: string) {
    const state = this.repository.read();
    const actor = this.actor(state, actorId);
    const community = state.peopleRecords.filter(record => record.communityId === actor.communityId);
    return PeopleProjectionSchema.parse({
      records: community.filter(record => record.authorId === actor.id || actor.role === 'coordinator').slice().reverse(),
      communityNotices: community.filter(record => record.shared && record.kind === 'missing').map(record => ({ id: record.id, area: record.area, status: record.status, personName: record.shareAdultName && record.ageGroup === 'adult' ? record.personName : null })).reverse(),
      communityCheckIns: community.filter(record => record.shared && record.kind === 'safe_check_in').flatMap(record => { const author = state.users.find(user => user.id === record.authorId && user.communityId === actor.communityId); return author ? [{ id: record.id, name: author.name, area: record.area, status: 'self_reported_safe' as const }] : []; }).reverse(),
    });
  }
  execute(actorId: string, input: unknown) {
    const command = CommandSchema.parse(input);
    return this.repository.transaction(state => {
      const actor = this.actor(state, actorId);
      if (command.action === 'set_visibility' || command.action === 'tip') {
        const record = state.peopleRecords.find(item => item.id === command.id && item.communityId === actor.communityId);
        requireCondition(record, 'Record not found.', 404);
        if (command.action === 'set_visibility') {
          requireCondition(record.authorId === actor.id, 'Only the author can change sharing.', 403);
          record.shared = command.shared;
          if (!command.shared) record.shareAdultName = false;
        } else {
          requireCondition(record.kind === 'missing' && record.shared, 'Notice not found.', 404);
          record.tips.push({ authorId: actor.id, text: command.text, at: state.settings.now });
        }
        return;
      }
      if (command.action === 'review' || command.action === 'request_information' || command.action === 'reply_information') {
        if (command.action !== 'reply_information') requireCondition(actor.role === 'coordinator', 'Coordinator permission is required.', 403);
        const record = state.peopleRecords.find(item => item.id === command.id && item.communityId === actor.communityId);
        requireCondition(record && record.kind === 'missing', 'Report not found.', 404);
        if (command.action === 'review') {
          requireCondition(record.status !== command.status, 'Choose a different status.');
          record.status = command.status;
          record.history.push({ status: command.status, actorId: actor.id, at: state.settings.now, action: 'status_changed', note: '' });
          return;
        }
        const latestExchange = record.history.slice().reverse().find(entry => entry.action === 'information_requested' || entry.action === 'information_replied');
        if (command.action === 'request_information') {
          requireCondition(record.status !== 'closed', 'Reopen the report before requesting information.');
          requireCondition(latestExchange?.action !== 'information_requested', 'Wait for the author to reply to the current question.');
          record.status = 'under_review';
          record.history.push({ status: record.status, actorId: actor.id, at: state.settings.now, action: 'information_requested', note: command.question });
        } else {
          requireCondition(record.authorId === actor.id, 'Only the report author can reply.', 403);
          requireCondition(latestExchange?.action === 'information_requested', 'There is no unanswered question.');
          record.history.push({ status: record.status, actorId: actor.id, at: state.settings.now, action: 'information_replied', note: command.reply });
        }
        return;
      }
      const at = state.settings.now;
      if (command.action === 'report') requireCondition(!command.shareAdultName || (command.shareWithCommunity && command.ageGroup === 'adult'), 'An adult name can be shared only with explicit community sharing.');
      if (command.action === 'report' && command.lastSeenAt) requireCondition(Date.parse(command.lastSeenAt) <= Date.parse(at), 'Last seen cannot be after the workspace time.');
      state.peopleRecords.push({ id: crypto.randomUUID(), communityId: actor.communityId, authorId: actor.id, incidentId: state.settings.emergency?.id ?? null, area: command.area, createdAt: at, kind: command.action === 'report' ? 'missing' : 'safe_check_in', personName: command.action === 'report' ? command.personName : null, relationship: command.action === 'report' ? command.relationship : null, ageGroup: command.action === 'report' ? command.ageGroup : 'unknown', lastSeenAt: command.action === 'report' ? command.lastSeenAt ?? null : null, lastKnownContext: command.action === 'report' ? command.lastKnownContext ?? '' : '', shared: command.shareWithCommunity, shareAdultName: command.action === 'report' && command.shareAdultName, tips: [], status: 'submitted', history: [{ status: 'submitted', actorId: actor.id, at, action: 'status_changed', note: '' }] });
    });
  }
}
