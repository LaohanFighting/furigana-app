/**
 * 日语 TTS：调用 OpenAI Audio API，根据原始日语文本生成朗读音频
 * 独立于假名注音逻辑，仅使用用户输入的原始文本
 */

const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1';

function getOpenAIBase(): string {
  const base = process.env.OPENAI_API_BASE?.trim();
  return base ? base.replace(/\/$/, '') : DEFAULT_OPENAI_BASE;
}

function getApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

/**
 * 根据日语文本生成朗读音频，返回 mp3 二进制
 */
export async function generateJapaneseAudio(text: string): Promise<ArrayBuffer> {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required');
  }
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Text is required');
  }
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  const base = getOpenAIBase();
  const url = `${base}/audio/speech`;
  console.log('[lib/tts] request URL:', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: trimmed,
      voice: 'alloy',
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS error: ${res.status} ${err}`);
  }
  return res.arrayBuffer();
}
