import type { OpenRouterService } from '@/lib/openrouter.service';
import { OpenRouterService as OpenRouterServiceImpl } from '@/lib/openrouter.service';

/**
 * Znormalizowany kształt odpowiedzi z warstwy AI.
 * Serwis generatora fiszek operuje na tej strukturze, a nie na surowym formacie Openrouter.
 */
export interface AiFlashcardProposal {
  front: string;
  back: string;
}

export interface RawAiResponse {
  proposals: AiFlashcardProposal[];
}

const FLASHCARD_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
        },
        required: ['front', 'back'],
        additionalProperties: false,
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ['proposals'],
  additionalProperties: false,
};

const FLASHCARD_MODEL_PARAMS = {
  temperature: 0.7,
  max_tokens: 800,
  top_p: 0.9,
} as const;

/**
 * Globalna instancja OpenRouterService dla generowania fiszek.
 * Dzielona pomiędzy wywołaniami HTTP – konfiguracja może być nadpisana w testach.
 */
export const openRouterService = new OpenRouterServiceImpl({
  defaultSystemPrompt:
    'Jesteś asystentem generującym wysokiej jakości fiszki edukacyjne. ' +
    'Zawsze odpowiadasz w formacie JSON zgodnym ze schematem flashcard_proposals bez dodatkowego tekstu.',
  defaultModelParams: FLASHCARD_MODEL_PARAMS,
});

/**
 * Wywołuje OpenRouter w celu wygenerowania propozycji fiszek za pomocą
 * ustrukturyzowanej odpowiedzi JSON Schema.
 *
 * @param input - surowy tekst użytkownika (min. 1 znak po trimie)
 * @param service - opcjonalna instancja OpenRouterService (ułatwia mockowanie)
 */
export async function callOpenrouterForFlashcards(
  input: string,
  service: OpenRouterService = openRouterService,
): Promise<RawAiResponse> {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new Error('Input must not be empty');
  }

  const structuredResponse = await service.sendStructuredChat<RawAiResponse>({
    schemaName: 'flashcard_proposals',
    schema: FLASHCARD_SCHEMA,
    messages: [
      {
        role: 'system',
        content:
          'Jesteś ekspertem od fiszek. Generujesz dokładnie 3 propozycje i zwracasz je w schemacie flashcard_proposals.',
      },
      {
        role: 'user',
        content: trimmedInput,
      },
    ],
    params: {
      ...FLASHCARD_MODEL_PARAMS,
    },
  });

  return {
    proposals: structuredResponse.proposals.map(normalizeProposal),
  };
}

function normalizeProposal(candidate: Partial<AiFlashcardProposal>): AiFlashcardProposal {
  return {
    front: typeof candidate.front === 'string' ? candidate.front : '',
    back: typeof candidate.back === 'string' ? candidate.back : '',
  };
}

