'use client';

import { useState, useRef, useEffect } from 'react';
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
  const resultScrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollMax, setScrollMax] = useState(0);
  const [zhTranslation, setZhTranslation] = useState('');
  const [wordExplanation, setWordExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [copyZhStatus, setCopyZhStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [copyExplainStatus, setCopyExplainStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

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
      const inputText = input.trim();
      setIsExplaining(true);
      setZhTranslation('');
      setWordExplanation('');
      Promise.all([
        fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text: inputText }),
        }).then((r) => r.json()),
        fetch('/api/ai/explain-words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text: inputText }),
        }).then((r) => r.json()),
      ])
        .then(([tr, ex]) => {
          if (tr.success && typeof tr.translation === 'string') setZhTranslation(tr.translation);
          if (ex.success && typeof ex.explanation === 'string') setWordExplanation(ex.explanation);
        })
        .finally(() => setIsExplaining(false));
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

  function updateScrollMax() {
    const el = resultScrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setScrollMax(max);
    if (scrollLeft > max) setScrollLeft(max);
  }

  useEffect(() => {
    if (!html) return;
    const el = resultScrollRef.current;
    if (!el) return;
    setScrollLeft(0);
    el.scrollLeft = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timer = requestAnimationFrame(() => {
      updateScrollMax();
      timeoutId = setTimeout(updateScrollMax, 80);
    });
    return () => {
      cancelAnimationFrame(timer);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [html]);

  useEffect(() => {
    if (!html) return;
    const el = resultScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollMax);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html]);

  function onResultScroll() {
    const el = resultScrollRef.current;
    if (el) setScrollLeft(el.scrollLeft);
  }

  function onSliderChange(value: number) {
    setScrollLeft(value);
    if (resultScrollRef.current) resultScrollRef.current.scrollLeft = value;
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

  async function copyTextToClipboard(
    text: string,
    setStatus: (s: 'idle' | 'ok' | 'fail') => void
  ) {
    if (!text) return;
    setStatus('idle');
    try {
      await navigator.clipboard.writeText(text);
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('fail');
      setTimeout(() => setStatus('idle'), 2000);
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
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {html && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-stone-600 mb-1">{t(locale, 'output.title')}</h3>
            <div
              ref={resultScrollRef}
              onScroll={onResultScroll}
              className="furigana-result-scroll overflow-x-auto overflow-y-hidden border border-stone-200 rounded-lg bg-white"
            >
              <div className="furigana-result min-w-min p-4 text-lg leading-relaxed break-words">
                <span className="furigana-result-inner" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </div>
            {scrollMax > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-stone-500 whitespace-nowrap">左右滑动</span>
                <input
                  type="range"
                  min={0}
                  max={scrollMax}
                  value={scrollLeft}
                  onChange={(e) => onSliderChange(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none bg-stone-200 accent-amber-600"
                />
              </div>
            )}
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
          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-sm font-medium text-stone-600 mb-1">{t(locale, 'ai.translation_title')}</h3>
            <textarea
              readOnly
              value={zhTranslation}
              className="w-full min-h-[120px] resize-y border border-stone-200 rounded-lg px-3 py-2 text-stone-800 bg-stone-50 text-sm"
              style={{ fontFamily: 'system-ui' }}
            />
            {isExplaining && !zhTranslation && (
              <p className="text-stone-400 text-sm mt-1">生成中…</p>
            )}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => copyTextToClipboard(zhTranslation, setCopyZhStatus)}
                disabled={!zhTranslation}
                className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-50"
              >
                {copyZhStatus === 'ok' ? t(locale, 'copy_done') : copyZhStatus === 'fail' ? t(locale, 'copy_fail') : t(locale, 'copy')}
              </button>
            </div>
          </div>
          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-sm font-medium text-stone-600 mb-1">{t(locale, 'ai.words_title')}</h3>
            <textarea
              readOnly
              value={wordExplanation}
              className="w-full min-h-[120px] resize-y border border-stone-200 rounded-lg px-3 py-2 text-stone-800 bg-stone-50 text-sm"
              style={{ fontFamily: 'system-ui' }}
            />
            {isExplaining && !wordExplanation && (
              <p className="text-stone-400 text-sm mt-1">生成中…</p>
            )}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => copyTextToClipboard(wordExplanation, setCopyExplainStatus)}
                disabled={!wordExplanation}
                className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-50"
              >
                {copyExplainStatus === 'ok' ? t(locale, 'copy_done') : copyExplainStatus === 'fail' ? t(locale, 'copy_fail') : t(locale, 'copy')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
