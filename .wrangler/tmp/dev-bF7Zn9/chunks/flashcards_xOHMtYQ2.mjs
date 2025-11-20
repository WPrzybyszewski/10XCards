globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, k as stringType } from './astro/server_Df_JRoM_.mjs';

const generateFlashcardsCommandSchema = objectType({
  input: stringType().transform((value) => value.trim()).refine(
    (value) => value.length >= 1e3 && value.length <= 1e4,
    "input must be between 1000 and 10000 characters after trimming"
  )
});
const acceptFlashcardProposalSchema = objectType({
  generation_id: stringType().uuid(),
  proposal_id: stringType().uuid(),
  category_id: stringType().uuid(),
  front: stringType().transform((value) => value.trim()).refine(
    (value) => value.length >= 1 && value.length <= 200,
    "front must be between 1 and 200 characters after trimming."
  ),
  back: stringType().transform((value) => value.trim()).refine(
    (value) => value.length >= 1 && value.length <= 500,
    "back must be between 1 and 500 characters after trimming."
  )
});
const listFlashcardsQuerySchema = objectType({
  category_id: stringType().uuid().optional(),
  limit: stringType().optional().transform((value) => {
    if (value == null || value === "") {
      return 50;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return NaN;
    }
    return parsed;
  }).refine((value) => Number.isInteger(value) && value >= 1 && value <= 200, {
    message: "limit must be between 1 and 200.",
    path: ["limit"]
  }),
  offset: stringType().optional().transform((value) => {
    if (value == null || value === "") {
      return 0;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return NaN;
    }
    return parsed;
  }).refine((value) => Number.isInteger(value) && value >= 0, {
    message: "offset must be greater than or equal to 0.",
    path: ["offset"]
  }),
  order: stringType().optional().transform((value) => {
    if (value == null || value === "") {
      return "created_desc";
    }
    return value;
  }).refine(
    (value) => value === "created_desc" || value === "created_asc",
    {
      message: "order must be either 'created_desc' or 'created_asc'.",
      path: ["order"]
    }
  )
}).transform(({ category_id, limit, offset, order }) => ({
  category_id,
  limit,
  offset,
  order
}));

export { acceptFlashcardProposalSchema as a, generateFlashcardsCommandSchema as g, listFlashcardsQuerySchema as l };
