'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Locale } from '@/lib/i18n';

const LocaleContext = createContext<Locale>('zh');
const SetLocaleContext = createContext<(l: Locale) => void>(() => {});

export function LocaleProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initial);
  return (
    <LocaleContext.Provider value={locale}>
      <SetLocaleContext.Provider value={setLocale}>
        {children}
      </SetLocaleContext.Provider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useSetLocale(): (l: Locale) => void {
  return useContext(SetLocaleContext);
}

export function useLocaleFromSearchParams(searchParams: { get?: (k: string) => string | null }) {
  const setLocale = useSetLocale();
  const raw = searchParams?.get?.('lang') || '';
  const locale = (raw === 'ja' || raw === 'en' ? raw : 'zh') as Locale;
  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);
  return locale;
}
