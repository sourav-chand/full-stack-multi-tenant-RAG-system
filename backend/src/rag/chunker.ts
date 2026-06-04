export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
}

const WORD_TOKEN_RATIO = 0.75;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.split(/\s+/).length / WORD_TOKEN_RATIO);
}

export function chunkText(
  text: string,
  chunkSize: number = 512,
  overlap: number = 50
): Chunk[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const words = normalized.split(' ');
  if (words.length === 0) return [];

  const tokensPerWord = 1 / WORD_TOKEN_RATIO;
  const wordsPerChunk = Math.max(1, Math.floor(chunkSize * tokensPerWord));
  const overlapWords = Math.max(0, Math.floor(overlap * tokensPerWord));

  const chunks: Chunk[] = [];
  let i = 0;
  let index = 0;
  while (i < words.length) {
    const end = Math.min(words.length, i + wordsPerChunk);
    const slice = words.slice(i, end).join(' ').trim();
    if (slice.length > 0) {
      chunks.push({
        index,
        content: slice,
        tokenCount: estimateTokens(slice)
      });
      index += 1;
    }
    if (end === words.length) break;
    const nextStart = end - overlapWords;
    i = nextStart <= i ? end : nextStart;
  }
  return chunks;
}
