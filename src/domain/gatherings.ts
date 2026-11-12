import { z } from 'zod';
import { GatheringSchema, requireCondition, type State } from './model';
import type { Repository } from './store';

export const GatheringInputSchema = z.strictObject({
  kind: GatheringSchema.shape.kind,
  area: GatheringSchema.shape.area,
  startAt: GatheringSchema.shape.startAt,
  endAt: GatheringSchema.shape.endAt,
  capacity: GatheringSchema.shape.capacity,
  notes: z.string().trim().max(1000),
});
export const GatheringCommandSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('create'), input: GatheringInputSchema }),
  z.strictObject({ action: z.enum(['join', 'leave', 'cancel']), id: z.string().min(1) }),
]);
export const GatheringsProjectionSchema = z.object({ gatherings: z.array(z.object({
  id: z.string(), kind: GatheringSchema.shape.kind, area: GatheringSchema.shape.area,
  startAt: GatheringSchema.shape.startAt, endAt: GatheringSchema.shape.endAt,
  capacity: GatheringSchema.shape.capacity, count: z.number().int().nonnegative(), joined: z.boolean(),
  cancelledAt: GatheringSchema.shape.cancelledAt, canManage: z.boolean(),
  privateDetails: z.object({ notes: z.string(), participants: z.array(z.string()) }).nullable(),
})) });
export const GatheringMutationResponseSchema = z.object({ ok: z.literal(true) });
export type GatheringsProjection = z.infer<typeof GatheringsProjectionSchema>;

function actorFor(state: State, actorId: string) {
  const actor = state.users.find(user => user.id === actorId);
  requireCondition(actor, 'Sign in required.', 401);
  return actor;
}
export class GatheringsService {
  constructor(private readonly repository: Repository) {}
  list(actorId: string): GatheringsProjection {
    const state = this.repository.read();
    const actor = actorFor(state, actorId);
    return { gatherings: state.gatherings.filter(item => item.communityId === actor.communityId).map(item => {
      const canManage = item.organizerId === actor.id || actor.role === 'coordinator';
      return { id: item.id, kind: item.kind, area: item.area, startAt: item.startAt, endAt: item.endAt,
        capacity: item.capacity, count: item.attendees.length, joined: item.attendees.some(attendee => attendee.userId === actor.id),
        cancelledAt: item.cancelledAt, canManage,
        privateDetails: canManage ? { notes: item.notes, participants: item.attendees.map(attendee => state.users.find(user => user.id === attendee.userId && user.communityId === actor.communityId)?.name ?? 'Former participant') } : null };
    }) };
  }
  execute(actorId: string, raw: unknown): void {
    const command = GatheringCommandSchema.parse(raw);
    this.repository.transaction(state => {
      const actor = actorFor(state, actorId);
      if (command.action === 'create') {
        const { input } = command;
        requireCondition(Date.parse(input.startAt) > Date.parse(state.settings.now) && Date.parse(input.endAt) > Date.parse(input.startAt), 'Choose a future start and an end after the start.');
        state.gatherings.unshift({ ...input, id: crypto.randomUUID(), communityId: actor.communityId, organizerId: actor.id, createdAt: state.settings.now, cancelledAt: null, attendees: [] });
        return;
      }
      const gathering = state.gatherings.find(item => item.id === command.id && item.communityId === actor.communityId);
      requireCondition(gathering, 'Activity not found.', 404);
      requireCondition(!gathering.cancelledAt, 'This activity has been cancelled.');
      if (command.action === 'cancel') {
        requireCondition(gathering.organizerId === actor.id || actor.role === 'coordinator', 'Only the organizer or a coordinator can cancel.', 403);
        gathering.cancelledAt = state.settings.now;
      } else if (command.action === 'join') {
        requireCondition(Date.parse(gathering.endAt) > Date.parse(state.settings.now), 'This activity has ended.');
        requireCondition(!gathering.attendees.some(item => item.userId === actor.id), 'You have already joined.');
        requireCondition(gathering.attendees.length < gathering.capacity, 'This activity is full.');
        gathering.attendees.push({ userId: actor.id, joinedAt: state.settings.now });
      } else {
        requireCondition(gathering.attendees.some(item => item.userId === actor.id), 'You have not joined this activity.');
        gathering.attendees = gathering.attendees.filter(item => item.userId !== actor.id);
      }
    });
  }
}
