'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useNetwork } from './network-context';
import { useLocale } from './locale-context';
export function AccountControls() {
  const { state, busy, changeIdentity } = useNetwork();
  const { t } = useLocale();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  if (state.settings.clockMode === 'demo') return <label className="identity">{t('Synthetic demo identity')} <select value={state.actor.id} disabled={busy} onChange={event => void changeIdentity(event.target.value)} aria-label={t('Synthetic demo identity')}>{state.users.map(user => <option key={user.id} value={user.id}>{user.name} · {t(user.role)}</option>)}</select></label>;
  async function signOut() {
    setSigningOut(true); setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) { setError('Could not sign out. Please try again.'); return; }
      router.push('/login'); router.refresh();
    } catch { setError('Could not sign out. Please try again.'); }
    finally { setSigningOut(false); }
  }
  return <div className="identity"><span>{state.actor.name} · {t(state.actor.role)}</span> <button type="button" disabled={signingOut} onClick={() => void signOut()}>{t('Sign out')}</button>{error && <span role="alert">{t(error)}</span>}</div>;
}
