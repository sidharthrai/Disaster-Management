import { GatheringsService } from '@/domain/gatherings';
import { repository } from '@/server/services';
import { currentIdentity } from '@/server/session';
import { boundedBody, errorResponse, privateHeaders, sameOrigin } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(new GatheringsService(repository()).list(await currentIdentity()), { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const identity = await currentIdentity();
    new GatheringsService(repository()).execute(identity, await boundedBody(request));
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
