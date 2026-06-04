import { openai } from '../config/openai';
import { env } from '../config/env';

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const response = await openai.embeddings.create({
    model: env().OPENAI_EMBED_MODEL,
    input: texts
  });
  return response.data.map((d) => d.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  if (!vec) {
    throw new Error('Failed to produce embedding for query');
  }
  return vec;
}
