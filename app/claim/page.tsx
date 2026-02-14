'use client';

import { useState } from 'react';
import Link from 'next/link';

const APP_NAME = '日语通';

export default function ClaimPage() {
  const [orderId, setOrderId] = useState('');
  const [suffix, setSuffix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    status: 'pending' | 'issued';
    message?: string;
    activationCode?: string;
    activateUrl?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const oid = orderId.trim();
    const suf = suffix.replace(/\D/g, '').slice(-4);
    if (!oid) {
      setError('请填写订单号');
      return;
    }
    if (suf.length !== 4) {
      setError('请填写手机号后4位（4位数字）');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: oid,
          contactSuffix: suf,
          contactFull: undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败');
        return;
      }
      setResult({
        status: data.status,
        message: data.message,
        activationCode: data.activationCode ?? undefined,
        activateUrl: data.activateUrl ?? undefined,
      });
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const oid = orderId.trim();
    const suf = suffix.replace(/\D/g, '').slice(-4);
    if (!oid || suf.length !== 4) {
      setError('请填写订单号和手机号后4位');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claim/status?orderId=${encodeURIComponent(oid)}&suffix=${encodeURIComponent(suf)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '查询失败');
        return;
      }
      setResult({
        status: data.status,
        message: data.message,
        activationCode: data.activationCode ?? undefined,
        activateUrl: data.activateUrl ?? undefined,
      });
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold text-stone-800 mb-2">领取{APP_NAME}激活码</h1>
        <p className="text-sm text-stone-500 mb-6">
          请填写您在小红书等渠道付款后的订单号及手机号后4位，提交后等待发放；已发放的可直接查询到激活码。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-stone-600 mb-1">订单号</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              placeholder="小红书订单号或您收到的单号"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-600 mb-1">手机号后4位</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={suffix}
              onChange={(e) => setSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              placeholder="0000"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? '提交中…' : '提交领取'}
            </button>
            <button
              type="button"
              onClick={handleQuery}
              disabled={loading}
              className="flex-1 py-2 border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-50"
            >
              查询是否已发放
            </button>
          </div>
        </form>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {result && (
          <div className="p-4 rounded-lg bg-white border border-stone-200">
            {result.status === 'issued' && result.activationCode ? (
              <>
                <p className="text-sm text-stone-600 mb-2">已发放，您的激活码：</p>
                <p className="text-lg font-mono font-semibold text-amber-700 mb-2">
                  {result.activationCode}
                </p>
                <p className="text-sm text-stone-500 mb-2">请复制激活码，并打开下方链接完成激活：</p>
                <a
                  href={result.activateUrl || '/activate'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline break-all"
                >
                  {result.activateUrl || '/activate'}
                </a>
              </>
            ) : (
              <p className="text-stone-600">{result.message || '请等待发放后再次查询。'}</p>
            )}
          </div>
        )}

        <p className="mt-8 text-sm text-stone-500">
          <Link href="/" className="text-amber-600 hover:underline">
            返回{APP_NAME}首页
          </Link>
        </p>
      </div>
    </div>
  );
}
