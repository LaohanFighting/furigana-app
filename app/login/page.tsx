'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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


function LoginContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'code'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>(undefined);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const emailVal = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setError('Invalid email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
      // 开发模式下，如果返回了验证码，保存并自动填入
      if (data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode);
      }
      setStep('code');
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    const emailVal = email.trim().toLowerCase();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, code: code.trim() }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
      const next = searchParams.get('next') || '/dashboard';
      router.push(next);
      router.refresh();
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const identity = email.trim();

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-6">{t(locale, 'login')}</h1>

      {step === 'input' && (
        <>
          {/* 手机登录选项已隐藏，仅保留邮箱登录 */}
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-600 mb-1">{t(locale, 'email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">
              {t(locale, 'send_code')}
            </button>
          </form>
        </>
      )}

      {step === 'code' && (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm text-stone-600">
            {t(locale, 'code_sent_to')} {identity}
          </p>
          {devCode && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium mb-1">开发模式 - 验证码已自动填入</p>
              <p className="text-sm text-amber-700">验证码：<strong>{devCode}</strong></p>
            </div>
          )}
          <div>
            <label className="block text-sm text-stone-600 mb-1">{t(locale, 'code')}</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              placeholder="6 位数字"
              maxLength={6}
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">
            {t(locale, 'verify')}
          </button>
          <button
            type="button"
            onClick={() => { setStep('input'); setCode(''); setError(''); }}
            className="text-sm text-stone-500 hover:underline"
          >
            {t(locale, 'change_email')}
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
      <p className="mt-6 text-sm text-stone-500">
        <Link href="/dashboard" className="text-amber-600 hover:underline">返回工具</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const initial = getInitialLocale();
  return (
    <LocaleProvider initial={initial}>
      <Suspense fallback={<div className="max-w-sm mx-auto px-4 py-12 text-center text-stone-500">Loading…</div>}>
        <SyncLocaleFromUrl />
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="font-semibold text-stone-800">{t(initial, 'site.name')}</Link>
            <LocaleSwitcher current={initial} />
          </div>
        </header>
        <main>
          <LoginContent />
        </main>
      </Suspense>
    </LocaleProvider>
  );
}
