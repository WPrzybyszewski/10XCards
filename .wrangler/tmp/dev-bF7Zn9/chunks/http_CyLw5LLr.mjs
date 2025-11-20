globalThis.process ??= {}; globalThis.process.env ??= {};
function createJsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
function createErrorResponse(status, error, message, details) {
  const body = {
    error,
    message,
    ...details ? { details } : {}
  };
  return createJsonResponse(status, body);
}

export { createJsonResponse as a, createErrorResponse as c };
