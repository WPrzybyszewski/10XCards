import { describe, expect, it } from "vitest";

import {
  createFlashcardBodySchema,
  deleteFlashcardParamsSchema,
  updateFlashcardBodySchema,
  updateFlashcardParamsSchema,
} from "./flashcards";

describe("createFlashcardBodySchema", () => {
  it("returns trimmed payload when values are valid", () => {
    const result = createFlashcardBodySchema.parse({
      category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
      front: "  What is AI? ",
      back: "  The field of building intelligent systems.   ",
    });

    expect(result).toEqual({
      category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
      front: "What is AI?",
      back: "The field of building intelligent systems.",
    });
  });

  it("rejects non-uuid category_id", () => {
    const { success, error } = createFlashcardBodySchema.safeParse({
      category_id: "not-a-uuid",
      front: "Valid front",
      back: "Valid back",
    });

    expect(success).toBe(false);
    expect(error?.issues[0]).toMatchObject({
      message: "Invalid uuid",
      path: ["category_id"],
    });
  });

  it("rejects front shorter than 1 char after trimming", () => {
    const { success, error } = createFlashcardBodySchema.safeParse({
      category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
      front: "   ",
      back: "Valid back",
    });

    expect(success).toBe(false);
    expect(error?.issues[0]).toMatchObject({
      message: "front must be between 1 and 200 characters after trimming.",
      path: ["front"],
    });
  });

  it("rejects back longer than 500 chars after trimming", () => {
    const longBack = "a".repeat(501);
    const { success, error } = createFlashcardBodySchema.safeParse({
      category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
      front: "Front",
      back: longBack,
    });

    expect(success).toBe(false);
    expect(error?.issues[0]).toMatchObject({
      message: "back must be between 1 and 500 characters after trimming.",
      path: ["back"],
    });
  });
});

describe("deleteFlashcardParamsSchema", () => {
  it("accepts valid uuid id", () => {
    const result = deleteFlashcardParamsSchema.parse({
      id: "3c9ebfd9-78d4-4bf4-9f52-0ed6c9b60e63",
    });

    expect(result).toEqual({
      id: "3c9ebfd9-78d4-4bf4-9f52-0ed6c9b60e63",
    });
  });

  it("rejects invalid uuid id", () => {
    const { success, error } = deleteFlashcardParamsSchema.safeParse({
      id: "not-uuid",
    });

    expect(success).toBe(false);
    expect(error?.issues[0]).toMatchObject({
      path: ["id"],
      message: "Invalid uuid",
    });
  });
});

describe("updateFlashcardParamsSchema", () => {
  it("accepts valid id", () => {
    const result = updateFlashcardParamsSchema.parse({
      id: "e25ed017-5d2f-4f51-a3f3-672f5f6c3f6a",
    });

    expect(result).toEqual({
      id: "e25ed017-5d2f-4f51-a3f3-672f5f6c3f6a",
    });
  });

  it("rejects invalid id", () => {
    const { success, error } = updateFlashcardParamsSchema.safeParse({
      id: "invalid",
    });

    expect(success).toBe(false);
    expect(error?.issues[0]).toMatchObject({
      path: ["id"],
      message: "Invalid uuid",
    });
  });
});

describe("updateFlashcardBodySchema", () => {
  it("accepts payload with trimmed front and back", () => {
    const result = updateFlashcardBodySchema.parse({
      front: "  Updated front ",
      back: " Updated back ",
    });

    expect(result).toEqual({
      front: "Updated front",
      back: "Updated back",
    });
  });

  it("accepts payload with category only", () => {
    const result = updateFlashcardBodySchema.parse({
      category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
    });

    expect(result).toEqual({
      category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
    });
  });

  it("rejects payload with no fields", () => {
    const { success, error } = updateFlashcardBodySchema.safeParse({});

    expect(success).toBe(false);
    expect(error?.issues[0]).toMatchObject({
      message: "At least one of category_id, front or back must be provided.",
    });
  });

  it("rejects front longer than 200 chars", () => {
    const longFront = "a".repeat(201);
    const { success, error } = updateFlashcardBodySchema.safeParse({
      front: longFront,
    });

    expect(success).toBe(false);
    expect(error?.issues[0]).toMatchObject({
      path: ["front"],
    });
  });

  it("rejects back longer than 500 chars", () => {
    const longBack = "a".repeat(501);
    const { success, error } = updateFlashcardBodySchema.safeParse({
      back: longBack,
    });

    expect(success).toBe(false);
    expect(error?.issues[0]).toMatchObject({
      path: ["back"],
    });
  });
});


