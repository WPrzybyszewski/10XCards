globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createErrorResponse, a as createJsonResponse } from '../../../../chunks/http_CyLw5LLr.mjs';
import { g as generateFlashcardsCommandSchema } from '../../../../chunks/flashcards_xOHMtYQ2.mjs';
export { r as renderers } from '../../../../chunks/_@astro-renderers_SvKBFpRS.mjs';

const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_ENDPOINT = "/chat/completions";
class OpenRouterError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = new.target.name;
  }
}
class DefaultFetchAdapter {
  async fetch(input, init) {
    return fetch(input, init);
  }
  createAbortController() {
    return new AbortController();
  }
  delay(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
class OpenRouterConfigError extends OpenRouterError {
}
class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message = "OpenRouter request timed out", options) {
    super(message, options);
  }
}
class OpenRouterHttpError extends OpenRouterError {
  status;
  statusText;
  body;
  constructor(status, statusText, body) {
    super(`OpenRouter request failed with status ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}
class OpenRouterParseError extends OpenRouterError {
  context;
  raw;
  constructor(message, context, raw) {
    super(message);
    this.context = context;
    this.raw = raw;
  }
}
class OpenRouterValidationError extends OpenRouterError {
}
class OpenRouterNetworkError extends OpenRouterError {
}
class OpenRouterService {
  /**
   * @param options Konfiguracja usługi; brakujące wartości są uzupełniane z import.meta.env.
   */
  constructor(options = {}) {
    this.options = options;
    const apiKey = options.apiKey ?? "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";
    if (!apiKey) {
      throw new OpenRouterConfigError("OPENROUTER_API_KEY is not configured");
    }
    const baseUrl = options.baseUrl ?? undefined                                    ?? OPENROUTER_DEFAULT_BASE_URL;
    const defaultModel = options.defaultModel ?? undefined                                         ?? "openai/gpt-4.1-mini";
    this.apiKey = apiKey;
    this.baseUrl = this.sanitizeBaseUrl(baseUrl);
    this.defaultModel = defaultModel;
    this.defaultSystemPrompt = options.defaultSystemPrompt ?? undefined                                                ;
    this.defaultModelParams = options.defaultModelParams ?? {};
    this.requestTimeoutMs = options.requestTimeoutMs ?? this.readTimeoutFromEnv() ?? 2e4;
    this.retryAttempts = Math.max(0, options.retry?.attempts ?? 1);
    this.retryBaseDelay = Math.max(50, options.retry?.baseDelayMs ?? 300);
    this.retryMaxDelay = Math.max(this.retryBaseDelay, options.retry?.maxDelayMs ?? 2e3);
    this.appUrl = options.appUrl ?? undefined                                  ;
    this.appTitle = options.appTitle ?? undefined                                    ;
    this.fetchAdapter = options.fetchAdapter ?? new DefaultFetchAdapter();
  }
  apiKey;
  baseUrl;
  defaultModel;
  defaultSystemPrompt;
  defaultModelParams;
  requestTimeoutMs;
  retryAttempts;
  retryBaseDelay;
  retryMaxDelay;
  appUrl;
  appTitle;
  fetchAdapter;
  getDefaultModel() {
    return this.defaultModel;
  }
  getDefaultSystemPrompt() {
    return this.defaultSystemPrompt;
  }
  /**
   * Wysyła klasyczne żądanie chat completions do OpenRouter.
   * Dba o wstrzyknięcie domyślnego system message, parametrów modelu
   * i kompletnej obsługi błędów/timeoutów.
   */
  async sendChat(request) {
    if (!request.messages?.length) {
      throw new OpenRouterValidationError("OpenRouterChatRequest.messages must not be empty");
    }
    const payload = {
      model: request.model ?? this.defaultModel,
      messages: this.withDefaultSystemMessage(request.messages),
      response_format: request.response_format,
      ...this.buildModelParams(request.params)
    };
    return this.performRequest(payload);
  }
  /**
   * Wysyła żądanie chat completions z wymuszeniem struktury odpowiedzi w formacie JSON Schema.
   * Zwracany wynik jest automatycznie parsowany do typu T.
   */
  async sendStructuredChat(request) {
    const { schemaName, schema, ...rest } = request;
    const response = await this.sendChat({
      ...rest,
      response_format: this.buildJsonSchemaFormat(schemaName, schema)
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new OpenRouterParseError("OpenRouter response does not contain message content");
    }
    return this.parseJsonContent(content, schemaName);
  }
  async performRequest(body) {
    const headers = this.buildHeaders();
    const url = `${this.baseUrl}${OPENROUTER_ENDPOINT}`;
    const attempts = Math.max(1, this.retryAttempts);
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = this.fetchAdapter.createAbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      try {
        const response = await this.fetchAdapter.fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });
        if (!response.ok) {
          const errorBody = await this.safeReadErrorBody(response);
          const httpError = new OpenRouterHttpError(response.status, response.statusText, errorBody);
          if (attempt === attempts || !this.isRetryableStatus(response.status)) {
            throw httpError;
          }
          lastError = httpError;
        } else {
          const data = await this.safeParseJson(response);
          return this.validateChatResponse(data);
        }
      } catch (error) {
        const normalizedError = this.normalizeRequestError(error);
        if (normalizedError instanceof OpenRouterTimeoutError) {
          if (attempt === attempts) {
            throw normalizedError;
          }
          lastError = normalizedError;
        } else if (normalizedError instanceof OpenRouterNetworkError) {
          if (attempt === attempts) {
            throw normalizedError;
          }
          lastError = normalizedError;
        } else {
          throw normalizedError;
        }
      } finally {
        clearTimeout(timeoutId);
      }
      await this.fetchAdapter.delay(this.computeBackoffDelay(attempt));
    }
    throw lastError instanceof Error ? lastError : new OpenRouterError("Unknown error when calling OpenRouter");
  }
  buildHeaders() {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`
    };
    if (this.appUrl) {
      headers["HTTP-Referer"] = this.appUrl;
    }
    if (this.appTitle) {
      headers["X-Title"] = this.appTitle;
    }
    return headers;
  }
  withDefaultSystemMessage(messages) {
    if (!this.defaultSystemPrompt) {
      return messages;
    }
    const hasSystemMessage = messages.some((message) => message.role === "system");
    if (hasSystemMessage) {
      return messages;
    }
    return [{ role: "system", content: this.defaultSystemPrompt }, ...messages];
  }
  buildModelParams(params) {
    const merged = {
      ...this.defaultModelParams,
      ...params
    };
    const validated = {};
    if (merged.temperature !== void 0) {
      if (merged.temperature < 0 || merged.temperature > 2) {
        throw new OpenRouterValidationError("temperature must be between 0 and 2");
      }
      validated.temperature = merged.temperature;
    }
    if (merged.max_tokens !== void 0) {
      if (!Number.isFinite(merged.max_tokens) || merged.max_tokens <= 0) {
        throw new OpenRouterValidationError("max_tokens must be a positive number");
      }
      validated.max_tokens = merged.max_tokens;
    }
    if (merged.top_p !== void 0) {
      if (merged.top_p <= 0 || merged.top_p > 1) {
        throw new OpenRouterValidationError("top_p must be between 0 and 1");
      }
      validated.top_p = merged.top_p;
    }
    if (merged.presence_penalty !== void 0) {
      if (merged.presence_penalty < -2 || merged.presence_penalty > 2) {
        throw new OpenRouterValidationError("presence_penalty must be between -2 and 2");
      }
      validated.presence_penalty = merged.presence_penalty;
    }
    if (merged.frequency_penalty !== void 0) {
      if (merged.frequency_penalty < -2 || merged.frequency_penalty > 2) {
        throw new OpenRouterValidationError("frequency_penalty must be between -2 and 2");
      }
      validated.frequency_penalty = merged.frequency_penalty;
    }
    return validated;
  }
  buildJsonSchemaFormat(schemaName, schema) {
    if (!schemaName.trim()) {
      throw new OpenRouterValidationError("schemaName must not be empty");
    }
    return {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema
      }
    };
  }
  validateChatResponse(data) {
    if (!data || typeof data !== "object") {
      throw new OpenRouterParseError("OpenRouter response is not an object");
    }
    const response = data;
    if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      throw new OpenRouterParseError("OpenRouter response does not contain choices");
    }
    const firstChoice = response.choices[0];
    if (!firstChoice?.message?.content) {
      throw new OpenRouterParseError("OpenRouter response does not contain message content");
    }
    return response;
  }
  parseJsonContent(content, context) {
    try {
      return JSON.parse(content);
    } catch {
      const sample = content.slice(0, 1e3);
      throw new OpenRouterParseError("Failed to parse OpenRouter content as JSON", context, sample);
    }
  }
  normalizeRequestError(error) {
    if (error instanceof OpenRouterError) {
      return error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      return new OpenRouterTimeoutError();
    }
    if (error instanceof Error) {
      return new OpenRouterNetworkError(error.message, { cause: error });
    }
    return new OpenRouterNetworkError("Unknown network error");
  }
  isRetryableStatus(status) {
    if (status === 429) {
      return true;
    }
    return status >= 500 && status < 600;
  }
  computeBackoffDelay(attempt) {
    const delay = this.retryBaseDelay * 2 ** (attempt - 1);
    return Math.min(delay, this.retryMaxDelay);
  }
  sanitizeBaseUrl(baseUrl) {
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }
  async safeParseJson(response) {
    const raw = await response.text();
    if (!raw) {
      throw new OpenRouterParseError("OpenRouter response body is empty");
    }
    try {
      return JSON.parse(raw);
    } catch {
      throw new OpenRouterParseError("Failed to parse OpenRouter JSON response", void 0, raw.slice(0, 1e3));
    }
  }
  async safeReadErrorBody(response) {
    const contentType = response.headers.get("content-type");
    try {
      if (contentType?.includes("application/json")) {
        return await response.json();
      }
      const text = await response.text();
      return text.slice(0, 1e3);
    } catch {
      return null;
    }
  }
  readTimeoutFromEnv() {
    {
      return void 0;
    }
  }
}

