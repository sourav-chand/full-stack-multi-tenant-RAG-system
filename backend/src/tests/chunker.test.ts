import { chunkText, estimateTokens } from '../rag/chunker';

describe('chunker.estimateTokens', () => {
  test('empty string returns 0', () => {
    expect(estimateTokens('')).toBe(0);
  });
  test('counts words with ratio', () => {
    const text = 'one two three four five six seven eight';
    expect(estimateTokens(text)).toBeGreaterThan(0);
  });
});

describe('chunker.chunkText', () => {
  test('empty text returns no chunks', () => {
    expect(chunkText('', 10, 2)).toEqual([]);
  });

  test('produces overlapping chunks for long text', () => {
    const long = Array.from({ length: 2000 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkText(long, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.index).toBe(0);
    expect(chunks[1]?.index).toBe(1);
    for (const c of chunks) {
      expect(c.content.length).toBeGreaterThan(0);
      expect(c.tokenCount).toBeGreaterThan(0);
    }
  });

  test('overlap is preserved between consecutive chunks', () => {
    const long = Array.from({ length: 500 }, (_, i) => `w${i}`).join(' ');
    const chunks = chunkText(long, 50, 10);
    expect(chunks.length).toBeGreaterThan(2);
    const a = chunks[0]?.content ?? '';
    const b = chunks[1]?.content ?? '';
    const tailA = a.split(' ').slice(-5).join(' ');
    expect(b).toContain(tailA.split(' ')[0] ?? '');
  });
});
