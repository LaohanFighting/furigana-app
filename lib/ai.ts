/**
 * AI 辅助：日语→中文翻译、单词解释
 * 独立于假名注音逻辑，仅用 LLM，不依赖 kuroshiro/furigana
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

function getApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

async function chat(userContent: string, systemContent: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

/**
 * 将日语文本翻译为中文（整段纯文本）
 */
export async function translateJapaneseToChinese(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  const system = `你是一个专业的日语翻译。将用户给出的日语文本翻译成自然、流畅的中文。只输出翻译结果，不要加说明、不要加「翻译：」等前缀。输出为一段纯文本。`;
  return chat(trimmed, system);
}

const EXPLAIN_WORDS_FROM_LIST_SYSTEM = `你是一个日语词汇教师。用户会给出一个「单词(读法)」的列表，每一项都是完整单词（含汉字与送假名），例如 訪れる(おとずれる)。请对每个完整单词释义，不要只解释其中的汉字部分，要解释整个词。

对每个单词严格按以下格式输出（纯文本，不要用 Markdown 或 HTML）：

单词：原词(假名读法)
词性：名词/动词/形容词等
意思：中文释义
例句：
（你必须自己造一句新的日语例句，句中要包含该词。禁止直接引用或复述用户输入的句子，要重新造句。）
中文翻译：
（上面例句的中文翻译，只写翻译内容即可。）

多个单词之间用空行分隔。只输出上述内容，不要其他说明。必须覆盖用户给出的全部单词。`;

export type WordWithReading = { word: string; reading: string };

/**
 * 对「已给出的单词列表」逐条解释，例句必须为新造句，不得引用用户输入；例句翻译的标签为「中文翻译」。
 */
export async function explainJapaneseWordsFromList(
  words: WordWithReading[]
): Promise<string> {
  if (!Array.isArray(words) || words.length === 0) return '';
  const filtered = words.filter(
    (w) => typeof w.word === 'string' && typeof w.reading === 'string'
  );
  if (filtered.length === 0) return '';
  const userContent = filtered
    .map((w) => `${w.word}(${w.reading})`)
    .join('\n');
  return chat(userContent, EXPLAIN_WORDS_FROM_LIST_SYSTEM);
}
