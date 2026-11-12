'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { translate, type Locale } from '@/lib/translations';

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string) => string };
const LocaleContext = createContext<LocaleContextValue | null>(null);
const storageKey = 'community-help-language';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === 'en' || saved === 'es') setLocaleState(saved);
    } catch { /* Storage is optional. */ }
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try { window.localStorage.setItem(storageKey, next); } catch { /* Keep the in-memory preference. */ }
  }, []);
  const value = useMemo(() => ({ locale, setLocale, t: (key: string) => translate(locale, key) }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const id = useId();
  return <div className="field"><label htmlFor={id}>{t('Language')}</label><select id={id} value={locale} onChange={event => setLocale(event.target.value === 'es' ? 'es' : 'en')}><option value="en">English</option><option value="es">Español</option></select><small>{t('User-submitted and generated content may remain in its original language.')}</small></div>;
}
