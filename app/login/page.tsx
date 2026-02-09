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

function normalizePhoneInput(v: string): string {
  return v.replace(/\D/g, '');
}

function LoginContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'code'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const isEmail = method === 'email';
    const emailVal = email.trim().toLowerCase();
    const phoneVal = normalizePhoneInput(phone);
    const validEmail = isEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    const validPhone = !isEmail && phoneVal.length >= 10;
    if (!validEmail && !validPhone) {
      setError(isEmail ? 'Invalid email' : '请输入有效手机号（至少10位数字）');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEmail ? { email: emailVal } : { phone: phoneVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
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
    const isEmail = method === 'email';
    const emailVal = email.trim().toLowerCase();
    const phoneVal = normalizePhoneInput(phone);
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEmail ? { email: emailVal, code: code.trim() } : { phone: phoneVal, code: code.trim() }
        ),
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

  const isEmail = method === 'email';
  const identity = isEmail ? email.trim() : phone;

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-6">{t(locale, 'login')}</h1>

      {step === 'input' && (
        <>
          <div className="flex border-b border-stone-200 mb-4">
            <button
              type="button"
              onClick={() => { setMethod('email'); setError(''); }}
              className={`flex-1 py-2 text-sm ${isEmail ? 'border-b-2 border-amber-600 text-amber-600 font-medium' : 'text-stone-500'}`}
            >
              {t(locale, 'login_by_email')}
            </button>
            <button
              type="button"
              onClick={() => { setMethod('phone'); setError(''); }}
              className={`flex-1 py-2 text-sm ${!isEmail ? 'border-b-2 border-amber-600 text-amber-600 font-medium' : 'text-stone-500'}`}
            >
              {t(locale, 'login_by_phone')}
            </button>
          </div>
          <form onSubmit={sendCode} className="space-y-4">
            {isEmail ? (
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
            ) : (
              <div>
                <label className="block text-sm text-stone-600 mb-1">{t(locale, 'phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  placeholder="如 13800138000"
                  maxLength={20}
                />
              </div>
            )}
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
            {isEmail ? t(locale, 'change_email') : t(locale, 'change_phone')}
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
