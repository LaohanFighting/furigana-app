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

const EXPLAIN_WORDS_SYSTEM = `你是一个日语词汇教师。根据用户给出的一段日语文本，找出其中「含有汉字、通常需要标注假名的单词」（即汉字词/用言等），对每个这样的单词给出解释。

对每个单词严格按以下格式输出（纯文本，不要用 Markdown 或 HTML）：

单词：原词(假名读法)
词性：名词/动词/形容词/ etc.
意思：中文释义
例句：
一句包含该词的日语例句。
该例句的中文翻译。

多个单词之间用空行分隔。只输出上述内容，不要其他说明。`;

/**
 * 对文本中“有假名注音的单词”（汉字词）进行解释，输出结构化纯文本
 */
export async function explainJapaneseWords(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  return chat(trimmed, EXPLAIN_WORDS_SYSTEM);
}
