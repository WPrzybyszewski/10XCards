import { describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@/db/supabase.client";
import { POST } from "./index";

const validCategoryId = "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b";

function createSupabaseMock() {
  const categoryMaybeSingle = vi.fn();
  const categoryEq = vi.fn(() => ({ maybeSingle: categoryMaybeSingle }));
  const categorySelect = vi.fn(() => ({ eq: categoryEq }));

  const flashcardSingle = vi.fn();
  const flashcardSelect = vi.fn(() => ({ single: flashcardSingle }));
  const flashcardInsert = vi.fn(() => ({ select: flashcardSelect }));

  const from = vi.fn((table: string) => {
    if (table === "categories") {
      return {
        select: categorySelect,
      };
    }

    if (table === "flashcards") {
      return {
        insert: flashcardInsert,
      };
    }

    throw new Error(`Unexpected table "${table}" in flashcards POST handler tests.`);
  });

  const supabase = {
    from,
  } as unknown as SupabaseClient;

  return {
    supabase,
    categoryMaybeSingle,
    flashcardSingle,
  };
}

function createContext(options: {
  body?: unknown;
  supabase?: SupabaseClient;
  sessionUserId?: string | null;
}) {
  const { body, supabase, sessionUserId } = options;
  const request = new Request("http://localhost/api/v1/flashcards", {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });

  return {
    request,
    url: new URL(request.url),
    locals: {
      supabase,
      session: sessionUserId ? { user: { id: sessionUserId } } : undefined,
    },
  } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/v1/flashcards", () => {
  it("creates flashcard and returns 201 on success", async () => {
    const { supabase, categoryMaybeSingle, flashcardSingle } = createSupabaseMock();

    categoryMaybeSingle.mockResolvedValue({
      data: { id: validCategoryId },
      error: null,
    });

    const dto = {
      id: "flashcard-1",
      category_id: validCategoryId,
      front: "Front",
      back: "Back",
      source: "manual",
      created_at: "2025-11-15T10:00:00.000Z",
      updated_at: "2025-11-15T10:00:00.000Z",
    };

    flashcardSingle.mockResolvedValue({
      data: dto,
      error: null,
    });

    const response = await POST(
      createContext({
        body: {
          category_id: validCategoryId,
          front: "Front",
          back: "Back",
        },
        supabase,
        sessionUserId: "user-1",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(dto);
  });

  it("returns 400 when body is invalid", async () => {
    const response = await POST(
      createContext({
        body: {
          category_id: "not-uuid",
          front: "",
          back: "",
        },
        supabase: {
          from: vi.fn(),
        } as unknown as SupabaseClient,
        sessionUserId: "user-1",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "Bad Request",
    });
  });

  it("returns 401 when session is missing", async () => {
    const { supabase } = createSupabaseMock();

    const response = await POST(
      createContext({
        body: {
          category_id: "9d4d1c73-6b65-4b57-8130-3b8b9f844f6b",
          front: "Front",
          back: "Back",
        },
        supabase,
        sessionUserId: null,
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "Unauthorized",
      message: "You must be signed in to create flashcards.",
    });
  });

  it("returns 404 when category is not found", async () => {
    const { supabase, categoryMaybeSingle } = createSupabaseMock();

    categoryMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const response = await POST(
      createContext({
        body: {
          category_id: validCategoryId,
          front: "Front",
          back: "Back",
        },
        supabase,
        sessionUserId: "user-1",
      }),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "Not Found",
      message: "Category not found.",
    });
  });

  it("returns 500 when createFlashcard fails", async () => {
    const { supabase, categoryMaybeSingle, flashcardSingle } = createSupabaseMock();

    categoryMaybeSingle.mockResolvedValue({
      data: { id: validCategoryId },
      error: null,
    });

    flashcardSingle.mockResolvedValue({
      data: null,
      error: { message: "DB insert error" } as never,
    });

    const response = await POST(
      createContext({
        body: {
          category_id: validCategoryId,
          front: "Front",
          back: "Back",
        },
        supabase,
        sessionUserId: "user-1",
      }),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "Internal Server Error",
    });
  });
});


