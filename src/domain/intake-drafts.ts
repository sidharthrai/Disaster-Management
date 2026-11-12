import { z } from 'zod';
import { IntakeDraftSchema, requireCondition } from './model';
import { SourceSchema } from './inputs';
import type { Repository } from './store';

const id = z.string().min(1).max(100);
const content = z.strictObject({ text: z.string().trim().min(8).max(6000), source: SourceSchema });
export const IntakeDraftCommandSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('create'), input: content }),
  z.strictObject({ action: z.literal('update'), id, input: content }),
  z.strictObject({ action: z.literal('request_information'), id, note: z.string().trim().min(1).max(1000) }),
  z.strictObject({ action: z.literal('withdraw'), id }),
  z.strictObject({ action: z.literal('convert'), id, requestId: id }),
]);
export const IntakeDraftListSchema = z.object({ drafts: z.array(IntakeDraftSchema) });
export const IntakeDraftResponseSchema = z.object({ draft: IntakeDraftSchema });

export class IntakeDraftsService {
  constructor(private readonly repository: Repository) {}
  list(actorId: string) {
    const state = this.repository.read();
    const actor = state.users.find(user => user.id === actorId);
    requireCondition(actor, 'Sign in required.', 401);
    return { drafts: state.intakeDrafts.filter(draft => draft.communityId === actor.communityId && (draft.requesterId === actor.id || actor.role === 'coordinator')) };
  }
  execute(actorId: string, raw: unknown) {
    const command = IntakeDraftCommandSchema.parse(raw);
    return this.repository.transaction(state => {
      const actor = state.users.find(user => user.id === actorId);
      requireCondition(actor, 'Sign in required.', 401);
      const at = state.settings.now;
      if (command.action === 'create') {
        const draft = IntakeDraftSchema.parse({ id: crypto.randomUUID(), communityId: actor.communityId, requesterId: actor.id, ...command.input, status: 'awaiting_details', requestedInfo: '', requestId: null, createdAt: at, updatedAt: at, history: [{ actorId: actor.id, at, action: 'created' }] });
        state.intakeDrafts.push(draft);
        return { draft };
      }
      const draft = state.intakeDrafts.find(item => item.id === command.id && item.communityId === actor.communityId && (item.requesterId === actor.id || actor.role === 'coordinator'));
      requireCondition(draft, 'Draft not found.', 404);
      requireCondition(draft.status === 'awaiting_details', 'This draft is no longer active.', 409);
      if (command.action === 'request_information') {
        requireCondition(actor.role === 'coordinator', 'Only a coordinator can request information.', 403);
        draft.requestedInfo = command.note;
        draft.history.push({ actorId: actor.id, at, action: 'information_requested' });
      } else {
        requireCondition(draft.requesterId === actor.id, 'Only the author can change this draft.', 403);
        if (command.action === 'update') { draft.text = command.input.text; draft.source = command.input.source; draft.history.push({ actorId: actor.id, at, action: 'updated' }); }
        if (command.action === 'withdraw') { draft.status = 'withdrawn'; draft.history.push({ actorId: actor.id, at, action: 'withdrawn' }); }
        if (command.action === 'convert') {
          const request = state.requests.find(item => item.id === command.requestId && item.communityId === actor.communityId && item.requesterId === actor.id);
          requireCondition(request, 'Owned request not found.', 404);
          requireCondition(!state.intakeDrafts.some(item => item.id !== draft.id && item.requestId === request.id), 'Request is already linked to another draft.', 409);
          draft.status = 'converted'; draft.requestId = request.id; draft.history.push({ actorId: actor.id, at, action: 'converted' });
        }
      }
      draft.updatedAt = at;
      return { draft };
    });
  }
}
