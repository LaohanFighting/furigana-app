/**
 * 日语振假名（Furigana）核心逻辑
 * 使用 Kuroshiro + Kuromoji 分析日文，仅对汉字词标注平假名，输出标准 <ruby><rt> HTML
 */

// Dynamic import for server-side only (kuromoji dict is large)
let kuroshiroInstance: { convert: (s: string, o: { to: string; mode: string }) => Promise<string> } | null = null;

async function getKuroshiro() {
  if (kuroshiroInstance) return kuroshiroInstance;
  const kuroMod = await import('kuroshiro');
  const analyzerMod = await import('kuroshiro-analyzer-kuromoji');
  const Kuroshiro = (kuroMod as { default?: typeof kuroMod }).default ?? kuroMod;
  const KuromojiAnalyzer = (analyzerMod as { default?: typeof analyzerMod }).default ?? analyzerMod;
  const kuroshiro = new (Kuroshiro as new () => { init: (a: unknown) => Promise<void>; convert: (s: string, o: { to: string; mode: string }) => Promise<string> })();
  await kuroshiro.init(new (KuromojiAnalyzer as new () => object)());
  kuroshiroInstance = kuroshiro;
  return kuroshiro;
}

/**
 * Kuroshiro furigana 模式输出格式为：漢字(よみ) 或 感(かん)じ
 * 转为 <span class="rb"><ruby>漢字<rt>よみ</rt></ruby></span>。
 * ruby 为 atomic inline box，ZWSP 在连续 ruby 间无效；用 span.rb 作为可断行 inline 容器。
 */
function furiganaTextToRubyHtml(furiganaText: string): string {
  const rubyHtml = furiganaText.replace(
    /([^()]+)\(([^()]+)\)/g,
    '<span class="rb"><ruby>$1<rt>$2</rt></ruby></span>'
  );
  return rubyHtml;
}

/**
 * 将日文文本转换为带振假名的 HTML 字符串
 * - 仅对汉字标注平假名，假名/助词/标点不加注
 * - 输出为标准 <ruby><rt> 结构，可复制、可 SEO
 */
export async function textToFuriganaHtml(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  const kuroshiro = await getKuroshiro();
  // mode: "furigana" 会输出 漢字(読み) 形式
  const furiganaResult = await kuroshiro.convert(trimmed, {
    to: 'hiragana',
    mode: 'furigana',
  });
  let raw = furiganaTextToRubyHtml(furiganaResult);
  raw = raw
    .replace(/<rp>[\s\S]*?<\/rp>/gi, '')
    .replace(/<\/?rp>/gi, '')
    .replace(/\s*<\/ruby>\s*<\/ruby>/gi, '</ruby>')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return raw;
}
