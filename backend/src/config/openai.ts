import OpenAI from 'openai';
import { env } from './env';

export const openai: OpenAI = new OpenAI({
  apiKey: env().OPENAI_API_KEY
});
