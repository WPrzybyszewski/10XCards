const OPENROUTER_DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_ENDPOINT = '/chat/completions';

export type OpenRouterMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface OpenRouterMessage {
  role: OpenRouterMessageRole;
  content: string;
}

export interface OpenRouterJsonSchemaFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
}

export type OpenRouterResponseFormat =
  | { type: 'text' }
  | { type: 'json_object' }
  | OpenRouterJsonSchemaFormat;

export type OpenRouterModelParams = {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
};

export interface OpenRouterChatRequest {
  model?: string;
  messages: OpenRouterMessage[];
  response_format?: OpenRouterResponseFormat;
  params?: OpenRouterModelParams;
}

export interface OpenRouterChatChoice {
  index: number;
  message: OpenRouterMessage;
  finish_reason?: string;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterChatResponse {
  id: string;
  model: string;
  created: number;
  choices: OpenRouterChatChoice[];
  usage?: OpenRouterUsage;
  system_fingerprint?: string;
}

/**
 * Rozszerzony request czatu umożliwiający wymuszenie formatu odpowiedzi
 * przez json_schema. Zapewnia, że response_format zawsze będzie poprawnie
 * ustawione przez usługę.
 */
export type OpenRouterStructuredChatRequest = Omit<OpenRouterChatRequest, 'response_format'> & {
  schemaName: string;
  schema: Record<string, unknown>;
};

/**
 * Adapter sieciowy wykorzystywany przez usługę do wykonywania żądań HTTP.
 * Umożliwia wstrzyknięcie mocków w testach jednostkowych.
 */
export interface OpenRouterFetchAdapter {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  createAbortController(): AbortController;
  delay(ms: number): Promise<void>;
}

export interface OpenRouterRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Konfiguracja usługi OpenRouterService.
 *
 * Każde pole może zostać nadpisane w testach lub specyficznych przypadkach użycia,
 * a wartości domyślne są odczytywane ze zmiennych środowiskowych import.meta.env.
 */
export interface OpenRouterServiceOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultSystemPrompt?: string;
  defaultModelParams?: OpenRouterModelParams;
  appUrl?: string;
  appTitle?: string;
  requestTimeoutMs?: number;
  retry?: OpenRouterRetryOptions;
  fetchAdapter?: OpenRouterFetchAdapter;
}

class OpenRouterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/**
 * Produkcyjna implementacja adaptera sieciowego bazująca na globalnym fetchu.
 */
class DefaultFetchAdapter implements OpenRouterFetchAdapter {
  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(input, init);
  }

  createAbortController(): AbortController {
    return new AbortController();
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

export class OpenRouterConfigError extends OpenRouterError {}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message = 'OpenRouter request timed out', options?: ErrorOptions) {
    super(message, options);
  }
}

export class OpenRouterHttpError extends OpenRouterError {
  readonly status: number;
  readonly statusText: string;
  readonly body?: unknown;

