'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { LanguageSwitcher, useLocale } from './locale-context';

export function AccountForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = mode === 'register' ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password });
      if (result.error) {
        const messages: Record<string, string> = { INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password.', USER_ALREADY_EXISTS: 'An account already exists for this email.', USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account already exists for this email.', PASSWORD_TOO_SHORT: 'Password is too short.', PASSWORD_TOO_LONG: 'Password is too long.' };
        setError(messages[result.error.code ?? ''] ?? (mode === 'register' ? 'Could not create your account. Please try again.' : 'Could not sign in. Please try again.')); return;
      }
      router.push('/dashboard'); router.refresh();
    } catch { setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="wrap" style={{ maxWidth: 520, paddingTop: '4rem' }}><Link href="/">← {t('Community Help Network')}</Link><LanguageSwitcher /><h1>{t(mode === 'login' ? 'Sign in' : 'Create an account')}</h1><p>{t('Connect with your community using your account.')}</p><form onSubmit={submit} className="surface" style={{ display: 'grid', gap: '1rem', padding: '1.5rem' }}>{mode === 'register' && <label>{t('Name')} <input required autoComplete="name" maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>}<label>{t('Email')} <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label><label>{t('Password')} <input required type="password" minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p role="alert" className="inline-error">{t(error)}</p>}<button className="button-primary" disabled={busy}>{t(busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account')}</button></form><p>{mode === 'login' ? <>{t('New here?')} <Link href="/register">{t('Create an account')}</Link></> : <>{t('Already have an account?')} <Link href="/login">{t('Sign in')}</Link></>}</p>{mode === 'login' && <p><Link href="/forgot-password">{t('Forgot your password?')}</Link></p>}<p>{t('Email verification is not yet available.')}</p></main>;
}
