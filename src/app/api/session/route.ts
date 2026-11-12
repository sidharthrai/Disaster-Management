import { z } from 'zod';
import { setIdentity } from '@/server/session';
import { boundedBody, sameOrigin, errorResponse, privateHeaders } from '@/server/http';
export async function POST(request: Request) {
  try { sameOrigin(request); const { id } = z.object({ id: z.string() }).parse(await boundedBody(request)); await setIdentity(id); return Response.json({ ok: true }, { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
