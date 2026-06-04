export type GuardrailVerdict =
  | { ok: true }
  | { ok: false; reason: 'prompt_injection' | 'out_of_scope' | 'low_confidence'; message: string };

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(?:all\s+)?previous\s+instructions?/i,
  /you\s+are\s+now/i,
  /forget\s+everything/i,
  /jailbreak/i,
  /bypass\s+safety/i,
  /act\s+as\s+(?!if\b)[a-z0-9_]+/i
];

const FALLBACK_MESSAGE =
  "I can only answer questions based on your organization's documents.";

export function checkPromptInjection(input: string): GuardrailVerdict {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, reason: 'prompt_injection', message: FALLBACK_MESSAGE };
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        reason: 'prompt_injection',
        message: FALLBACK_MESSAGE
      };
    }
  }
  return { ok: true };
}

export interface ConfidenceInput {
  resultCount: number;
  topScore: number;
  averageScore: number;
}

export function checkConfidence(
  input: ConfidenceInput,
  threshold: { minResults: number; minAverage: number; minTop: number }
): GuardrailVerdict {
  if (input.resultCount === 0 || input.topScore < threshold.minTop) {
    return {
      ok: false,
      reason: 'out_of_scope',
      message: FALLBACK_MESSAGE
    };
  }
  if (input.resultCount < threshold.minResults || input.averageScore < threshold.minAverage) {
    return {
      ok: false,
      reason: 'low_confidence',
      message: FALLBACK_MESSAGE
    };
  }
  return { ok: true };
}

export const guardrailFallbackMessage = FALLBACK_MESSAGE;
