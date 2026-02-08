'use client';

import { useState } from 'react';
import { useLocale } from '@/app/LocaleProvider';
import { t } from '@/lib/i18n';

const EXAMPLE = '日本語を勉強します';

export default function FuriganaEditor({
  remaining,
  isPremium,
  onRemainingChange,
}: {
  remaining?: number;
  isPremium?: boolean;
  onRemainingChange?: (n: number) => void;
}) {
  const locale = useLocale();
  const [input, setInput] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  async function convert() {
    if (!input.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/furigana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }
      const raw = (data.html || '').replace(/\n/g, '').replace(/\r/g, '').replace(/\s{2,}/g, ' ').trim();
      setHtml(sanitizeRubyHtml(raw));
      if (typeof data.remaining === 'number' && onRemainingChange) {
        onRemainingChange(data.remaining);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  /** 清理 HTML：去掉 <rp></rp> 等；不得移除 U+200B（\u200B）换行断点 */
  function sanitizeRubyHtml(rubyHtml: string): string {
    return rubyHtml
      .replace(/<rp>[\s\S]*?<\/rp>/gi, '')
      .replace(/<\/?rp>/gi, '')
      .replace(/\s*<\/ruby>\s*<\/ruby>/gi, '</ruby>')
      .replace(/<\/ruby>\s*<\/rp>/gi, '</ruby>')
      .replace(/<\/rp>\s*<\/ruby>/gi, '</ruby>');
  }

  /** 从 ruby HTML 提取纯文本（仅保留汉字/假名等可见正文，去掉 rt 标签内容避免重复） */
  function htmlToPlainText(rubyHtml: string): string {
    return rubyHtml
      .replace(/<rt>[\s\S]*?<\/rt>/gi, '')
      .replace(/<ruby>|<\/ruby>/g, '');
  }

  async function copyResult() {
    if (!html) return;
    setCopyStatus('idle');
    try {
      const plainText = htmlToPlainText(html);
      const htmlForClipboard = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
      if (navigator.clipboard && typeof navigator.clipboard.write === 'function') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([htmlForClipboard], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setCopyStatus('ok');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('fail');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">
          {t(locale, 'input.placeholder')}
        </label>
        <textarea
          className="w-full h-32 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder={EXAMPLE}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={convert}
          disabled={loading}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? '…' : t(locale, 'convert')}
        </button>
        {typeof remaining === 'number' && !isPremium && (
          <span className="text-sm text-stone-500">
            {t(locale, 'remaining')}: {remaining}
          </span>
        )}
        {isPremium && (
          <span className="text-sm text-amber-600">{t(locale, 'unlimited')}</span>
        )}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {html && (
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">{t(locale, 'output.title')}</h3>
          {/* 单容器 + 整段 ruby HTML 注入，禁止 token map / 逐词 span / <br> */}
          <div className="furigana-result p-4 bg-white border border-stone-200 rounded-lg text-lg leading-relaxed break-words">
            <span className="furigana-result-inner" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          <div className="mt-2">
            <button
              type="button"
              onClick={copyResult}
              className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-100"
            >
              {copyStatus === 'ok' ? t(locale, 'copy_done') : copyStatus === 'fail' ? t(locale, 'copy_fail') : t(locale, 'copy')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