const FLASHCARD_SCHEMA = {
  type: "object",
  properties: {
    proposals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" }
        },
        required: ["front", "back"],
        additionalProperties: false
      },
      minItems: 3,
      maxItems: 3
    }
  },
  required: ["proposals"],
  additionalProperties: false
};
const FLASHCARD_MODEL_PARAMS = {
  temperature: 0.7,
  max_tokens: 800,
  top_p: 0.9
};
const openRouterService = new OpenRouterService({
  defaultSystemPrompt: "Jesteś asystentem generującym wysokiej jakości fiszki edukacyjne. Zawsze odpowiadasz w formacie JSON zgodnym ze schematem flashcard_proposals bez dodatkowego tekstu.",
  defaultModelParams: FLASHCARD_MODEL_PARAMS
});
async function callOpenrouterForFlashcards(input, service = openRouterService) {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new Error("Input must not be empty");
  }
  const structuredResponse = await service.sendStructuredChat({
    schemaName: "flashcard_proposals",
    schema: FLASHCARD_SCHEMA,
    messages: [
      {
        role: "system",
        content: "Jesteś ekspertem od fiszek. Generujesz dokładnie 3 propozycje i zwracasz je w schemacie flashcard_proposals."
      },
      {
        role: "user",
        content: trimmedInput
      }
    ],
    params: {
      ...FLASHCARD_MODEL_PARAMS
    }
  });
  return {
    proposals: structuredResponse.proposals.map(normalizeProposal)
  };
}
function normalizeProposal(candidate) {
  return {
    front: typeof candidate.front === "string" ? candidate.front : "",
    back: typeof candidate.back === "string" ? candidate.back : ""
  };
}

