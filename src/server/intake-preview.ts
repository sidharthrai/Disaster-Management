import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { SourceSchema, type CreateRequestInput } from '../domain/inputs';
import { requireCondition } from '../domain/model';
import { IntakeResultSchema } from '../domain/views';
import type { IntakeResult } from '../domain/intake';

const processSecrets = globalThis as typeof globalThis & { intakePreviewSecret?: Buffer };
const secret = process.env.INTAKE_PREVIEW_SECRET || process.env.BETTER_AUTH_SECRET || (processSecrets.intakePreviewSecret ??= randomBytes(32));
const lifetime = 30 * 60 * 1000;
const ReceiptSchema = z.object({ actor: z.string(), textHash: z.string(), source: SourceSchema, issuedAt: z.number(), expiresAt: z.number(), result: IntakeResultSchema });
const digest = (text: string) => createHash('sha256').update(text.trim()).digest('hex');
const signature = (payload: string) => createHmac('sha256', secret).update(payload).digest();
declare const verified: unique symbol;
export type VerifiedPreview = { readonly result: IntakeResult; readonly [verified]: true };

export function createPreviewToken(actor: string, text: string, source: z.infer<typeof SourceSchema>, result: IntakeResult, now = Date.now()): string {
  const receipt = ReceiptSchema.parse({ actor, textHash: digest(text), source, issuedAt: now, expiresAt: now + lifetime, result });
  const payload = Buffer.from(JSON.stringify(receipt)).toString('base64url');
  return `${payload}.${signature(payload).toString('base64url')}`;
}

export function verifyCreatePreview(actor: string, input: CreateRequestInput, now = Date.now()): VerifiedPreview {
  const invalid = 'Analyze the request again and confirm the reviewed timing and urgency.';
  requireCondition(input.previewToken && input.urgency && input.timingConfirmed === true, invalid);
  const parts = input.previewToken.split('.');
  requireCondition(parts.length === 2 && parts[0] && parts[1] && /^[A-Za-z0-9_-]+$/.test(parts[1]), invalid);
  const expected = signature(parts[0]);
  const supplied = Buffer.from(parts[1], 'base64url');
  requireCondition(supplied.length === expected.length && timingSafeEqual(supplied, expected) && supplied.toString('base64url') === parts[1], invalid);
  let raw: unknown;
  try { raw = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { requireCondition(false, invalid); }
  const parsed = ReceiptSchema.safeParse(raw);
  requireCondition(parsed.success, invalid);
  const receipt = parsed.data;
  requireCondition(receipt.actor === actor && receipt.textHash === digest(input.text) && receipt.source === input.source && receipt.issuedAt <= now && receipt.expiresAt > now && receipt.expiresAt === receipt.issuedAt + lifetime, invalid);
  return { result: receipt.result } as VerifiedPreview;
}
