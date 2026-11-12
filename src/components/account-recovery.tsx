'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { LanguageSwitcher, useLocale } from './locale-context';

export function AccountRecovery({ resetting = false }: { resetting?: boolean }) {
  const { t } = useLocale();
  const [token, setToken] = useState('');
  const [linkChecked, setLinkChecked] = useState(!resetting);
  const linkRead = useRef(false);
  useEffect(() => {
    if (!resetting || linkRead.current) return;
    linkRead.current = true;
    setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
    window.history.replaceState(null, '', window.location.pathname);
    setLinkChecked(true);
  }, [resetting]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (resetting && password !== confirmation) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      if (resetting) {
        if (!token) { setError('This link is invalid or expired. Request a new link.'); return; }
        const result = await authClient.resetPassword({ token, newPassword: password });
        if (result.error) { setError(result.error.code === 'INVALID_TOKEN' ? 'This link is invalid or expired. Request a new link.' : 'Could not reset your password. Check its length and try again.'); return; }
      } else {
        const result = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
        if (result.error) { setError('Password recovery is unavailable. Please contact your local operator.'); return; }
      }
      setDone(true);
    } catch { setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="wrap" style={{ maxWidth: 520, paddingTop: '4rem' }}><Link href="/login">← {t('Sign in')}</Link><LanguageSwitcher /><h1>{t(resetting ? 'Reset password' : 'Forgot password')}</h1>{!linkChecked ? <p>{t('Checking link…')}</p> : done ? <p role="status">{resetting ? <>{t('Your password has been updated.')} <Link href="/login">{t('Sign in')}</Link> {t('with your new password.')}</> : t('If an account exists for that email, a reset link will be made available. On a local installation, ask the local operator for the link.')}</p> : resetting && !token ? <p role="alert">{t('This link is invalid or expired.')} <Link href="/forgot-password">{t('Request a new link')}</Link>.</p> : <form onSubmit={submit} className="surface" style={{ display: 'grid', gap: '1rem', padding: '1.5rem' }}>{resetting ? <><label>{t('New password')} <input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label><label>{t('Confirm new password')} <input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label></> : <label>{t('Email')} <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>}{error && <p role="alert" className="inline-error">{t(error)}</p>}<button className="button-primary" disabled={busy}>{t(busy ? 'Please wait…' : resetting ? 'Reset password' : 'Request reset link')}</button></form>}</main>;
}
