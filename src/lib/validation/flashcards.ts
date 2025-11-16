import { z } from 'zod';

/**
 * Schema walidacji body dla endpointu POST /api/v1/flashcards/generate.
 * Zgodnie z planem:
 * - input: wymagany
 * - długość po trim: 1000–10000 znaków
 */
export const generateFlashcardsCommandSchema = z.object({
  input: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value.length >= 1000 && value.length <= 10000,
      'input must be between 1000 and 10000 characters after trimming',
    ),
});

export type GenerateFlashcardsCommandInput = z.infer<typeof generateFlashcardsCommandSchema>;


