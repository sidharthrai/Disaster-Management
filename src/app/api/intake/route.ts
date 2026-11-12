import { z } from 'zod';
import { SourceSchema } from '@/domain/inputs';
import { currentIdentity } from '@/server/session';
import { createPreviewToken } from '@/server/intake-preview';
import { intakeService } from '@/server/providers';
import { boundedBody, sameOrigin, errorResponse, privateHeaders } from '@/server/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try { sameOrigin(request); const { text, source } = z.object({ text: z.string().trim().min(8).max(6000), source: SourceSchema.default('Website') }).parse(await boundedBody(request)); const actor = await currentIdentity(); const result = await intakeService().process(text); return Response.json({ ...result, previewToken: createPreviewToken(actor, text, source, result) }, { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
