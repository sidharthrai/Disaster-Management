import { network } from '@/server/services';
import { currentIdentity } from '@/server/session';
import { errorResponse, privateHeaders } from '@/server/http';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return Response.json(network().detail(await currentIdentity(), (await context.params).id), { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
