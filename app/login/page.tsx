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


function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

function LoginContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginBy, setLoginBy] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'code'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>(undefined);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (loginBy === 'email') {
      const emailVal = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        setError('Invalid email');
        return;
      }
    } else {
      const phoneDigits = normalizePhone(phone);
      if (phoneDigits.length < 10) {
        setError(locale === 'zh' ? '请输入有效手机号' : 'Invalid phone number');
        return;
      }
    }
    setError('');
    setLoading(true);
    try {
      const body = loginBy === 'email'
        ? { email: email.trim().toLowerCase() }
        : { phone: normalizePhone(phone) };
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
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
    setError('');
    setLoading(true);
    try {
      const body = loginBy === 'email'
        ? { email: email.trim().toLowerCase(), code: code.trim() }
        : { phone: normalizePhone(phone), code: code.trim() };
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const identity = loginBy === 'email' ? email.trim() : phone.trim();

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-6">{t(locale, 'login')}</h1>

      {step === 'input' && (
        <>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => { setLoginBy('email'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${loginBy === 'email' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {t(locale, 'login_by_email')}
            </button>
            <button
              type="button"
              onClick={() => { setLoginBy('phone'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${loginBy === 'phone' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {t(locale, 'login_by_phone')}
            </button>
          </div>
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-600 mb-1">
                {loginBy === 'email' ? t(locale, 'email') : t(locale, 'phone')}
              </label>
              {loginBy === 'email' ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  placeholder={locale === 'zh' ? 'your@example.com' : undefined}
                  required
                />
              ) : (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  placeholder={locale === 'zh' ? '11 位手机号' : 'Phone number'}
                  maxLength={11}
                />
              )}
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">
              {t(locale, 'send_code')}
            </button>
          </form>
          {loginBy === 'phone' && locale === 'zh' && (
            <p className="mt-2 text-xs text-stone-500">大陆用户建议用手机号登录，验证码更稳定</p>
          )}
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
            onClick={() => { setStep('input'); setCode(''); setError(''); setDevCode(undefined); }}
            className="text-sm text-stone-500 hover:underline"
          >
            {loginBy === 'email' ? t(locale, 'change_email') : t(locale, 'change_phone')}
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
