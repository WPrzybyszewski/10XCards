import { z } from "zod";

/**
 * Schema walidacji body dla endpointu POST /api/v1/categories.
 *
 * Zgodnie z planem:
 * - name: wymagane
 * - po trim(): długość 1–100 znaków
 */
export const createCategoryCommandSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value.length >= 1 && value.length <= 100,
      "name must be between 1 and 100 characters after trimming.",
    ),
});

export type CreateCategoryCommandInput = z.infer<
  typeof createCategoryCommandSchema
>;

/**
 * Schema walidacji parametrów query dla endpointu GET /api/v1/categories.
 *
 * Przyjmuje wartości z URLSearchParams (string | null | undefined),
 * transformuje na liczby z domyślnymi wartościami i waliduje zakres.
 */
export const listCategoriesQuerySchema = z
  .object({
    limit: z
      .string()
      .nullable()
      .optional()
      .transform((value) => {
        if (value == null || value === "") {
          return 100;
        }

        const parsed = Number(value);

        if (Number.isNaN(parsed)) {
          return NaN;
        }

        return parsed;
      })
      .refine((value) => Number.isInteger(value) && value >= 1 && value <= 500, {
        message: "limit must be between 1 and 500.",
        path: ["limit"],
      }),
    offset: z
      .string()
      .nullable()
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
  })
  .transform(({ limit, offset }) => ({
    limit,
    offset,
  }));

export type ListCategoriesQueryInput = z.infer<typeof listCategoriesQuerySchema>;

