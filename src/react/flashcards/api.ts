import type {
  CategoryDTO,
  CreateFlashcardCommand,
  FlashcardDTO,
  ListFlashcardsResponseDTO,
  UpdateFlashcardCommand,
} from "@/types";

import type { FlashcardsApi, FlashcardsApiParams } from "./types";

interface ErrorBody {
  error?: string;
  message?: string;
  details?: unknown;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Nieprawidłowa odpowiedź z serwera.");
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return parseJson<T>(response);
  }

  let message = "Wystąpił nieoczekiwany błąd.";
  try {
    const body = (await parseJson<ErrorBody>(response)) ?? {};
    message = body.message ?? message;
  } catch (error) {
    console.error("Nie udało się sparsować błędu API", error);
  }

  throw new Error(message);
}

async function handleNoContent(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  let message = "Wystąpił nieoczekiwany błąd.";
  try {
    const body = (await parseJson<ErrorBody>(response)) ?? {};
    message = body.message ?? message;
  } catch (error) {
    console.error("Nie udało się sparsować błędu API", error);
  }

  throw new Error(message);
}

const buildQueryString = (params: FlashcardsApiParams): string => {
  const searchParams = new URLSearchParams();

  if (params.limit != null) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset != null) {
    searchParams.set("offset", String(params.offset));
  }
  if (params.order) {
    searchParams.set("order", params.order);
  }
  if (params.category_id) {
    searchParams.set("category_id", params.category_id);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

async function listFlashcards(
  params: FlashcardsApiParams,
): Promise<ListFlashcardsResponseDTO> {
  const query = buildQueryString(params);
  const response = await fetch(`/api/v1/flashcards${query}`, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse<ListFlashcardsResponseDTO>(response);
}

async function createFlashcard(
  command: CreateFlashcardCommand,
): Promise<FlashcardDTO> {
  const response = await fetch("/api/v1/flashcards", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  return handleResponse<FlashcardDTO>(response);
}

async function updateFlashcard(
  id: string,
  command: UpdateFlashcardCommand,
): Promise<FlashcardDTO> {
  const response = await fetch(`/api/v1/flashcards/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  return handleResponse<FlashcardDTO>(response);
}

async function deleteFlashcard(id: string): Promise<void> {
  const response = await fetch(`/api/v1/flashcards/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  await handleNoContent(response);
}

async function listCategories(): Promise<CategoryDTO[]> {
  const response = await fetch("/api/v1/categories?limit=100&offset=0", {
    method: "GET",
    credentials: "include",
  });

  const body = await handleResponse<{ items: CategoryDTO[] }>(response);
  return body.items ?? [];
}

export function createFlashcardsApi(): FlashcardsApi {
  return {
    list: listFlashcards,
    create: createFlashcard,
    update: updateFlashcard,
    delete: deleteFlashcard,
    listCategories,
  };
}