  constructor(status: number, statusText: string, body?: unknown) {
    super(`OpenRouter request failed with status ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export class OpenRouterParseError extends OpenRouterError {
  readonly context?: string;
  readonly raw?: string;

  constructor(message: string, context?: string, raw?: string) {
    super(message);
    this.context = context;
    this.raw = raw;
  }
}

export class OpenRouterValidationError extends OpenRouterError {}

export class OpenRouterNetworkError extends OpenRouterError {}

interface OpenRouterChatPayload extends Record<string, unknown> {
  model: string;
  messages: OpenRouterMessage[];
  response_format?: OpenRouterResponseFormat;
}

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultSystemPrompt?: string;
  private readonly defaultModelParams: OpenRouterModelParams;
  private readonly requestTimeoutMs: number;
  private readonly retryAttempts: number;
  private readonly retryBaseDelay: number;
  private readonly retryMaxDelay: number;
  private readonly appUrl?: string;
  private readonly appTitle?: string;
  private readonly fetchAdapter: OpenRouterFetchAdapter;

  /**
   * @param options Konfiguracja usługi; brakujące wartości są uzupełniane z import.meta.env.
   */
  constructor(private readonly options: OpenRouterServiceOptions = {}) {
    const apiKey = options.apiKey ?? import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new OpenRouterConfigError('OPENROUTER_API_KEY is not configured');
    }

    const baseUrl =
      options.baseUrl ?? import.meta.env.OPENROUTER_BASE_URL ?? OPENROUTER_DEFAULT_BASE_URL;
    const defaultModel =
      options.defaultModel ?? import.meta.env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-4.1-mini';

    this.apiKey = apiKey;
    this.baseUrl = this.sanitizeBaseUrl(baseUrl);
    this.defaultModel = defaultModel;
    this.defaultSystemPrompt =
      options.defaultSystemPrompt ?? import.meta.env.OPENROUTER_DEFAULT_SYSTEM_PROMPT;
    this.defaultModelParams = options.defaultModelParams ?? {};
    this.requestTimeoutMs = options.requestTimeoutMs ?? this.readTimeoutFromEnv() ?? 20000;
    this.retryAttempts = Math.max(0, options.retry?.attempts ?? 1);
    this.retryBaseDelay = Math.max(50, options.retry?.baseDelayMs ?? 300);
    this.retryMaxDelay = Math.max(this.retryBaseDelay, options.retry?.maxDelayMs ?? 2000);
    this.appUrl = options.appUrl ?? import.meta.env.OPENROUTER_APP_URL;
    this.appTitle = options.appTitle ?? import.meta.env.OPENROUTER_APP_TITLE;
    this.fetchAdapter = options.fetchAdapter ?? new DefaultFetchAdapter();
  }

  public getDefaultModel(): string {
    return this.defaultModel;
  }

  public getDefaultSystemPrompt(): string | undefined {
    return this.defaultSystemPrompt;
  }

  /**
   * Wysyła klasyczne żądanie chat completions do OpenRouter.
   * Dba o wstrzyknięcie domyślnego system message, parametrów modelu
   * i kompletnej obsługi błędów/timeoutów.
   */
  public async sendChat(request: OpenRouterChatRequest): Promise<OpenRouterChatResponse> {
    if (!request.messages?.length) {
      throw new OpenRouterValidationError('OpenRouterChatRequest.messages must not be empty');
    }

    const payload: OpenRouterChatPayload = {
      model: request.model ?? this.defaultModel,
      messages: this.withDefaultSystemMessage(request.messages),
      response_format: request.response_format,
      ...this.buildModelParams(request.params),
    };

    return this.performRequest(payload);
  }

  /**
   * Wysyła żądanie chat completions z wymuszeniem struktury odpowiedzi w formacie JSON Schema.
   * Zwracany wynik jest automatycznie parsowany do typu T.
   */
  public async sendStructuredChat<T>(request: OpenRouterStructuredChatRequest): Promise<T> {
    const { schemaName, schema, ...rest } = request;

    const response = await this.sendChat({
      ...rest,
      response_format: this.buildJsonSchemaFormat(schemaName, schema),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new OpenRouterParseError('OpenRouter response does not contain message content');
    }

    return this.parseJsonContent<T>(content, schemaName);
  }

  private async performRequest(body: OpenRouterChatPayload): Promise<OpenRouterChatResponse> {
    const headers = this.buildHeaders();
    const url = `${this.baseUrl}${OPENROUTER_ENDPOINT}`;
    const attempts = Math.max(1, this.retryAttempts);

    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = this.fetchAdapter.createAbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

      try {
        const response = await this.fetchAdapter.fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
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

    throw lastError instanceof Error
      ? lastError
      : new OpenRouterError('Unknown error when calling OpenRouter');
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.appUrl) {
      headers['HTTP-Referer'] = this.appUrl;
    }
    if (this.appTitle) {
      headers['X-Title'] = this.appTitle;
    }

    return headers;
  }

  private withDefaultSystemMessage(messages: OpenRouterMessage[]): OpenRouterMessage[] {
    if (!this.defaultSystemPrompt) {
      return messages;
    }

    const hasSystemMessage = messages.some((message) => message.role === 'system');
    if (hasSystemMessage) {
      return messages;
    }

    return [{ role: 'system', content: this.defaultSystemPrompt }, ...messages];
  }

  private buildModelParams(params?: OpenRouterModelParams): Record<string, number> {
    const merged: OpenRouterModelParams = {
      ...this.defaultModelParams,
      ...params,
    };

    const validated: Record<string, number> = {};

    if (merged.temperature !== undefined) {
      if (merged.temperature < 0 || merged.temperature > 2) {
        throw new OpenRouterValidationError('temperature must be between 0 and 2');
      }
      validated.temperature = merged.temperature;
    }

    if (merged.max_tokens !== undefined) {
      if (!Number.isFinite(merged.max_tokens) || merged.max_tokens <= 0) {
        throw new OpenRouterValidationError('max_tokens must be a positive number');
      }
      validated.max_tokens = merged.max_tokens;
    }

    if (merged.top_p !== undefined) {
      if (merged.top_p <= 0 || merged.top_p > 1) {
        throw new OpenRouterValidationError('top_p must be between 0 and 1');
      }
      validated.top_p = merged.top_p;
    }

    if (merged.presence_penalty !== undefined) {
      if (merged.presence_penalty < -2 || merged.presence_penalty > 2) {
        throw new OpenRouterValidationError('presence_penalty must be between -2 and 2');
      }
      validated.presence_penalty = merged.presence_penalty;
    }

    if (merged.frequency_penalty !== undefined) {
      if (merged.frequency_penalty < -2 || merged.frequency_penalty > 2) {
        throw new OpenRouterValidationError('frequency_penalty must be between -2 and 2');
      }
      validated.frequency_penalty = merged.frequency_penalty;
    }

    return validated;
  }

  private buildJsonSchemaFormat(
    schemaName: string,
    schema: Record<string, unknown>,
  ): OpenRouterJsonSchemaFormat {
    if (!schemaName.trim()) {
      throw new OpenRouterValidationError('schemaName must not be empty');
    }

    return {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    };
  }

  private validateChatResponse(data: unknown): OpenRouterChatResponse {
    if (!data || typeof data !== 'object') {
      throw new OpenRouterParseError('OpenRouter response is not an object');
    }

    const response = data as Partial<OpenRouterChatResponse>;

    if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      throw new OpenRouterParseError('OpenRouter response does not contain choices');
    }

    const firstChoice = response.choices[0];
    if (!firstChoice?.message?.content) {
      throw new OpenRouterParseError('OpenRouter response does not contain message content');
    }

    return response as OpenRouterChatResponse;
  }

  private parseJsonContent<T>(content: string, context: string): T {
    try {
      return JSON.parse(content) as T;
    } catch {
      const sample = content.slice(0, 1000);
      throw new OpenRouterParseError('Failed to parse OpenRouter content as JSON', context, sample);
    }
  }

  private normalizeRequestError(error: unknown): Error {
    if (error instanceof OpenRouterError) {
      return error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return new OpenRouterTimeoutError();
    }

    if (error instanceof Error) {
      return new OpenRouterNetworkError(error.message, { cause: error });
    }

    return new OpenRouterNetworkError('Unknown network error');
  }

  private isRetryableStatus(status: number): boolean {
    if (status === 429) {
      return true;
    }

    return status >= 500 && status < 600;
  }

  private computeBackoffDelay(attempt: number): number {
    const delay = this.retryBaseDelay * 2 ** (attempt - 1);
    return Math.min(delay, this.retryMaxDelay);
  }

  private sanitizeBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private async safeParseJson(response: Response): Promise<unknown> {
    const raw = await response.text();
    if (!raw) {
      throw new OpenRouterParseError('OpenRouter response body is empty');
    }

    try {
      return JSON.parse(raw);
    } catch {
      throw new OpenRouterParseError('Failed to parse OpenRouter JSON response', undefined, raw.slice(0, 1000));
    }
  }

  private async safeReadErrorBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');

    try {
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      const text = await response.text();
      return text.slice(0, 1000);
    } catch {
      return null;
    }
  }

  private readTimeoutFromEnv(): number | undefined {
    const value = import.meta.env.OPENROUTER_REQUEST_TIMEOUT_MS;
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}


