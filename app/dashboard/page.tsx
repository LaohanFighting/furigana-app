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
    phone?: string;
    identity?: string;
    isPremium?: boolean;
    remaining?: number;
    accessStatus?: string | null;
    accessRejectReason?: string | null;
    isAdmin?: boolean;
  } | null>(null);
  const [remaining, setRemaining] = useState<number | undefined>(undefined);
  const [requestingAccess, setRequestingAccess] = useState(false);

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

  const hasAccess = user.accessStatus === 'approved' || user.isAdmin === true;

  // 未获得使用权限：显示申请 / 等待审批 / 已拒绝
  if (!hasAccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <span className="text-stone-600">{user.identity ?? user.email ?? user.phone ?? ''}</span>
          <div className="flex items-center gap-3">
            {user.isAdmin && (
              <Link href="/dashboard/admin" className="text-sm text-amber-600 hover:underline">
                {t(locale, 'access.admin')}
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
        {user.accessStatus === null || user.accessStatus === undefined ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center">
            <p className="text-stone-700 mb-4">{t(locale, 'access.need_approval')}</p>
            <button
              type="button"
              disabled={requestingAccess}
              onClick={async () => {
                setRequestingAccess(true);
                try {
                  const res = await fetch('/api/access/request', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  const data = await res.json();
                  if (data.success) {
                    setUser((u) => (u ? { ...u, accessStatus: 'pending' } : u));
                  }
                } finally {
                  setRequestingAccess(false);
                }
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {requestingAccess ? '…' : t(locale, 'access.request')}
            </button>
          </div>
        ) : user.accessStatus === 'pending' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-amber-800 font-medium">{t(locale, 'access.pending')}</p>
            <p className="text-stone-600 text-sm mt-2">{t(locale, 'access.pending_hint')}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-800 font-medium">{t(locale, 'access.rejected')}</p>
            {user.accessRejectReason && (
              <p className="text-stone-600 text-sm mt-2">{user.accessRejectReason}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-stone-600">{user.identity ?? user.email ?? user.phone ?? ''}</span>
          {user.isPremium && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              Premium
            </span>
          )}
          {user.isAdmin && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Admin
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user.isAdmin && (
            <Link href="/dashboard/admin" className="text-sm text-amber-600 hover:underline">
              {t(locale, 'access.admin')}
            </Link>
          )}
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
