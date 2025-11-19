import type {
  AcceptFlashcardProposalCommand,
  AcceptFlashcardProposalResponseDTO,
  CategoryDTO,
  GenerateFlashcardsCommand,
  GenerateFlashcardsResponseDTO,
} from "@/types";

import type { GeneratorApi } from "./types";

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

async function getCategories(): Promise<CategoryDTO[]> {
  const response = await fetch("/api/v1/categories?limit=100&offset=0", {
    method: "GET",
    credentials: "include",
  });

  const body = await handleResponse<{
    items: CategoryDTO[];
  }>(response);

  return body.items ?? [];
}

async function postGenerate(
  command: GenerateFlashcardsCommand,
): Promise<GenerateFlashcardsResponseDTO> {
  const response = await fetch("/api/v1/flashcards/generate", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  return handleResponse<GenerateFlashcardsResponseDTO>(response);
}

async function postAccept(
  command: AcceptFlashcardProposalCommand,
): Promise<AcceptFlashcardProposalResponseDTO> {
  const response = await fetch("/api/v1/flashcards/accept", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  return handleResponse<AcceptFlashcardProposalResponseDTO>(response);
}

export function createGeneratorApi(): GeneratorApi {
  return {
    generate: postGenerate,
    accept: postAccept,
    listCategories: getCategories,
  };
}

