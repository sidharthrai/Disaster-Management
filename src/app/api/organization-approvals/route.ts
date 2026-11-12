import { OrganizationApprovalsService } from '@/domain/organization-approvals';
import { repository } from '@/server/services';
import { currentIdentity } from '@/server/session';
import { boundedBody, errorResponse, privateHeaders, sameOrigin } from '@/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(new OrganizationApprovalsService(repository()).list(await currentIdentity()), { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try { sameOrigin(request); const actor = await currentIdentity(); new OrganizationApprovalsService(repository()).execute(actor, await boundedBody(request)); return Response.json({ ok: true }, { headers: privateHeaders }); }
  catch (error) { return errorResponse(error); }
}
