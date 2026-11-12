import { IntakeDraftsService } from '@/domain/intake-drafts';
import { repository } from '@/server/services';
import { currentIdentity } from '@/server/session';
import { boundedBody, errorResponse, privateHeaders, sameOrigin } from '@/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(new IntakeDraftsService(repository()).list(await currentIdentity()), { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try { sameOrigin(request); const actor = await currentIdentity(); return Response.json(new IntakeDraftsService(repository()).execute(actor, await boundedBody(request)), { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
