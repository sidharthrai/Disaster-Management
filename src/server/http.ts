import { z } from 'zod';
import { DomainError, requireCondition } from '../domain/model';
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const requestUrl = new URL(request.url);
  const incomingHost = request.headers.get('host');
  const expectedOrigin = incomingHost ? new URL(`${requestUrl.protocol}//${incomingHost}`).origin : requestUrl.origin;
  requireCondition(origin === expectedOrigin, 'Cross-origin or missing-origin mutations are not allowed.', 403);
  requireCondition(request.headers.get('content-type')?.includes('application/json'), 'Send a JSON request.', 415);
}
export async function boundedBody(request: Request): Promise<unknown> {
  requireCondition(Number(request.headers.get('content-length') || 0) <= 65536, 'Request is too large.', 413);
  const reader = request.body?.getReader(); requireCondition(reader, 'A request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; requireCondition(size <= 65536, 'Request is too large.', 413); chunks.push(value);
    }
  } finally { await reader.cancel(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new DomainError('Invalid JSON.'); }
}
export function errorResponse(error: unknown) {
  if (error instanceof DomainError) return Response.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  if (error instanceof z.ZodError) return Response.json({ error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') }, { status: 400, headers: privateHeaders });
  return Response.json({ error: 'The operation could not be completed. Please retry.' }, { status: 500, headers: privateHeaders });
}
export const privateHeaders = { 'Cache-Control': 'no-store, private', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' };
