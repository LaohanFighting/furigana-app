'use client';

import { useEffect } from 'react';
import { useSetLocale } from '@/app/LocaleProvider';
import { locales, type Locale } from '@/lib/i18n';

export default function SyncLocaleFromUrl() {
  const setLocale = useSetLocale();
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const lang = params.get('lang');
    if (lang && (locales as string[]).includes(lang)) setLocale(lang as Locale);
  }, [setLocale]);
  return null;
}
