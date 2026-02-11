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
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    const emailVal = email.trim().toLowerCase();
    const phoneDigits = normalizePhone(phone);
    const byEmail = !!emailVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    const byPhone = !!phoneDigits && phoneDigits.length >= 10;

    if (!byEmail && !byPhone) {
      setError(locale === 'zh' ? '请输入邮箱或手机号' : 'Please enter email or phone');
      return;
    }
    if (!password) {
      setError(locale === 'zh' ? '请输入密码' : 'Please enter password');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: byEmail ? emailVal : undefined,
          phone: byPhone ? phoneDigits : undefined,
          password,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登录失败');
        return;
      }
      const next = searchParams.get('next') || '/dashboard';
      router.push(next);
      router.refresh();
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-6">{t(locale, 'login')}</h1>

      <form onSubmit={handlePasswordLogin} className="space-y-4">
        <div>
          <label className="block text-sm text-stone-600 mb-1">
            {locale === 'zh' ? '邮箱或手机号' : 'Email or phone'}
          </label>
          <input
            type="text"
            value={email || phone}
            onChange={(e) => {
              const val = e.target.value;
              if (/@/.test(val)) {
                setEmail(val);
                setPhone('');
              } else {
                setPhone(normalizePhone(val));
                setEmail('');
              }
            }}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            placeholder={locale === 'zh' ? 'your@example.com 或 11位手机号' : 'Email or phone'}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-stone-600 mb-1">
            {locale === 'zh' ? '密码' : 'Password'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            placeholder={locale === 'zh' ? '请输入密码' : 'Password'}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="w-full py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">
          {loading ? (locale === 'zh' ? '登录中...' : 'Logging in...') : (locale === 'zh' ? '登录' : 'Login')}
        </button>
        <p className="text-xs text-stone-500">
          {locale === 'zh' ? '已激活用户可用密码登录' : 'Activated users can login with password'}
        </p>
      </form>

      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
      <p className="mt-6 text-sm text-stone-500">
        <Link href="/dashboard" className="text-amber-600 hover:underline">
          {locale === 'zh' ? '返回工具' : 'Back to tool'}
        </Link>
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
