/**
 * 日语振假名（Furigana）核心逻辑
 * 使用 Kuroshiro + Kuromoji 分析日文，仅对汉字词标注平假名，输出标准 <ruby><rt> HTML
 */

import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

let kuroshiroInstance: Kuroshiro | null = null;

export async function getKuroshiro(): Promise<Kuroshiro> {
  if (kuroshiroInstance) return kuroshiroInstance;
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
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

/** 供单词筛选使用：获取同一 Kuroshiro 分析器的 parse 结果（不改变假名注音逻辑） */
type AnalyzerLike = { parse(str: string): Promise<unknown[]> };
export async function getTokensFromText(text: string): Promise<unknown[]> {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  const kuroshiro = await getKuroshiro();
  const analyzer = (kuroshiro as unknown as { _analyzer?: AnalyzerLike })._analyzer;
  if (!analyzer || typeof analyzer.parse !== 'function') return [];
  return analyzer.parse(trimmed);
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
