'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LocaleProvider, useLocale } from '@/app/LocaleProvider';
import SyncLocaleFromUrl from '@/components/SyncLocaleFromUrl';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const p = new URLSearchParams(window.location.search);
  const lang = p.get('lang');
  return lang === 'ja' || lang === 'en' ? lang : 'zh';
}

function UpgradeContent() {
  const locale = useLocale();
  const router = useRouter();
  const [channel, setChannel] = useState<'alipay' | 'wechat'>('alipay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createPay() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
      if (data.payUrl) {
        window.location.href = data.payUrl;
        return;
      }
      if (data.qrCode) {
        // 部分平台返回二维码 URL，可在此展示
        setError('请使用扫码支付。若未配置支付，请设置 PAYMENT_* 环境变量。');
        return;
      }
      setError('支付未配置或未返回支付链接。请配置 PAYMENT_* 环境变量后重试。');
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-2">{t(locale, 'upgrade')}</h1>
      <p className="text-stone-600 mb-6">一次付费，永久无限次使用振假名标注。</p>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setChannel('alipay')}
          className={`flex-1 py-2 rounded-lg border ${channel === 'alipay' ? 'border-amber-600 bg-amber-50' : 'border-stone-300'}`}
        >
          {t(locale, 'pay.alipay')}
        </button>
        <button
          onClick={() => setChannel('wechat')}
          className={`flex-1 py-2 rounded-lg border ${channel === 'wechat' ? 'border-amber-600 bg-amber-50' : 'border-stone-300'}`}
        >
          {t(locale, 'pay.wechat')}
        </button>
      </div>
      <button
        onClick={createPay}
        disabled={loading}
        className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? '…' : '去支付'}
      </button>
      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
      <p className="mt-6 text-sm text-stone-500">
        <Link href="/dashboard" className="text-amber-600 hover:underline">返回工具</Link>
      </p>
    </div>
  );
}

export default function UpgradePage() {
  const initial = getInitialLocale();
  return (
    <LocaleProvider initial={initial}>
      <SyncLocaleFromUrl />
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="font-semibold text-stone-800">{t(initial, 'site.name')}</Link>
          <LocaleSwitcher current={initial} />
        </div>
      </header>
      <main>
        <UpgradeContent />
      </main>
    </LocaleProvider>
  );
}
