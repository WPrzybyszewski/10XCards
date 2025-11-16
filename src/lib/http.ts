interface ErrorResponseBody {
  error: string;
  message: string;
  details?: unknown;
}

export function createJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function createErrorResponse(
  status: number,
  error: string,
  message: string,
  details?: unknown,
): Response {
  const body: ErrorResponseBody = {
    error,
    message,
    ...(details ? { details } : {}),
  };

  return createJsonResponse(status, body);
}


