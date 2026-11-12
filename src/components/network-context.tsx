'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Snapshot } from '@/domain/network';
import type { Command } from '@/domain/commands';
import { fetchSnapshot, sendCommand, switchIdentity } from '@/lib/api';
type Context = { state: Snapshot; busy: boolean; identityChanging: boolean; revision: number; notice: { text: string; error: boolean } | null; command: (command: Command, message?: string) => Promise<string | undefined>; changeIdentity: (id: string) => Promise<void>; refresh: () => Promise<void>; clearNotice: () => void };
const NetworkContext = createContext<Context | null>(null);
export function NetworkProvider({ initial, children }: { initial: Snapshot; children: ReactNode }) {
  const [state, setState] = useState(initial); const [busy, setBusy] = useState(false); const [identityChanging, setIdentityChanging] = useState(false); const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<Context['notice']>(null); const router = useRouter();
  const refresh = useCallback(async () => { setState(await fetchSnapshot()); setRevision(n => n + 1); }, []);
  async function command(input: Command, message = 'Changes saved.') {
    setBusy(true); setNotice(null);
    try { const result = await sendCommand(input); await refresh(); setNotice({ text: message, error: false }); return result.id; }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : 'Please try again.', error: true }); throw error; }
    finally { setBusy(false); }
  }
  async function changeIdentity(id: string) {
    setIdentityChanging(true); setBusy(true); setNotice(null);
    let switched = false; let reloadRequired = false;
    try { await switchIdentity(id); switched = true; await refresh(); router.refresh(); }
    catch (error) {
      if (switched) { reloadRequired = true; window.location.reload(); return; }
      setNotice({ text: error instanceof Error ? error.message : 'Identity could not be changed.', error: true });
    }
    finally { setBusy(false); if (!reloadRequired) setIdentityChanging(false); }
  }
  return <NetworkContext.Provider value={{ state, busy, identityChanging, revision, notice, command, changeIdentity, refresh, clearNotice: () => setNotice(null) }}>{children}</NetworkContext.Provider>;
}
export function useNetwork() { const context = useContext(NetworkContext); if (!context) throw new Error('Network provider is required.'); return context; }
