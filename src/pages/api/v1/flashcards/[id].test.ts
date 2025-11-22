import { afterEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@/db/supabase.client";

vi.mock("@/lib/services/flashcardService", () => ({
  deleteFlashcard: vi.fn(),
  updateFlashcard: vi.fn(),
}));

import { deleteFlashcard, updateFlashcard } from "@/lib/services/flashcardService";
import { DELETE, PATCH } from "./[id]";

const deleteFlashcardMock = deleteFlashcard as unknown as vi.Mock;
const updateFlashcardMock = updateFlashcard as unknown as vi.Mock;

function createContext(options?: {
  id?: string;
  supabase?: SupabaseClient;
  sessionUserId?: string | null;
}) {
  const {
    id = "3c9ebfd9-78d4-4bf4-9f52-0ed6c9b60e63",
    supabase,
    sessionUserId = "user-1",
  } = options ?? {};

  return {
    params: { id },
    locals: {
      supabase: supabase ?? ({} as SupabaseClient),
      session: sessionUserId ? { user: { id: sessionUserId } } : undefined,
    },
  } as unknown as Parameters<typeof DELETE>[0];
}

function createPatchContext(options?: {
  id?: string;
  body?: unknown;
  rawBody?: string;
  supabase?: SupabaseClient;
  sessionUserId?: string | null;
}) {
  const {
    id = "3c9ebfd9-78d4-4bf4-9f52-0ed6c9b60e63",
    body,
    rawBody,
    supabase,
    sessionUserId = "user-1",
  } = options ?? {};

  const headers: Record<string, string> = {};
  let requestBody: BodyInit | undefined;

  if (rawBody !== undefined) {
    requestBody = rawBody;
    headers["Content-Type"] = "application/json";
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const request = new Request(
    `http://localhost/api/v1/flashcards/${id}`,
    requestBody !== undefined
      ? {
          method: "PATCH",
          body: requestBody,
          headers,
        }
      : {
          method: "PATCH",
        },
  );

  return {
    request,
    params: { id },
    locals: {
      supabase: supabase ?? ({} as SupabaseClient),
      session: sessionUserId ? { user: { id: sessionUserId } } : undefined,
    },
  } as unknown as Parameters<typeof PATCH>[0];
}

function createCategoriesSupabaseMock(result: {
  data: unknown;
  error: unknown;
}) {
  const categoryMaybeSingle = vi.fn().mockResolvedValue(result);
  const categoryEq = vi.fn(() => ({ maybeSingle: categoryMaybeSingle }));
  const categorySelect = vi.fn(() => ({ eq: categoryEq }));
  const from = vi.fn((table: string) => {
    if (table === "categories") {
      return {
        select: categorySelect,
      };
    }

    throw new Error(`Unexpected table "${table}" in flashcards PATCH tests.`);
  });

  const supabase = {
    from,
  } as unknown as SupabaseClient;

  return {
    supabase,
    categoryMaybeSingle,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/v1/flashcards/:id", () => {
  it("returns 204 when flashcard is deleted", async () => {
    deleteFlashcardMock.mockResolvedValue(true);

    const response = await DELETE(createContext());

    expect(response.status).toBe(204);
    expect(deleteFlashcardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "3c9ebfd9-78d4-4bf4-9f52-0ed6c9b60e63",
      }),
    );
  });

  it("returns 400 for invalid id", async () => {
    const response = await DELETE(
      createContext({
        id: "invalid-id",
      }),
    );

    expect(response.status).toBe(400);
    expect(deleteFlashcardMock).not.toHaveBeenCalled();
  });

  it("returns 401 when session is missing", async () => {
    const response = await DELETE(
      createContext({
        sessionUserId: null,
      }),
    );

    expect(response.status).toBe(401);
    expect(deleteFlashcardMock).not.toHaveBeenCalled();
  });

  it("returns 404 when flashcard is not found", async () => {
    deleteFlashcardMock.mockResolvedValue(false);

    const response = await DELETE(createContext());

    expect(response.status).toBe(404);
  });

  it("returns 500 when deleteFlashcard throws", async () => {
    deleteFlashcardMock.mockRejectedValue(new Error("DB failure"));

    const response = await DELETE(createContext());

    expect(response.status).toBe(500);
  });
});

describe("PATCH /api/v1/flashcards/:id", () => {
  it("returns 200 with updated flashcard", async () => {
    const dto = {
      id: "flashcard-1",
      category_id: "category-1",
      front: "Updated front",
      back: "Back",
      source: "manual",
      created_at: "2025-11-15T10:00:00.000Z",
      updated_at: "2025-11-15T11:00:00.000Z",
    };

    updateFlashcardMock.mockResolvedValue(dto);

    const response = await PATCH(
      createPatchContext({
        body: { front: "Updated front" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(dto);
    expect(updateFlashcardMock).toHaveBeenCalled();
  });

  it("returns 400 when params id is invalid", async () => {
    const response = await PATCH(
      createPatchContext({
        id: "invalid",
        body: { front: "Front" },
      }),
    );

    expect(response.status).toBe(400);
    expect(updateFlashcardMock).not.toHaveBeenCalled();
  });

  it("returns 400 when body is empty", async () => {
    const response = await PATCH(
      createPatchContext({
        body: {},
      }),
    );

    expect(response.status).toBe(400);
    expect(updateFlashcardMock).not.toHaveBeenCalled();
  });

  it("returns 400 when body is invalid JSON", async () => {
    const response = await PATCH(
      createPatchContext({
        rawBody: '{"invalid"',
      }),
    );

    expect(response.status).toBe(400);
    expect(updateFlashcardMock).not.toHaveBeenCalled();
  });

  it("returns 401 when session is missing", async () => {
    const response = await PATCH(
      createPatchContext({
        sessionUserId: null,
        body: { front: "Front" },
      }),
    );

    expect(response.status).toBe(401);
    expect(updateFlashcardMock).not.toHaveBeenCalled();
  });

  it("returns 404 when category is not found", async () => {
    const { supabase } = createCategoriesSupabaseMock({
      data: null,
      error: null,
    });

    const response = await PATCH(
      createPatchContext({
        supabase,
        body: {
          category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
        },
      }),
    );

    expect(response.status).toBe(404);
    expect(updateFlashcardMock).not.toHaveBeenCalled();
  });

  it("returns 500 when category lookup fails", async () => {
    const { supabase } = createCategoriesSupabaseMock({
      data: null,
      error: { message: "DB error" },
    });

    const response = await PATCH(
      createPatchContext({
        supabase,
        body: {
          category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
        },
      }),
    );

    expect(response.status).toBe(500);
    expect(updateFlashcardMock).not.toHaveBeenCalled();
  });

  it("returns 404 when updateFlashcard returns null", async () => {
    updateFlashcardMock.mockResolvedValue(null);

    const response = await PATCH(
      createPatchContext({
        body: { front: "Updated front" },
      }),
    );

    expect(response.status).toBe(404);
  });

  it("returns 500 when updateFlashcard throws", async () => {
    updateFlashcardMock.mockRejectedValue(new Error("DB failure"));

    const response = await PATCH(
      createPatchContext({
        body: { front: "Updated front" },
      }),
    );

    expect(response.status).toBe(500);
  });
});


