'use client';
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Snapshot } from '@/domain/network';
import type { Command } from '@/domain/commands';
import { ApiError, fetchSnapshot, sendCommand, switchIdentity } from '@/lib/api';
import { runCommandWithRefresh } from '@/lib/command-result';
type Context = { state: Snapshot; busy: boolean; identityChanging: boolean; revision: number; notice: { text: string; error: boolean } | null; command: (command: Command, message?: string) => Promise<string | undefined>; changeIdentity: (id: string) => Promise<void>; refresh: () => Promise<void>; clearNotice: () => void };
const NetworkContext = createContext<Context | null>(null);
export function NetworkProvider({ initial, children }: { initial: Snapshot; children: ReactNode }) {
  const [state, setState] = useState(initial); const [busy, setBusy] = useState(false); const [identityChanging, setIdentityChanging] = useState(false); const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<Context['notice']>(null); const router = useRouter(); const pathname = usePathname();
  const generation = useRef(0); const pending = useRef<AbortController | null>(null); const foreground = useRef(false);
  const refresh = useCallback(async () => {
    if (foreground.current) return;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller; const current = generation.current;
    try {
      const snapshot = await fetchSnapshot(controller.signal);
      if (!controller.signal.aborted && current === generation.current) { setState(snapshot); setRevision(n => n + 1); }
    } catch (error) {
      if (!controller.signal.aborted && current === generation.current) throw error;
    } finally { if (pending.current === controller) pending.current = null; }
  }, []);
  const refreshForeground = useCallback(async (current: number) => {
    const snapshot = await fetchSnapshot();
    if (current === generation.current) { setState(snapshot); setRevision(n => n + 1); }
  }, []);
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') void refresh().catch(error => { if (error instanceof ApiError && error.status === 401) { setIdentityChanging(true); router.replace('/login'); router.refresh(); } }); };
    update();
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    const timer = window.setInterval(update, 20000);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); pending.current?.abort(); };
  }, [pathname, refresh, router]);
  async function command(input: Command, message = 'Changes saved.') {
    if (foreground.current) throw new Error('Another change is in progress. Please try again.');
    foreground.current = true; pending.current?.abort(); const current = ++generation.current;
    setBusy(true); setNotice(null);
    try {
      const { result, refreshed } = await runCommandWithRefresh(() => sendCommand(input), () => refreshForeground(current));
      if (current === generation.current) setNotice(refreshed ? { text: message, error: false } : { text: 'Saved, but the latest information could not be refreshed. Please refresh the page.', error: true });
      return result.id;
    }
    catch (error) { if (current === generation.current) setNotice({ text: error instanceof Error ? error.message : 'Please try again.', error: true }); throw error; }
    finally { foreground.current = false; setBusy(false); }
  }
  async function changeIdentity(id: string) {
    if (foreground.current) return;
    foreground.current = true; pending.current?.abort(); const current = ++generation.current;
    setIdentityChanging(true); setBusy(true); setNotice(null);
    let switched = false; let reloadRequired = false;
    try { await switchIdentity(id); switched = true; await refreshForeground(current); router.refresh(); }
    catch (error) {
      if (switched) { reloadRequired = true; window.location.reload(); return; }
      setNotice({ text: error instanceof Error ? error.message : 'Identity could not be changed.', error: true });
    }
    finally { foreground.current = false; setBusy(false); if (!reloadRequired) setIdentityChanging(false); }
  }
  return <NetworkContext.Provider value={{ state, busy, identityChanging, revision, notice, command, changeIdentity, refresh, clearNotice: () => setNotice(null) }}>{children}</NetworkContext.Provider>;
}
export function useNetwork() { const context = useContext(NetworkContext); if (!context) throw new Error('Network provider is required.'); return context; }
