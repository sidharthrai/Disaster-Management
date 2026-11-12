import { z } from 'zod';
import { RequestSchema, UserSchema, OfferSchema, ResourceSchema, CommitmentSchema, EventSchema, MessageSchema, ReportSchema, SettingsSchema, CategorySchema, AreaSchema } from './model';
import { ExtractionSchema } from './intake';
const PublicRequestSchema = RequestSchema.omit({ rawContent: true, safetyFlags: true, reviewedBy: true, intakeProvenance: true });
const StatusSchema = z.enum(['Open', 'Connected', 'In progress', 'Awaiting confirmation', 'Resolved', 'Closed']);
const FlagSchema = z.object({ kind: z.string(), severity: z.enum(['attention', 'urgent']), description: z.string() });
export const SnapshotSchema = z.object({ actor: UserSchema, users: z.array(UserSchema), requests: z.array(PublicRequestSchema.extend({ status: StatusSchema, flags: z.array(FlagSchema) })),
  offers: z.array(OfferSchema), resources: z.array(ResourceSchema), commitments: z.array(CommitmentSchema), settings: SettingsSchema, reports: z.array(ReportSchema),
  metrics: z.object({ members: z.number(), open: z.number(), confirmed: z.number(), needsAttention: z.number(), offers: z.number() }) });
export const DetailSchema = z.object({ request: PublicRequestSchema, status: StatusSchema, rawContent: z.string().nullable(), safetyFlags: z.array(z.string()), reviewedBy: z.string().nullable(), closureReason: z.string().nullable(), canCoordinate: z.boolean(),
  commitments: z.array(CommitmentSchema), messages: z.array(MessageSchema), events: z.array(EventSchema), flags: z.array(FlagSchema),
  matches: z.array(z.object({ id: z.string(), needId: z.string(), category: z.string(), helperId: z.string(), helperName: z.string(), kind: z.enum(['offer', 'resource']), score: z.number(), reasons: z.array(z.string()) })),
  potentialDuplicates: z.array(z.object({ id: z.string(), title: z.string(), reason: z.string() })) });
export const IntakeResultSchema = z.object({ extraction: ExtractionSchema, provider: z.string(), warning: z.string().nullable() });
export const IntakePreviewSchema = IntakeResultSchema.extend({ previewToken: z.string() });
export type IntakePreview = z.infer<typeof IntakePreviewSchema>;

export const PublicOverviewSchema = z.object({ metrics: z.object({ members: z.number(), offers: z.number(), confirmed: z.number(), open: z.number() }), examples: z.array(z.object({ category: CategorySchema, area: AreaSchema, windowEnd: z.string() })) });
