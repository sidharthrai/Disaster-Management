import { z } from 'zod';
import { AreaSchema, CategorySchema, UrgencySchema } from './model';

export const SourceSchema = z.enum(['Website', 'Phone transcript', 'Voice transcript', 'SMS simulation', 'Social simulation']);
export const CreateRequestSchema = z.object({ text: z.string().trim().min(8).max(6000), categories: z.array(CategorySchema).min(1).max(7), area: AreaSchema, windowStart: z.iso.datetime(), windowEnd: z.iso.datetime(), source: SourceSchema, private: z.boolean().optional(), previewToken: z.string().max(60000).optional(), urgency: UrgencySchema.optional(), timingConfirmed: z.boolean().optional() });
export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;
export const CreateOfferSchema = z.object({ description: z.string().trim().min(8).max(1000), categories: z.array(CategorySchema).min(1).max(5), area: AreaSchema, startAt: z.iso.datetime(), endAt: z.iso.datetime() });
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
