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
  const translationTextareaRef = useRef<HTMLTextAreaElement>(null);
  const explanationTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollMax, setScrollMax] = useState(0);
  const [zhTranslation, setZhTranslation] = useState('');
  const [wordExplanation, setWordExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [copyZhStatus, setCopyZhStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [copyExplainStatus, setCopyExplainStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [aiError, setAiError] = useState('');
  const [ttsError, setTtsError] = useState('');

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
      const sanitized = sanitizeRubyHtml(raw);
      setHtml(sanitized);
      if (typeof data.remaining === 'number' && onRemainingChange) {
        onRemainingChange(data.remaining);
      }
      const inputText = input.trim();
      setIsExplaining(true);
      setZhTranslation('');
      setWordExplanation('');
      setAiError('');
      setTtsError('');
      setAudioUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      setIsGeneratingAudio(true);
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: inputText }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            setTtsError((j as { error?: string }).error || `HTTP ${r.status}`);
            return null;
          }
          return r.blob();
        })
        .then((blob) => {
          if (blob) setAudioUrl(URL.createObjectURL(blob));
        })
        .catch((e) => {
          setTtsError(e instanceof Error ? e.message : '网络或超时');
        })
        .finally(() => setIsGeneratingAudio(false));
      // 分别请求翻译和单词解释，先完成的先显示
      const translatePromise = fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: inputText }),
      })
        .then((r) => r.json())
        .then((tr) => {
          if (tr.success && typeof tr.translation === 'string') {
            setZhTranslation(tr.translation);
          } else if (tr && typeof (tr as { error?: string }).error === 'string') {
            setAiError((prev) => (prev ? `${prev}; ` : '') + `翻译: ${(tr as { error: string }).error}`);
          }
        })
        .catch((e) => {
          setAiError((prev) => (prev ? `${prev}; ` : '') + `翻译请求失败: ${e instanceof Error ? e.message : '网络或超时'}`);
        });

      const explainPromise = fetch('/api/ai/explain-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: inputText }),
      })
        .then((r) => r.json())
        .then((ex) => {
          if (ex.success && typeof ex.explanation === 'string') {
            setWordExplanation(ex.explanation);
          } else if (ex && typeof (ex as { error?: string }).error === 'string') {
            setAiError((prev) => (prev ? `${prev}; ` : '') + `单词: ${(ex as { error: string }).error}`);
          }
        })
        .catch((e) => {
          setAiError((prev) => (prev ? `${prev}; ` : '') + `单词请求失败: ${e instanceof Error ? e.message : '网络或超时'}`);
        });

      // 等待两个请求都完成（无论成功或失败）后，设置 isExplaining 为 false
      Promise.allSettled([translatePromise, explainPromise]).finally(() => {
        setIsExplaining(false);
      });
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

  /**
   * 从假名注音 HTML 中解析出「完整单词」（汉字+送假名），如 訪(おとず)れる → 訪れる(おとずれる)
   * 使用 DOM 解析，合并每个 ruby 与紧随的送假名，保证解释的是完整词而非仅注音部分
   */
  function parseRubyWords(rubyHtml: string): { word: string; reading: string }[] {
    if (typeof document === 'undefined') return [];
    const div = document.createElement('div');
    div.innerHTML = rubyHtml;
    type Seg = { type: 'ruby'; base: string; reading: string } | { type: 'text'; content: string };
    const segments: Seg[] = [];
    function walk(n: Node): void {
      if (n.nodeType === Node.TEXT_NODE) {
        const c = n.textContent ?? '';
        if (c) segments.push({ type: 'text', content: c });
      } else if (n.nodeName === 'RUBY') {
        const el = n as Element;
        const base = (el.childNodes[0]?.textContent ?? '').trim();
        const rt = el.querySelector('rt');
        const reading = (rt?.textContent ?? '').trim();
        segments.push({ type: 'ruby', base, reading });
      } else {
        n.childNodes.forEach(walk);
      }
    }
    walk(div);
    const result: { word: string; reading: string }[] = [];
    const isKanaOnly = (s: string) => /^[\u3040-\u309f\u30a0-\u30ff\s]*$/.test(s);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type !== 'ruby') continue;
      let word = seg.base;
      let reading = seg.reading;
      let j = i + 1;
      while (j < segments.length && segments[j].type === 'text') {
        const text = (segments[j] as { type: 'text'; content: string }).content;
        if (!isKanaOnly(text)) break;
        const t = text.trim();
        if (t) {
          word += t;
          reading += t;
        }
        j++;
      }
      if (word) result.push({ word, reading });
      i = j - 1;
    }
    return result;
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

  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  /** 中文翻译、单词解释文本框随内容增高，保证能显示全部内容（含字数很多时） */
  useEffect(() => {
    const fit = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
      const el = ref.current;
      if (!el) return;
      el.style.overflow = 'hidden';
      el.style.height = '1px';
      const h = el.scrollHeight;
      el.style.height = `${Math.max(120, h)}px`;
      el.style.overflow = '';
    };
    const run = () => {
      fit(translationTextareaRef);
      fit(explanationTextareaRef);
    };
    const id = requestAnimationFrame(run);
    const t1 = setTimeout(run, 150);
    const t2 = setTimeout(run, 450);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [zhTranslation, wordExplanation]);

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
      
      // 构建包含样式的完整 HTML，确保粘贴后格式不丢失
      const htmlWithStyles = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    .furigana-result-inner {
      display: block;
      white-space: normal;
      line-height: 2.2;
      word-break: normal;
      overflow-wrap: anywhere;
    }
    .rb {
      display: inline;
      white-space: normal;
    }
    .rb ruby {
      white-space: nowrap;
    }
    ruby {
      display: ruby;
      ruby-position: over;
      -webkit-ruby-position: over;
      white-space: nowrap;
    }
    rt {
      font-size: 0.42em;
      line-height: 1;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="furigana-result-inner">${html}</div>
</body>
</html>`;
      
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && typeof navigator.clipboard.write === 'function') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([htmlWithStyles], { type: 'text/html' }),
              'text/plain': new Blob([plainText], { type: 'text/plain' }),
            }),
          ]);
          setCopyStatus('ok');
          setTimeout(() => setCopyStatus('idle'), 2000);
          return;
        } catch (e) {
          // ClipboardItem 失败，尝试使用更兼容的方式
          console.warn('ClipboardItem failed, trying alternative method:', e);
        }
      }
      
      // 备选方案：使用隐藏的 div 元素复制 HTML
      try {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.left = '-9999px';
        div.style.top = '0';
        div.innerHTML = html;
        div.className = 'furigana-result-inner';
        document.body.appendChild(div);
        
        const range = document.createRange();
        range.selectNodeContents(div);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          
          try {
            const success = document.execCommand('copy');
            selection.removeAllRanges();
            document.body.removeChild(div);
            
            if (success) {
              setCopyStatus('ok');
              setTimeout(() => setCopyStatus('idle'), 2000);
              return;
            }
          } catch (e) {
            selection.removeAllRanges();
            document.body.removeChild(div);
            throw e;
          }
        } else {
          document.body.removeChild(div);
        }
      } catch (e) {
        console.warn('HTML copy failed, falling back to text:', e);
      }
      
      // 最终降级方案：使用 textarea + execCommand 复制纯文本
      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, plainText.length);
      
      try {
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (success) {
          setCopyStatus('ok');
          setTimeout(() => setCopyStatus('idle'), 2000);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (e) {
        document.body.removeChild(textarea);
        throw e;
      }
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
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        setStatus('ok');
        setTimeout(() => setStatus('idle'), 2000);
        return;
      }
      
      // 降级方案：使用 textarea + execCommand
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      
      try {
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (success) {
          setStatus('ok');
          setTimeout(() => setStatus('idle'), 2000);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (e) {
        document.body.removeChild(textarea);
        throw e;
      }
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
            <h3 className="text-sm font-medium text-stone-600 mb-1">{t(locale, 'tts.title')}</h3>
            {isGeneratingAudio && (
              <p className="text-stone-400 text-sm mb-2">{t(locale, 'tts.generating')}</p>
            )}
            {audioUrl && (
              <audio controls src={audioUrl} className="w-full" />
            )}
            {ttsError && (
              <p className="text-red-600 text-sm mt-1">朗读：{ttsError}</p>
            )}
          </div>
          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-sm font-medium text-stone-600 mb-1">{t(locale, 'ai.translation_title')}</h3>
            <textarea
              ref={translationTextareaRef}
              readOnly
              value={zhTranslation}
              className="w-full min-h-[120px] resize-y border border-stone-200 rounded-lg px-3 py-2 text-stone-800 bg-stone-50 text-sm"
              style={{ fontFamily: 'system-ui', minHeight: 120 }}
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
              ref={explanationTextareaRef}
              readOnly
              value={wordExplanation}
              className="w-full min-h-[120px] resize-y border border-stone-200 rounded-lg px-3 py-2 text-stone-800 bg-stone-50 text-sm"
              style={{ fontFamily: 'system-ui', minHeight: 120 }}
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
            {aiError && (
              <p className="text-red-600 text-sm mt-2">{aiError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
