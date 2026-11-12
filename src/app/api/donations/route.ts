import { donationBoard } from '@/domain/donations';
import { network, repository } from '@/server/services';
import { currentIdentity } from '@/server/session';
import { errorResponse, privateHeaders } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const identity = await currentIdentity();
    network().snapshot(identity);
    return Response.json(donationBoard(repository().read(), identity), { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
