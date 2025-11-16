import type {
  GenerationEntity,
  GenerationProposalDTO,
  GenerationProposalEntity,
  GenerateFlashcardsResponseDTO,
} from '@/types';
import type { SupabaseClient } from '@/db/supabase.client';

import { callOpenrouterForFlashcards } from '@/lib/services/ai/openrouterClient';

/**
 * Błąd reprezentujący problem po stronie dostawcy AI (sieć, timeout, nieprawidłowy response, itp.).
 * Handler HTTP mapuje go na status 502.
 */
export class AiProviderError extends Error {
  constructor(message = 'AI provider error') {
    super(message);
    this.name = 'AiProviderError';
  }
}

/**
 * Błąd reprezentujący przypadek, w którym AI zwróciło dane
 * formalnie poprawne (bez błędu HTTP), ale niezgodne z naszym kontraktem
 * (np. zła liczba propozycji lub długości front/back).
 * Traktujemy to również jako błąd dostawcy AI (502).
 */
export class AiOutputValidationError extends Error {
  constructor(message = 'AI output validation error') {
    super(message);
    this.name = 'AiOutputValidationError';
  }
}

interface GenerateFlashcardsParams {
  supabase: SupabaseClient;
  userId: string;
  input: string;
}

interface LogGenerationErrorParams {
  supabase: SupabaseClient;
  userId: string;
  generationId?: string | null;
  errorCode: string;
  errorMessage: string;
}

/**
 * Loguje błąd związany z generowaniem fiszek do tabeli `generation_error_logs`.
 * Używane głównie dla błędów dostawcy AI (Openrouter).
 */
async function logGenerationError({
  supabase,
  userId,
  generationId,
  errorCode,
  errorMessage,
}: LogGenerationErrorParams): Promise<void> {
  const truncatedMessage = errorMessage.length > 1000 ? errorMessage.slice(0, 1000) : errorMessage;

  // W przypadku błędu logowania nie przerywamy głównego flow – błąd jest tylko logowany w konsoli.
  const { error } = await supabase.from('generation_error_logs').insert({
    user_id: userId,
    generation_id: generationId ?? null,
    error_code: errorCode,
    error_message: truncatedMessage,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to log generation error', error);
  }
}

/**
 * Główna funkcja domenowa dla endpointu POST /api/v1/flashcards/generate.
 *
 * - Wywołuje Openrouter w celu wygenerowania propozycji fiszek.
 * - Waliduje i normalizuje propozycje (3 sztuki, długości front/back).
 * - Tworzy rekord `generations` i trzy rekordy `generation_proposals`.
 * - Zwraca DTO zgodne z `GenerateFlashcardsResponseDTO`.
 */
export async function generateFlashcardsFromInput({
  supabase,
  userId,
  input,
}: GenerateFlashcardsParams): Promise<GenerateFlashcardsResponseDTO> {
  // 1. Wywołanie AI z obsługą błędów i logowaniem do generation_error_logs
  let proposalsFromAi: { front: string; back: string }[];

  try {
    const aiResponse = await callOpenrouterForFlashcards(input);
    proposalsFromAi = aiResponse.proposals;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI provider error';

    await logGenerationError({
      supabase,
      userId,
      generationId: null,
      errorCode: 'AI_PROVIDER_ERROR',
      errorMessage: message,
    });

    throw new AiProviderError('AI generation failed');
  }

  // 2. Walidacja i normalizacja propozycji
  let normalizedProposals: { front: string; back: string; index: number }[];

  try {
    if (!Array.isArray(proposalsFromAi) || proposalsFromAi.length !== 3) {
      throw new AiOutputValidationError('AI must return exactly 3 proposals');
    }

    normalizedProposals = proposalsFromAi.map((proposal, index) => {
      const front = proposal.front?.trim() ?? '';
      const back = proposal.back?.trim() ?? '';

      if (front.length === 0 || front.length > 200) {
        throw new AiOutputValidationError(`Proposal ${index} has invalid front length`);
      }

      if (back.length === 0 || back.length > 500) {
        throw new AiOutputValidationError(`Proposal ${index} has invalid back length`);
      }

      if (index < 0 || index > 2) {
        throw new AiOutputValidationError(`Proposal index ${index} is out of range 0–2`);
      }

      return { front, back, index };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI output validation error';

    await logGenerationError({
      supabase,
      userId,
      generationId: null,
      errorCode: 'AI_OUTPUT_VALIDATION_ERROR',
      errorMessage: message,
    });

    // Dla handlera HTTP traktujemy to tak samo jak error dostawcy AI (502).
    throw new AiProviderError('AI generation failed');
  }

  // 3. Utworzenie rekordu w `generations`
  const { data: generation, error: generationError } = await supabase
    .from('generations')
    .insert({
      user_id: userId,
      input,
    })
    .select('*')
    .single<GenerationEntity>();

  if (generationError || !generation) {
    throw new Error(generationError?.message ?? 'Failed to create generation');
  }

  const generationId = generation.id;

  // 4. Utworzenie rekordów w `generation_proposals`
  const proposalsToInsert = normalizedProposals.map((proposal) => ({
    generation_id: generationId,
    index: proposal.index,
    front: proposal.front,
    back: proposal.back,
  }));

  const { data: proposalRows, error: proposalsError } = await supabase
    .from('generation_proposals')
    .insert(proposalsToInsert)
    .select('*') // chcemy otrzymać id propozycji wygenerowane przez DB
    .returns<GenerationProposalEntity[]>();

  if (proposalsError || !proposalRows) {
    throw new Error(proposalsError?.message ?? 'Failed to create generation proposals');
  }

  const proposalsDto: GenerationProposalDTO[] = proposalRows.map((proposal) => ({
    id: proposal.id,
    index: proposal.index,
    front: proposal.front,
    back: proposal.back,
  }));

  return {
    generation_id: generationId,
    proposals: proposalsDto,
  };
}


