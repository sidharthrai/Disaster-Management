import { requireCondition } from '@/domain/model';
import { followUpRunnerStatus } from '@/server/followup-runner';
import { errorResponse, privateHeaders } from '@/server/http';
import { network } from '@/server/services';
import { currentIdentity } from '@/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const { actor } = network().snapshot(await currentIdentity());
    requireCondition(actor.role === 'coordinator', 'Coordinator permission is required.', 403);
    return Response.json(followUpRunnerStatus(), { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
