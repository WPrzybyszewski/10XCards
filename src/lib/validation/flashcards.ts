import { z } from "zod";

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
      "input must be between 1000 and 10000 characters after trimming",
    ),
});

export type GenerateFlashcardsCommandInput = z.infer<
  typeof generateFlashcardsCommandSchema
>;

/**
 * Schema walidacji body dla endpointu POST /api/v1/flashcards/accept.
 * Zgodnie z planem:
 * - generation_id, proposal_id, category_id: wymagane, prawidłowe UUID
 * - front: wymagany, po trim długość 1–200 znaków
 * - back: wymagany, po trim długość 1–500 znaków
 */
export const acceptFlashcardProposalSchema = z.object({
  generation_id: z.string().uuid(),
  proposal_id: z.string().uuid(),
  category_id: z.string().uuid(),
  front: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value.length >= 1 && value.length <= 200,
      "front must be between 1 and 200 characters after trimming.",
    ),
  back: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value.length >= 1 && value.length <= 500,
      "back must be between 1 and 500 characters after trimming.",
    ),
});

export type AcceptFlashcardProposalInput = z.infer<
  typeof acceptFlashcardProposalSchema
>;

/**
 * Schema walidacji body dla endpointu POST /api/v1/flashcards (manual create).
 * Sprawdza UUID kategorii oraz długości front/back po trimie.
 */
export const createFlashcardBodySchema = z.object({
  category_id: z.string().uuid(),
  front: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value.length >= 1 && value.length <= 200,
      "front must be between 1 and 200 characters after trimming.",
    ),
  back: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value.length >= 1 && value.length <= 500,
      "back must be between 1 and 500 characters after trimming.",
    ),
});

export type CreateFlashcardBodyInput = z.infer<
  typeof createFlashcardBodySchema
>;

/**
 * Schema walidacji parametrów ścieżki dla endpointu DELETE /api/v1/flashcards/:id.
 */
export const deleteFlashcardParamsSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteFlashcardParamsInput = z.infer<
  typeof deleteFlashcardParamsSchema
>;

/**
 * Schemy walidacji dla endpointu PATCH /api/v1/flashcards/:id.
 */
export const updateFlashcardParamsSchema = z.object({
  id: z.string().uuid(),
});

export type UpdateFlashcardParamsInput = z.infer<
  typeof updateFlashcardParamsSchema
>;

export const updateFlashcardBodySchema = z
  .object({
    category_id: z.string().uuid().optional(),
    front: z
      .string()
      .transform((value) => value.trim())
      .refine(
        (value) => value.length >= 1 && value.length <= 200,
        "front must be between 1 and 200 characters after trimming.",
      )
      .optional(),
    back: z
      .string()
      .transform((value) => value.trim())
      .refine(
        (value) => value.length >= 1 && value.length <= 500,
        "back must be between 1 and 500 characters after trimming.",
      )
      .optional(),
  })
  .refine(
    (value) =>
      value.category_id !== undefined ||
      value.front !== undefined ||
      value.back !== undefined,
    {
      message: "At least one of category_id, front or back must be provided.",
    },
  );

export type UpdateFlashcardBodyInput = z.infer<
  typeof updateFlashcardBodySchema
>;

/**
 * Schema walidacji query dla endpointu GET /api/v1/flashcards/random.
 */
export const randomFlashcardQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
});

export type RandomFlashcardQueryInput = z.infer<
  typeof randomFlashcardQuerySchema
>;

/**
 * Schema walidacji parametrów query dla endpointu GET /api/v1/flashcards.
 *
 * Przyjmuje wartości z URLSearchParams (string | undefined),
 * transformuje na liczby / enum z domyślnymi wartościami i waliduje zakres.
 */
export const listFlashcardsQuerySchema = z
  .object({
    category_id: z.string().uuid().optional(),
    limit: z
      .string()
      .optional()
      .transform((value) => {
        if (value == null || value === "") {
          return 50;
        }

        const parsed = Number(value);

        if (Number.isNaN(parsed)) {
          return NaN;
        }

        return parsed;
      })
      .refine((value) => Number.isInteger(value) && value >= 1 && value <= 200, {
        message: "limit must be between 1 and 200.",
        path: ["limit"],
      }),
    offset: z
      .string()
      .optional()
      .transform((value) => {
        if (value == null || value === "") {
          return 0;
        }

        const parsed = Number(value);

        if (Number.isNaN(parsed)) {
          return NaN;
        }

        return parsed;
      })
      .refine((value) => Number.isInteger(value) && value >= 0, {
        message: "offset must be greater than or equal to 0.",
        path: ["offset"],
      }),
    order: z
      .string()
      .optional()
      .transform((value) => {
        if (value == null || value === "") {
          return "created_desc";
        }

        return value;
      })
      .refine(
        (value) => value === "created_desc" || value === "created_asc",
        {
          message: "order must be either 'created_desc' or 'created_asc'.",
          path: ["order"],
        },
      ),
  })
  .transform(({ category_id, limit, offset, order }) => ({
    category_id,
    limit,
    offset,
    order,
  }));

export type ListFlashcardsQueryInput = z.infer<
  typeof listFlashcardsQuerySchema
>;