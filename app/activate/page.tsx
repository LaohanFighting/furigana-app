'use client';

import { Suspense, useState } from 'react';
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

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

function ActivateContent() {
  const locale = useLocale();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activated, setActivated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError('请输入激活码');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '激活失败');
        return;
      }

      // 激活成功，需要设置密码
      setActivated(true);
      setUserId(data.userId || null);
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          userId,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '设置密码失败');
        return;
      }

      // 密码设置成功，跳转到 dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-6">激活账号</h1>

      {activated ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
            <p className="text-green-800 font-medium">激活成功！</p>
            <p className="text-sm text-green-700 mt-1">请设置密码，以便下次登录</p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-600 mb-1">设置密码 *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                placeholder="至少6位"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">确认密码 *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                placeholder="再次输入密码"
                minLength={6}
                required
              />
            </div>

            <p className="text-xs text-stone-500">
              * 密码用于后续登录，请妥善保管
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? '设置中...' : '完成设置'}
            </button>
          </form>

          {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-600 mb-6">
            请输入您收到的激活码，并填写邮箱或手机号（用于创建账号）
          </p>

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-600 mb-1">激活码 *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                placeholder="FURIGANA-XXXX-XXXX"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">邮箱（可选）</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                placeholder="your@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">手机号（可选）</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                placeholder="11 位手机号"
                maxLength={11}
              />
            </div>

            <p className="text-xs text-stone-500">
              * 邮箱和手机号至少填写一个，用于创建账号
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? '激活中...' : '激活'}
            </button>
          </form>

          {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
        </>
      )}

      <p className="mt-6 text-sm text-stone-500">
        <Link href="/dashboard" className="text-amber-600 hover:underline">
          返回工具
        </Link>
      </p>
    </div>
  );
}

export default function ActivatePage() {
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
          <ActivateContent />
        </main>
      </Suspense>
    </LocaleProvider>
  );
}
