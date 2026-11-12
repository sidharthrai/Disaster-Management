import { network } from '@/server/services';
import { currentIdentity } from '@/server/session';
import { errorResponse, privateHeaders } from '@/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(network().snapshot(await currentIdentity()), { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
