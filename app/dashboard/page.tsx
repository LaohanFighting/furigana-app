'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LocaleProvider, useLocale } from '@/app/LocaleProvider';
import SyncLocaleFromUrl from '@/components/SyncLocaleFromUrl';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import FuriganaEditor from '@/components/FuriganaEditor';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

function getLocaleFromSearch(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const p = new URLSearchParams(window.location.search);
  const lang = p.get('lang');
  return lang === 'ja' || lang === 'en' ? lang : 'zh';
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [user, setUser] = useState<{
    loggedIn: boolean;
    email?: string;
    isPremium?: boolean;
    remaining?: number;
  } | null>(null);
  const [remaining, setRemaining] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then(setUser);
  }, []);

  useEffect(() => {
    if (user?.remaining !== undefined) setRemaining(user.remaining);
  }, [user]);

  if (user === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-stone-500">
        Loading…
      </div>
    );
  }

  if (!user.loggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-stone-600 mb-4">请先登录后使用标注功能。</p>
        <Link href="/login" className="text-amber-600 hover:underline">
          {t(locale, 'login')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-stone-600">{user.email}</span>
          {user.isPremium && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              Premium
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!user.isPremium && (
            <Link
              href="/dashboard/upgrade"
              className="text-sm text-amber-600 hover:underline"
            >
              {t(locale, 'upgrade')}
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
              window.location.href = '/';
            }}
            className="text-sm text-stone-500 hover:underline"
          >
            {t(locale, 'logout')}
          </button>
        </div>
      </div>
      <FuriganaEditor
        remaining={remaining}
        isPremium={user.isPremium}
        onRemainingChange={setRemaining}
      />
    </div>
  );
}

export default function DashboardPage() {
  const initial = getLocaleFromSearch();
  return (
    <LocaleProvider initial={initial}>
      <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 text-center text-stone-500">Loading…</div>}>
        <SyncLocaleFromUrl />
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="font-semibold text-stone-800">
              {t(initial, 'site.name')}
            </Link>
            <LocaleSwitcher current={initial} />
          </div>
        </header>
        <main>
          <DashboardContent />
        </main>
      </Suspense>
    </LocaleProvider>
  );
}
