import { z } from 'zod';

export const categories = ['Groceries', 'Transport', 'Supplies', 'Community', 'Shelter', 'Medical', 'Missing person'] as const;
export const areas = ['Riverside', 'Maple Grove', 'Oakridge', 'Central Park', 'River Street'] as const;
export const CategorySchema = z.enum(categories);
export const AreaSchema = z.enum(areas);
export const UrgencySchema = z.enum(['Routine', 'Time sensitive', 'Urgent', 'Critical review']);
export type Category = z.infer<typeof CategorySchema>;
export const UserSchema = z.object({
  id: z.string(), name: z.string(), role: z.enum(['member', 'coordinator', 'organization']),
  communityId: z.string(), area: AreaSchema, initials: z.string(), color: z.string(), verified: z.boolean(), synthetic: z.boolean().default(true), qualifiedCategories: z.array(CategorySchema).default([]),
});
export type User = z.infer<typeof UserSchema>;
export const NeedSchema = z.object({ id: z.string(), category: CategorySchema,
  status: z.enum(['open', 'connected', 'in_progress', 'awaiting_confirmation', 'resolved']) });
export const RequestSchema = z.object({
  id: z.string(), communityId: z.string(), requesterId: z.string(), title: z.string(), summary: z.string(), rawContent: z.string(),
  area: AreaSchema, windowStart: z.string(), windowEnd: z.string(), urgency: UrgencySchema,
  safetyFlags: z.array(z.string()), restricted: z.boolean(), source: z.string(), needs: z.array(NeedSchema),
  createdAt: z.string(), reviewedBy: z.string().nullable(), assignedCoordinatorId: z.string().nullable().default(null), updatedAt: z.string().default(''), incidentId: z.string().nullable().default(null),
  intakeProvenance: z.object({ extraction: z.unknown(), provider: z.string(), warning: z.string().nullable(), suggestedUrgency: UrgencySchema, selectedUrgency: UrgencySchema }).nullable().default(null),
  closure: z.object({ outcome: z.enum(['withdrawn', 'unable_to_complete', 'referred', 'unconfirmed']), reason: z.string(), actorId: z.string(), at: z.string() }).nullable(),
});
export type HelpRequest = z.infer<typeof RequestSchema>;
export const OfferSchema = z.object({
  id: z.string(), communityId: z.string(), userId: z.string(), description: z.string(), categories: z.array(CategorySchema),
  area: AreaSchema, startAt: z.string(), endAt: z.string(), active: z.boolean(), readyForEvent: z.string().nullable(),
});
export type HelpOffer = z.infer<typeof OfferSchema>;
export const ResourceSchema = z.object({
  id: z.string(), communityId: z.string(), ownerId: z.string(), name: z.string(), description: z.string().default(''), category: CategorySchema, area: AreaSchema,
  capacityMode: z.enum(['consumable', 'concurrent']), capacity: z.number().int().nonnegative(), reserved: z.number().int().nonnegative(), active: z.boolean(),
  verifiedAt: z.string(), readyForEvent: z.string().nullable(),
});
export type Resource = z.infer<typeof ResourceSchema>;
export const CommitmentSchema = z.object({
  id: z.string(), requestId: z.string(), needId: z.string(), helperId: z.string(), offerId: z.string().nullable(), resourceId: z.string().nullable(),
  requesterApproved: z.boolean(), helperApproved: z.boolean(),
  status: z.enum(['proposed', 'accepted', 'in_progress', 'delivered', 'confirmed', 'cancelled', 'rejected']),
  createdAt: z.string(), acceptedAt: z.string().nullable(), completedAt: z.string().nullable(),
});
export type Commitment = z.infer<typeof CommitmentSchema>;
export const EventSchema = z.object({ id: z.string(), requestId: z.string(), actorId: z.string(), text: z.string(), at: z.string() });
export const MessageSchema = z.object({ id: z.string(), requestId: z.string(), commitmentId: z.string().nullable(), actorId: z.string(), text: z.string(), at: z.string() });
export const ReportSchema = z.object({ id: z.string(), requestId: z.string(), actorId: z.string(), reason: z.string(), at: z.string(), resolved: z.boolean() });
export const FollowUpSettingsSchema = z.object({ unassignedHours: z.number().int().min(1).max(720), responseHours: z.number().int().min(1).max(720), confirmationHours: z.number().int().min(1).max(720), acceptedIdleHours: z.number().int().min(1).max(720), urgentReviewHours: z.number().int().min(1).max(720) });
export const defaultFollowUp = { unassignedHours: 4, responseHours: 2, confirmationHours: 2, acceptedIdleHours: 2, urgentReviewHours: 1 };
export const NoteSchema = z.object({ id: z.string(), requestId: z.string(), actorId: z.string(), text: z.string(), at: z.string() });
export const EpisodeSchema = z.object({ id: z.string(), requestId: z.string(), kind: z.string(), subjectId: z.string(), severity: z.enum(['attention', 'urgent']), description: z.string(), openedAt: z.string(), acknowledgedAt: z.string().nullable(), acknowledgedBy: z.string().nullable(), resolvedAt: z.string().nullable(), escalations: z.array(z.object({ actorId: z.string(), coordinatorId: z.string(), note: z.string(), at: z.string() })) });
export const NotificationSchema = z.object({ id: z.string(), recipientId: z.string(), requestId: z.string(), kind: z.string(), text: z.string(), dedupeKey: z.string(), createdAt: z.string(), readAt: z.string().nullable() });
export const SettingsSchema = z.object({
  clockMode: z.enum(['demo', 'live']).default('demo'), followUp: FollowUpSettingsSchema.default(defaultFollowUp), now: z.string(), emergency: z.object({ id: z.string(), type: z.enum(['Flood', 'Wildfire', 'Storm', 'Earthquake']), name: z.string(), startedAt: z.string() }).nullable(),
});
export const StateSchema = z.object({ users: z.array(UserSchema), requests: z.array(RequestSchema), offers: z.array(OfferSchema), resources: z.array(ResourceSchema),
  commitments: z.array(CommitmentSchema), events: z.array(EventSchema), messages: z.array(MessageSchema), reports: z.array(ReportSchema), coordinatorNotes: z.array(NoteSchema).default([]), followUpEpisodes: z.array(EpisodeSchema).default([]), notifications: z.array(NotificationSchema).default([]), settings: SettingsSchema });
export type State = z.infer<typeof StateSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type PublicRequest = Omit<HelpRequest, 'rawContent' | 'safetyFlags' | 'reviewedBy' | 'intakeProvenance'>;
export type RequestStatus = 'Open' | 'Connected' | 'In progress' | 'Awaiting confirmation' | 'Resolved' | 'Closed';
export function requestStatus(request: Pick<HelpRequest, 'needs' | 'closure'>): RequestStatus {
  if (request.closure) return 'Closed';
  if (request.needs.every(need => need.status === 'resolved')) return 'Resolved';
  if (request.needs.some(need => need.status === 'awaiting_confirmation')) return 'Awaiting confirmation';
  if (request.needs.some(need => need.status === 'in_progress' || need.status === 'resolved')) return 'In progress';
  if (request.needs.some(need => need.status === 'connected')) return 'Connected';
  return 'Open';
}
export function isActive(commitment: Commitment): boolean {
  return ['accepted', 'in_progress', 'delivered'].includes(commitment.status);
}
export class DomainError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export function requireCondition(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new DomainError(message, status);
}
