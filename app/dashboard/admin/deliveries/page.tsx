'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { LocaleProvider, useLocale } from '@/app/LocaleProvider';
import SyncLocaleFromUrl from '@/components/SyncLocaleFromUrl';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { t } from '@/lib/i18n';

type DeliveryItem = {
  id: string;
  orderId: string;
  contactSuffix: string;
  contactFull: string | null;
  status: string;
  activationCode: string | null;
  createdAt: string;
  issuedAt: string | null;
};

function DeliveriesContent() {
  const locale = useLocale();
  const [user, setUser] = useState<{ loggedIn: boolean; isAdmin?: boolean } | null>(null);
  const [list, setList] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchList = () => {
    fetch('/api/admin/deliveries', { credentials: 'include' })
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

  async function issue(requestId: string) {
    setActing(requestId);
    setError('');
    try {
      const res = await fetch('/api/admin/deliveries/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchList();
      } else {
        setError(data.error || '发放失败');
      }
    } finally {
      setActing(null);
    }
  }

  if (user === null || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-stone-500">
        Loading…
      </div>
    );
  }

  if (!user.loggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-stone-600 mb-4">请先登录。</p>
        <Link href="/login" className="text-amber-600 hover:underline">{t(locale, 'login')}</Link>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-stone-600 mb-4">无权限访问此页面。</p>
        <Link href="/dashboard" className="text-amber-600 hover:underline">返回标注工具</Link>
      </div>
    );
  }

  const pending = list.filter((r) => r.status === 'pending');
  const issued = list.filter((r) => r.status === 'issued');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">发货管理</h1>
        <div className="flex gap-4">
          <Link href="/dashboard/admin" className="text-sm text-amber-600 hover:underline">
            权限审批
          </Link>
          <Link href="/dashboard" className="text-sm text-amber-600 hover:underline">
            返回标注工具
          </Link>
        </div>
      </div>

      <p className="text-stone-600 text-sm mb-4">
        用户在小红书等渠道付款后，会到「领取页」提交订单号+手机后4位。您在此核对后点击「发放」，系统将自动分配一个激活码；用户可在领取页用同一信息查询到激活码。
      </p>
      <p className="text-stone-500 text-sm mb-4">
        领取页链接：<span className="font-mono text-amber-700">{typeof window !== 'undefined' ? `${window.location.origin}/claim` : '/claim'}</span>
      </p>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {pending.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-stone-700 mt-6 mb-2">待发放 ({pending.length})</h2>
          <ul className="space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-sm">
                  <span className="font-mono text-stone-800">订单号：{r.orderId}</span>
                  <span className="text-stone-500 ml-2">手机后4位：{r.contactSuffix}</span>
                  {r.contactFull && <span className="text-stone-500 ml-2">({r.contactFull})</span>}
                  <span className="text-stone-400 ml-2">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={acting === r.id}
                  onClick={() => issue(r.id)}
                  className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {acting === r.id ? '发放中…' : '发放'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="text-sm font-medium text-stone-700 mt-6 mb-2">已发放 ({issued.length})</h2>
      {issued.length === 0 ? (
        <p className="text-stone-500 py-4">暂无</p>
      ) : (
        <ul className="space-y-2">
          {issued.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-stone-200 bg-white p-3 flex flex-wrap items-center gap-2 text-sm"
            >
              <span className="font-mono text-stone-600">{r.orderId}</span>
              <span className="text-stone-500">后4位 {r.contactSuffix}</span>
              <span className="font-mono text-amber-700">{r.activationCode ?? '-'}</span>
              <span className="text-stone-400">
                {r.issuedAt ? new Date(r.issuedAt).toLocaleString() : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      {list.length === 0 && !loading && (
        <p className="text-stone-500 py-8">暂无领取记录。</p>
      )}
    </div>
  );
}

function getLocale(): 'zh' | 'ja' | 'en' {
  if (typeof window === 'undefined') return 'zh';
  const p = new URLSearchParams(window.location.search);
  const lang = p.get('lang');
  return lang === 'ja' || lang === 'en' ? lang : 'zh';
}

export default function DeliveriesPage() {
  const initial = getLocale();
  return (
    <LocaleProvider initial={initial}>
      <Suspense fallback={null}>
        <SyncLocaleFromUrl />
      </Suspense>
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-amber-700 font-medium hover:underline">
            {t(initial, 'site.name')}
          </Link>
          <LocaleSwitcher current={initial} />
        </div>
      </header>
      <main>
        <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-8 text-center">Loading…</div>}>
          <DeliveriesContent />
        </Suspense>
      </main>
    </LocaleProvider>
  );
}
