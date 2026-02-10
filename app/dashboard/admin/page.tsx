'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LocaleProvider, useLocale } from '@/app/LocaleProvider';
import SyncLocaleFromUrl from '@/components/SyncLocaleFromUrl';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

function getLocaleFromSearch(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const p = new URLSearchParams(window.location.search);
  const lang = p.get('lang');
  return lang === 'ja' || lang === 'en' ? lang : 'zh';
}

type PendingUser = {
  id: string;
  identity: string;
  email?: string;
  phone?: string;
  accessRequestedAt: string | null;
  createdAt: string;
};

function AdminContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [user, setUser] = useState<{
    loggedIn: boolean;
    isAdmin?: boolean;
  } | null>(null);
  const [list, setList] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const fetchList = () => {
    fetch('/api/admin/access-requests', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.list) setList(data.list);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((u) => {
        setUser(u);
        if (u?.isAdmin) fetchList();
        else setLoading(false);
      });
  }, []);

  if (user === null || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-stone-500">
        Loading…
      </div>
    );
  }

  if (!user.loggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-stone-600 mb-4">请先登录。</p>
        <Link href="/login" className="text-amber-600 hover:underline">
          {t(locale, 'login')}
        </Link>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-stone-600 mb-4">无权限访问此页面。</p>
        <Link href="/dashboard" className="text-amber-600 hover:underline">
          返回标注工具
        </Link>
      </div>
    );
  }

  async function approve(userId: string) {
    setActing(userId);
    try {
      const res = await fetch('/api/admin/access-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) setList((prev) => prev.filter((u) => u.id !== userId));
    } finally {
      setActing(null);
    }
  }

  async function reject(userId: string) {
    const reason = rejectReason[userId] ?? '';
    setActing(userId);
    try {
      const res = await fetch('/api/admin/access-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, reason: reason || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setList((prev) => prev.filter((u) => u.id !== userId));
        setRejectReason((prev) => ({ ...prev, [userId]: '' }));
      }
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">{t(locale, 'access.admin')}</h1>
        <Link
          href="/dashboard"
          className="text-sm text-amber-600 hover:underline"
        >
          返回标注工具
        </Link>
      </div>
      <p className="text-stone-600 text-sm mb-4">{t(locale, 'access.pending_requests')}</p>
      {list.length === 0 ? (
        <p className="text-stone-500 py-6">{t(locale, 'access.no_pending')}</p>
      ) : (
        <ul className="space-y-4">
          {list.map((u) => (
            <li
              key={u.id}
              className="rounded-lg border border-stone-200 bg-white p-4 flex flex-col gap-2"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-medium text-stone-800">{u.identity || u.id}</span>
                  <span className="text-stone-500 text-sm ml-2">
                    {u.accessRequestedAt
                      ? new Date(u.accessRequestedAt).toLocaleString()
                      : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={acting === u.id}
                    onClick={() => approve(u.id)}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {t(locale, 'access.approve')}
                  </button>
                  <button
                    type="button"
                    disabled={acting === u.id}
                    onClick={() => reject(u.id)}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {t(locale, 'access.reject')}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={t(locale, 'access.reject_reason')}
                  value={rejectReason[u.id] ?? ''}
                  onChange={(e) =>
                    setRejectReason((prev) => ({ ...prev, [u.id]: e.target.value }))
                  }
                  className="flex-1 rounded border border-stone-300 px-2 py-1 text-sm"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const initial = getLocaleFromSearch();

export default function AdminPage() {
  return (
    <LocaleProvider initialLocale={initial}>
      <SyncLocaleFromUrl />
      <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 text-center">Loading…</div>}>
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="text-amber-700 font-medium hover:underline">
              {t(initial, 'site.name')}
            </Link>
            <LocaleSwitcher current={initial} />
          </div>
        </header>
        <main>
          <AdminContent />
        </main>
      </Suspense>
    </LocaleProvider>
  );
}
