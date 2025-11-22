import { describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@/db/supabase.client";
import { createFlashcard, deleteFlashcard, updateFlashcard } from "./flashcardService";

function createSupabaseMock() {
  const flashcardSingle = vi.fn();
  const flashcardSelect = vi.fn(() => ({ single: flashcardSingle }));
  const flashcardInsert = vi.fn(() => ({ select: flashcardSelect }));

  const from = vi.fn((table: string) => {
    if (table === "flashcards") {
      return {
        insert: flashcardInsert,
      };
    }

    throw new Error(`Unexpected table "${table}" in flashcardService tests.`);
  });

  const supabase = {
    from,
  } as unknown as SupabaseClient;

  return {
    supabase,
    from,
    flashcardInsert,
    flashcardSelect,
    flashcardSingle,
  };
}

function createDeleteSupabaseMock() {
  const flashcardMaybeSingle = vi.fn();
  const flashcardSelect = vi.fn(() => ({ maybeSingle: flashcardMaybeSingle }));
  const flashcardEq = vi.fn(() => ({ select: flashcardSelect }));
  const flashcardDelete = vi.fn(() => ({ eq: flashcardEq }));

  const from = vi.fn((table: string) => {
    if (table === "flashcards") {
      return {
        delete: flashcardDelete,
      };
    }

    throw new Error(`Unexpected table "${table}" in flashcardService tests.`);
  });

  const supabase = {
    from,
  } as unknown as SupabaseClient;

  return {
    supabase,
    flashcardMaybeSingle,
    flashcardDelete,
  };
}

function createUpdateSupabaseMock() {
  const flashcardMaybeSingle = vi.fn();
  const flashcardSelect = vi.fn(() => ({ maybeSingle: flashcardMaybeSingle }));
  const flashcardEq = vi.fn(() => ({ select: flashcardSelect }));
  const flashcardUpdate = vi.fn(() => ({ eq: flashcardEq }));

  const from = vi.fn((table: string) => {
    if (table === "flashcards") {
      return {
        update: flashcardUpdate,
      };
    }

    throw new Error(`Unexpected table "${table}" in flashcardService tests.`);
  });

  const supabase = {
    from,
  } as unknown as SupabaseClient;

  return {
    supabase,
    flashcardMaybeSingle,
    flashcardUpdate,
  };
}

describe("createFlashcard service", () => {
  it("persists flashcard and returns DTO on success", async () => {
    const {
      supabase,
      flashcardInsert,
      flashcardSingle,
    } = createSupabaseMock();

    const dto = {
      id: "flashcard-1",
      category_id: "category-1",
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

    const result = await createFlashcard({
      supabase,
      userId: "user-1",
      command: {
        category_id: "category-1",
        front: "Front",
        back: "Back",
      },
    });

    expect(result).toEqual(dto);
    expect(flashcardInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      category_id: "category-1",
      front: "Front",
      back: "Back",
      source: "manual",
    });
  });

  it("throws when Supabase returns an error", async () => {
    const { supabase, flashcardSingle } = createSupabaseMock();

    flashcardSingle.mockResolvedValue({
      data: null,
      error: { message: "DB error" } as never,
    });

    await expect(
      createFlashcard({
        supabase,
        userId: "user-1",
        command: {
          category_id: "category-1",
          front: "Front",
          back: "Back",
        },
      }),
    ).rejects.toThrow("Failed to create flashcard: DB error");
  });
});

describe("deleteFlashcard service", () => {
  it("returns true when flashcard is deleted", async () => {
    const { supabase, flashcardMaybeSingle } = createDeleteSupabaseMock();

    flashcardMaybeSingle.mockResolvedValue({
      data: { id: "flashcard-1" },
      error: null,
    });

    await expect(
      deleteFlashcard({
        supabase,
        userId: "user-1",
        id: "flashcard-1",
      }),
    ).resolves.toBe(true);
  });

  it("returns false when flashcard is not found", async () => {
    const { supabase, flashcardMaybeSingle } = createDeleteSupabaseMock();

    flashcardMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      deleteFlashcard({
        supabase,
        userId: "user-1",
        id: "missing-id",
      }),
    ).resolves.toBe(false);
  });

  it("throws when Supabase returns an error", async () => {
    const { supabase, flashcardMaybeSingle } = createDeleteSupabaseMock();

    flashcardMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "DB delete error" } as never,
    });

    await expect(
      deleteFlashcard({
        supabase,
        userId: "user-1",
        id: "flashcard-1",
      }),
    ).rejects.toThrow("Failed to delete flashcard: DB delete error");
  });
});

describe("updateFlashcard service", () => {
  it("returns updated DTO when Supabase succeeds", async () => {
    const { supabase, flashcardMaybeSingle, flashcardUpdate } =
      createUpdateSupabaseMock();

    const dto = {
      id: "flashcard-1",
      category_id: "category-2",
      front: "Updated front",
      back: "Updated back",
      source: "manual",
      created_at: "2025-11-15T10:00:00.000Z",
      updated_at: "2025-11-15T11:00:00.000Z",
    };

    flashcardMaybeSingle.mockResolvedValue({
      data: dto,
      error: null,
    });

    const result = await updateFlashcard({
      supabase,
      userId: "user-1",
      id: "flashcard-1",
      command: {
        category_id: "category-2",
        front: "Updated front",
      },
    });

    expect(result).toEqual(dto);
    expect(flashcardUpdate).toHaveBeenCalledWith({
      category_id: "category-2",
      front: "Updated front",
    });
  });

  it("returns null when Supabase finds no row", async () => {
    const { supabase, flashcardMaybeSingle } = createUpdateSupabaseMock();

    flashcardMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await updateFlashcard({
      supabase,
      userId: "user-1",
      id: "missing",
      command: {
        back: "Updated back",
      },
    });

    expect(result).toBeNull();
  });

  it("resolves null immediately when command has no fields", async () => {
    const { supabase, flashcardMaybeSingle } = createUpdateSupabaseMock();

    const result = await updateFlashcard({
      supabase,
      userId: "user-1",
      id: "flashcard-1",
      command: {},
    });

    expect(result).toBeNull();
    expect(flashcardMaybeSingle).not.toHaveBeenCalled();
  });

  it("throws when Supabase returns an error", async () => {
    const { supabase, flashcardMaybeSingle } = createUpdateSupabaseMock();

    flashcardMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "DB update error" } as never,
    });

    await expect(
      updateFlashcard({
        supabase,
        userId: "user-1",
        id: "flashcard-1",
        command: {
          front: "Updated front",
        },
      }),
    ).rejects.toThrow("Failed to update flashcard: DB update error");
  });
});


