import { redirect } from 'next/navigation';
import { network } from '@/server/services';
import { currentIdentity } from '@/server/session';
import { DomainError } from '@/domain/model';
import { NetworkProvider } from '@/components/network-context';
import { Workspace } from '@/components/workspace';
export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  let identity: string;
  try { identity = await currentIdentity(); }
  catch (error) { if (error instanceof DomainError && error.status === 401) redirect('/login'); throw error; }
  const initial = network().snapshot(identity);
  const provider = process.env.AI_PROVIDER === 'hosted' ? 'Hosted model' : process.env.AI_PROVIDER === 'ollama' ? 'Ollama local model' : 'Deterministic fallback';
  return <NetworkProvider initial={initial}><Workspace provider={provider}>{children}</Workspace></NetworkProvider>;
}
