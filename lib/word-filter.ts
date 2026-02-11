/**
 * 重点单词筛选：从分词结果中选出「最值得解释」的 3–5 个词
 * 规则稳定、可执行，不追求语言学完美
 */

/** 汉字范围（CJK 统一汉字、扩展 A、兼容汉字） */
const HAN_REGEX = /[\u4e00-\u9fcf\u3400-\u4dbf\uf900-\ufaff]/;

/** 实词词性：名词 / 动词 / 形容词 / 形容动词（形状詞） */
const CONTENT_POS = new Set([
  '名詞',
  '動詞',
  '形容詞',
  '形状詞', // 形容動詞語幹等
]);

/** 必须排除的词性 */
const EXCLUDE_POS = new Set([
  '助詞',
  '助動詞',
  '接続詞',
]);

/** 形式名词（基本形），命中即排除 */
const FORM_NOUNS = new Set(['こと', 'もの', 'ところ', 'よう']);

/** 高频基础词（约 50 个），命中即跳过；使用基本形 */
const BASIC_WORDS_SET = new Set([
  '人', '行く', '来る', '見る', '聞く', '言う', '思う', 'する', 'ある', 'いる',
  '大きい', '小さい', '多い', '少ない', '良い', '悪い', '新しい', '古い',
  '高い', '低い', '暑い', '寒い', '熱い', '冷たい', '難しい', '易しい',
  '時', '日', '年', '月', '今日', '明日', '昨日', '今', 'ここ', 'そこ', 'あそこ',
  '何', '誰', 'どこ', 'どう', 'なぜ', 'いくつ', 'いくら',
  '私', 'あなた', '彼', '彼女',
  '方', '中', '上', '下', '前', '後',
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '食べる', '飲む', '寝る', '起きる', '勉強', '仕事', '学校', '家',
]);

const MAX_KEYWORDS = 5;

export type KuromojiToken = {
  surface_form: string;
  pos: string;
  basic_form: string;
  reading?: string;
  [key: string]: unknown;
};

function containsKanji(str: string): boolean {
  return HAN_REGEX.test(str);
}

function isContentWord(pos: string): boolean {
  if (EXCLUDE_POS.has(pos)) return false;
  return CONTENT_POS.has(pos);
}

function isFormNoun(basicForm: string): boolean {
  return FORM_NOUNS.has(basicForm);
}

function isBasicWord(basicForm: string): boolean {
  return BASIC_WORDS_SET.has(basicForm);
}

/** 片假名 → 平假名（Kuromoji 的 reading 为片假名） */
export function katakanaToHiragana(s: string): string {
  return s.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

export type WordWithReading = { word: string; reading: string };

/**
 * 从 token 列表筛出重点单词，最多 MAX_KEYWORDS 个，保持原文顺序
 */
export function filterKeyWords(tokens: KuromojiToken[]): WordWithReading[] {
  const result: WordWithReading[] = [];
  for (const token of tokens) {
    const surface = token.surface_form ?? '';
    const basic = token.basic_form ?? surface;
    const pos = token.pos ?? '';
    const reading = token.reading ?? '';

    if (!containsKanji(surface)) continue;
    if (!isContentWord(pos)) continue;
    if (isFormNoun(basic)) continue;
    if (isBasicWord(basic)) continue;

    result.push({
      word: basic,
      reading: katakanaToHiragana(reading || surface),
    });

    if (result.length >= MAX_KEYWORDS) break;
  }
  return result;
}
