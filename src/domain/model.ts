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
  area: AreaSchema, startAt: z.string(), endAt: z.string(), active: z.boolean(), readyForEvent: z.string().nullable(), affiliation: z.string().max(120).optional(),
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
export const OrganizationProfileSchema = z.object({ id: z.string(), about: z.string().max(1000), services: z.array(CategorySchema).max(7), serviceAreas: z.array(AreaSchema).max(5), website: z.string().max(2048) });
export type OrganizationProfile = z.infer<typeof OrganizationProfileSchema>;
export const OrganizationApplicationSchema = z.object({ id: z.string(), communityId: z.string(), applicantId: z.string(), applicantName: z.string(), description: z.string().max(1000), services: z.array(CategorySchema), serviceAreas: z.array(AreaSchema), status: z.enum(['pending', 'approved', 'declined', 'withdrawn', 'revoked']), submittedAt: z.string(), history: z.array(z.object({ action: z.enum(['submitted', 'approved', 'declined', 'withdrawn', 'revoked']), actorId: z.string(), at: z.string(), reason: z.string().max(1000) })) });
export const GatheringSchema = z.object({ id: z.string(), communityId: z.string(), organizerId: z.string(), kind: z.enum(['Neighborhood clean-up', 'Food packing', 'Community support', 'Skill sharing']), area: AreaSchema, startAt: z.iso.datetime(), endAt: z.iso.datetime(), capacity: z.number().int().min(1).max(100), notes: z.string().max(1000), createdAt: z.iso.datetime(), cancelledAt: z.iso.datetime().nullable(), attendees: z.array(z.object({ userId: z.string(), joinedAt: z.iso.datetime() })) });
export type Gathering = z.infer<typeof GatheringSchema>;
export const VolunteerProfileSchema = z.object({ id: z.string(), communityId: z.string(), categories: z.array(CategorySchema).max(5), areas: z.array(AreaSchema).max(5), languages: z.array(z.enum(['English', 'Spanish', 'Hindi', 'French', 'Arabic', 'Mandarin'])).max(6), visible: z.boolean(), updatedAt: z.iso.datetime() });
export type VolunteerProfile = z.infer<typeof VolunteerProfileSchema>;
export const IntakeDraftSchema = z.object({ id: z.string(), communityId: z.string(), requesterId: z.string(), text: z.string().min(8).max(6000), source: z.enum(['Website', 'Phone transcript', 'Voice transcript', 'SMS simulation', 'Social simulation']), status: z.enum(['awaiting_details', 'withdrawn', 'converted']), requestedInfo: z.string().max(1000), requestId: z.string().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), history: z.array(z.object({ actorId: z.string(), at: z.iso.datetime(), action: z.enum(['created', 'updated', 'information_requested', 'withdrawn', 'converted']) })) });
export type IntakeDraft = z.infer<typeof IntakeDraftSchema>;
export const PeopleStatusSchema = z.enum(['submitted', 'under_review', 'closed']);
export const PeopleAgeGroupSchema = z.enum(['adult', 'under_18', 'unknown']);
export const PeopleRecordSchema = z.object({ id: z.string(), communityId: z.string(), authorId: z.string(), incidentId: z.string().nullable(), area: AreaSchema, createdAt: z.iso.datetime(), kind: z.enum(['missing', 'safe_check_in']), personName: z.string().nullable(), relationship: z.enum(['family', 'friend', 'neighbor', 'other']).nullable(), ageGroup: PeopleAgeGroupSchema.default('unknown'), lastSeenAt: z.iso.datetime().nullable().default(null), lastKnownContext: z.string().max(500).default(''), shared: z.boolean().default(false), shareAdultName: z.boolean().default(false), tips: z.array(z.object({ authorId: z.string(), text: z.string().max(500), at: z.iso.datetime() })).default([]), status: PeopleStatusSchema, history: z.array(z.object({ status: PeopleStatusSchema, actorId: z.string(), at: z.iso.datetime(), action: z.enum(['status_changed', 'information_requested', 'information_replied']).default('status_changed'), note: z.string().max(500).default('') })) });
export const CommunityNoticeSchema = z.object({ id: z.string(), area: AreaSchema, status: PeopleStatusSchema, personName: z.string().nullable() }).strict();
export const CommunityCheckInSchema = z.object({ id: z.string(), name: z.string(), area: AreaSchema, status: z.literal('self_reported_safe') }).strict();
export type PeopleRecord = z.infer<typeof PeopleRecordSchema>;
export const StateSchema = z.object({ peopleRecords: z.array(PeopleRecordSchema).default([]), gatherings: z.array(GatheringSchema).default([]), volunteerProfiles: z.array(VolunteerProfileSchema).default([]), intakeDrafts: z.array(IntakeDraftSchema).default([]), organizationApplications: z.array(OrganizationApplicationSchema).default([]), organizationProfiles: z.array(OrganizationProfileSchema).default([]), users: z.array(UserSchema), requests: z.array(RequestSchema), offers: z.array(OfferSchema), resources: z.array(ResourceSchema),
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
