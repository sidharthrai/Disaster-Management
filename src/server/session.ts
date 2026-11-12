import { cookies, headers } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { repository } from './services';
import { DomainError, requireCondition } from '../domain/model';
import { appMode } from './runtime-mode';
import { auth } from './auth';
import { mapAccount } from './account-member';

const signature = (id: string) => createHmac('sha256', process.env.DEMO_SESSION_SECRET || 'local-synthetic-demo-not-production-authentication').update(id).digest('hex');
export function signedIdentity(id: string) { return `${id}.${signature(id)}`; }
export async function currentIdentity(): Promise<string> {
  if (appMode() === 'accounts') {
    const session = await (await auth()).api.getSession({ headers: await headers() });
    if (!session) throw new DomainError('Sign in required.', 401);
    return mapAccount(session.user);
  }
  const value = (await cookies()).get('demo_identity')?.value;
  if (!value) return 'u-mira';
  const [id, supplied] = value.split('.');
  if (!id || !supplied || supplied.length !== 64 || !/^[a-f0-9]+$/.test(supplied)) return 'u-mira';
  const valid = timingSafeEqual(Buffer.from(supplied), Buffer.from(signature(id)));
  return valid && repository().read().users.some(u => u.id === id) ? id : 'u-mira';
}
export async function setIdentity(id: string) {
  requireCondition(appMode() === 'demo', 'Demo identity switching is unavailable in account mode.', 403);
  requireCondition(repository().read().users.some(u => u.id === id && u.communityId === 'riverton'), 'Unknown Riverton demo identity.');
  (await cookies()).set('demo_identity', signedIdentity(id), { httpOnly: true, sameSite: 'strict', path: '/' });
}
