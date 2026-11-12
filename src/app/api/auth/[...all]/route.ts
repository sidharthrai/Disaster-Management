import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/server/auth';
import { appMode } from '@/server/runtime-mode';
export const runtime = 'nodejs';
async function handle(request: Request) {
  if (appMode() !== 'accounts') return Response.json({ error: 'Accounts are unavailable in demo mode.' }, { status: 404 });
  return toNextJsHandler(await auth())[request.method === 'GET' ? 'GET' : 'POST'](request);
}
export const GET = handle;
export const POST = handle;
