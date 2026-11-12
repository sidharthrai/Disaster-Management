import { publicImpact } from '@/domain/impact';
import { errorResponse } from '@/server/http';
import { repository } from '@/server/services';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  try {
    return Response.json(publicImpact(repository().read()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
