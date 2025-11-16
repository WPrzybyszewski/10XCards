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

interface OpenrouterChoice {
  message?: {
    role?: string;
    content?: string;
  };
}

interface OpenrouterResponse {
  choices?: OpenrouterChoice[];
}

/**
 * Wywołuje Openrouter w celu wygenerowania propozycji fiszek.
 *
 * Założenia:
 * - Model zwraca treść w formacie JSON:
 *   { "proposals": [ { "front": "...", "back": "..." }, ... ] }
 * - Walidacja liczby i długości propozycji jest wykonywana w serwisie domenowym.
 * - Błędy sieciowe/HTTP/parsowania są reprezentowane jako zwykłe Error i
 *   mapowane na AiProviderError w warstwie serwisu.
 */
export async function callOpenrouterForFlashcards(input: string): Promise<RawAiResponse> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout na request

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'Jesteś asystentem generującym propozycje fiszek. Zwróć dokładnie 3 propozycje w formacie JSON: {"proposals":[{"front":"...","back":"..."},...]} bez dodatkowego tekstu.',
          },
          {
            role: 'user',
            content: input,
          },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Openrouter request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OpenrouterResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Openrouter response does not contain message content');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('Failed to parse Openrouter content as JSON');
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('proposals' in parsed) ||
      !Array.isArray((parsed as { proposals: unknown }).proposals)
    ) {
      throw new Error('Parsed Openrouter JSON does not contain a valid "proposals" array');
    }

    const proposals: AiFlashcardProposal[] = (parsed as { proposals: any[] }).proposals.map(
      (item) => ({
        front: typeof item.front === 'string' ? item.front : '',
        back: typeof item.back === 'string' ? item.back : '',
      }),
    );

    return { proposals };
  } catch (error) {
    // Błąd (timeout, HTTP, parse) zostanie obsłużony i zmapowany w serwisie domenowym.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Openrouter request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


