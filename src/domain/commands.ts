import { z } from 'zod';
import { CreateOfferSchema, CreateRequestSchema } from './inputs';
const id = z.string().min(1).max(100);
export const CommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('createRequest'), input: CreateRequestSchema }),
  z.object({ type: z.literal('createOffer'), input: CreateOfferSchema }),
  z.object({ type: z.literal('propose'), requestId: id, needId: id, offerId: id.nullable(), resourceId: id.nullable() }),
  z.object({ type: z.literal('respond'), id, accept: z.boolean() }),
  z.object({ type: z.literal('progress'), id, action: z.enum(['start', 'deliver', 'confirm', 'cancel']) }),
  z.object({ type: z.literal('message'), requestId: id, commitmentId: id, text: z.string().trim().min(1).max(2000) }),
  z.object({ type: z.literal('review'), requestId: id }),
  z.object({ type: z.literal('close'), requestId: id, outcome: z.enum(['withdrawn', 'unable_to_complete', 'referred', 'unconfirmed']), reason: z.string().trim().min(8).max(500) }),
  z.object({ type: z.literal('emergency'), event: z.enum(['Flood', 'Wildfire', 'Storm', 'Earthquake']).nullable() }),
  z.object({ type: z.literal('offer'), id, active: z.boolean(), ready: z.boolean() }),
  z.object({ type: z.literal('resource'), id, capacity: z.number().int().nonnegative().max(10000), active: z.boolean(), ready: z.boolean() }),
  z.object({ type: z.literal('clock'), hours: z.number().int().min(0).max(24) }),
  z.object({ type: z.literal('report'), requestId: id, reason: z.string().trim().min(8).max(500) }),
  z.object({ type: z.literal('moderate'), id, hide: z.boolean() }),
  z.object({ type: z.literal('reset') }),
]);
export type Command = z.infer<typeof CommandSchema>;