class AiProviderError extends Error {
  constructor(message = "AI provider error") {
    super(message);
    this.name = "AiProviderError";
  }
}
class AiOutputValidationError extends Error {
  constructor(message = "AI output validation error") {
    super(message);
    this.name = "AiOutputValidationError";
  }
}
async function logGenerationError({
  supabase,
  userId,
  generationId,
  errorCode,
  errorMessage
}) {
  const truncatedMessage = errorMessage.length > 1e3 ? errorMessage.slice(0, 1e3) : errorMessage;
  const { error } = await supabase.from("generation_error_logs").insert({
    user_id: userId,
    generation_id: null,
    error_code: errorCode,
    error_message: truncatedMessage
  });
  if (error) {
    console.error("Failed to log generation error", error);
  }
}
async function generateFlashcardsFromInput({
  supabase,
  userId,
  input
}) {
  let proposalsFromAi;
  try {
    const aiResponse = await callOpenrouterForFlashcards(input);
    proposalsFromAi = aiResponse.proposals;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI provider error";
    await logGenerationError({
      supabase,
      userId,
      generationId: null,
      errorCode: "AI_PROVIDER_ERROR",
      errorMessage: message
    });
    throw new AiProviderError("AI generation failed");
  }
  let normalizedProposals;
  try {
    if (!Array.isArray(proposalsFromAi) || proposalsFromAi.length !== 3) {
      throw new AiOutputValidationError("AI must return exactly 3 proposals");
    }
    normalizedProposals = proposalsFromAi.map((proposal, index) => {
      const front = proposal.front?.trim() ?? "";
      const back = proposal.back?.trim() ?? "";
      if (front.length === 0 || front.length > 200) {
        throw new AiOutputValidationError(`Proposal ${index} has invalid front length`);
      }
      if (back.length === 0 || back.length > 500) {
        throw new AiOutputValidationError(`Proposal ${index} has invalid back length`);
      }
      if (index < 0 || index > 2) {
        throw new AiOutputValidationError(`Proposal index ${index} is out of range 0–2`);
      }
      return { front, back, index };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI output validation error";
    await logGenerationError({
      supabase,
      userId,
      generationId: null,
      errorCode: "AI_OUTPUT_VALIDATION_ERROR",
      errorMessage: message
    });
    throw new AiProviderError("AI generation failed");
  }
  const { data: generation, error: generationError } = await supabase.from("generations").insert({
    user_id: userId,
    input
  }).select("*").single();
  if (generationError || !generation) {
    throw new Error(generationError?.message ?? "Failed to create generation");
  }
  const generationId = generation.id;
  const proposalsToInsert = normalizedProposals.map((proposal) => ({
    generation_id: generationId,
    index: proposal.index,
    front: proposal.front,
    back: proposal.back
  }));
  const { data: proposalRows, error: proposalsError } = await supabase.from("generation_proposals").insert(proposalsToInsert).select("*").returns();
  if (proposalsError || !proposalRows) {
    throw new Error(proposalsError?.message ?? "Failed to create generation proposals");
  }
  const proposalsDto = proposalRows.map((proposal) => ({
    id: proposal.id,
    index: proposal.index,
    front: proposal.front,
    back: proposal.back
  }));
  return {
    generation_id: generationId,
    proposals: proposalsDto
  };
}

async function POST(context) {
  const { request, locals } = context;
  const supabase = locals.supabase;
  if (!supabase) {
    return createErrorResponse(500, "Internal Server Error", "Supabase client not available.");
  }
  const userId = "11111111-1111-1111-1111-111111111111";
  let jsonBody;
  try {
    jsonBody = await request.json();
  } catch {
    return createErrorResponse(400, "Bad Request", "Invalid JSON body.");
  }
  const parseResult = generateFlashcardsCommandSchema.safeParse(jsonBody);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse(400, "Bad Request", firstIssue.message, {
      field: firstIssue.path.join("."),
      issues: parseResult.error.issues
    });
  }
  const { input } = parseResult.data;
  try {
    const result = await generateFlashcardsFromInput({
      supabase,
      userId,
      input
    });
    return createJsonResponse(200, result);
  } catch (error) {
    if (error instanceof AiProviderError) {
      return createErrorResponse(
        502,
        "Bad Gateway",
        "AI generation failed, please try again later."
      );
    }
    console.error("Unexpected error in POST /api/v1/flashcards/generate", error);
    return createErrorResponse(
      500,
      "Internal Server Error",
      "Internal server error."
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
