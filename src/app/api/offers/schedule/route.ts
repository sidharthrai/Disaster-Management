import { OfferScheduleService } from '@/domain/offer-schedule';
import { boundedBody, errorResponse, privateHeaders, sameOrigin } from '@/server/http';
import { repository } from '@/server/services';
import { currentIdentity } from '@/server/session';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = await boundedBody(request);
    const ids = new OfferScheduleService(repository()).create(await currentIdentity(), input);
    return Response.json({ id: ids[0], ids }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
