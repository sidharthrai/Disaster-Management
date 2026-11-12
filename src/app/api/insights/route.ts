import { InsightsService } from '@/domain/analytics';
import { network, repository } from '@/server/services';
import { currentIdentity } from '@/server/session';
import { errorResponse, privateHeaders } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const identity = await currentIdentity();
    network().snapshot(identity);
    return Response.json(new InsightsService().build(repository().read(), identity), { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
