process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://rag:rag@localhost:5432/rag_test?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-dummy';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-test-secret-test';
process.env.EMBED_DIM = '1536';
process.env.OPENAI_EMBED_MODEL = 'text-embedding-3-small';
process.env.OPENAI_CHAT_MODEL = 'gpt-4o';
