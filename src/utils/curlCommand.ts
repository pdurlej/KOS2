import { CustomModel } from "@/aiParams";
import { ChatModelProviders, EmbeddingModelProviders, ProviderInfo } from "@/constants";
import { getDecryptedKey } from "@/encryptionService";

// ============================================================================
// Types
// ============================================================================

export type BuildCurlCommandResult =
  | { ok: true; command: string; warnings: string[] }
  | { ok: false; error: string; warnings: string[] };

interface CurlRequestSpec {
  method: "POST";
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  curlArgs?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CHAT_MESSAGE = "Hello!";
const DEFAULT_EMBEDDING_INPUT = "Hello!";
const DEFAULT_OPENAI_MAX_TOKENS = 64;

/** Providers that use OpenAI-compatible API format */
const OPENAI_COMPATIBLE_PROVIDERS = new Set<string>([
  ChatModelProviders.OPENAI_COMPATIBLE,
  EmbeddingModelProviders.OPENAI_COMPATIBLE,
  // Note: Ollama uses native API (/api/chat), not OpenAI-compatible
]);

// ============================================================================
// Helper Functions
// ============================================================================

/** Removes trailing slashes from a string */
function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/g, "");
}

/** Escapes a string for safe inclusion in a single-quoted shell string */
function escapeForSingleQuotedString(value: string): string {
  return value.replace(/'/g, "'\"'\"'");
}

/** Gets the default base URL for curl generation from ProviderInfo */
function getProviderCurlBaseURL(provider: string): string {
  const info = ProviderInfo[provider as keyof typeof ProviderInfo];
  return (info?.curlBaseURL ?? info?.host ?? "").trim();
}

/**
 * Resolves API key for curl generation.
 * Falls back to placeholder when key is missing or cannot be decrypted.
 */
async function resolveApiKeyForCurl(
  apiKeyInput: string | undefined
): Promise<{ apiKey: string; warnings: string[] }> {
  const warnings: string[] = [];
  const trimmed = apiKeyInput?.trim() ?? "";

  if (!trimmed) {
    warnings.push("API key is empty; using placeholder.");
    return { apiKey: "<YOUR_API_KEY>", warnings };
  }

  try {
    const decrypted = (await getDecryptedKey(trimmed))?.trim();
    if (!decrypted || decrypted === "Copilot failed to decrypt API keys!") {
      warnings.push("API key could not be decrypted; using placeholder.");
      return { apiKey: "<YOUR_API_KEY>", warnings };
    }
    return { apiKey: decrypted, warnings };
  } catch {
    warnings.push("API key could not be decrypted; using placeholder.");
    return { apiKey: "<YOUR_API_KEY>", warnings };
  }
}

/** Strips OpenAI-style endpoint suffixes to avoid duplication */
function stripOpenAIEndpointSuffix(baseUrl: string): string {
  const trimmed = trimTrailingSlashes(baseUrl);
  const suffixes = ["/chat/completions", "/embeddings", "/responses"];

  for (const suffix of suffixes) {
    if (trimmed.endsWith(suffix)) {
      return trimmed.slice(0, -suffix.length);
    }
  }
  return trimmed;
}

/**
 * Normalizes Ollama base URL by removing /api, /v1, or combined suffixes.
 * Ollama native API uses /api/chat and /api/embed endpoints.
 */
function normalizeOllamaBaseUrl(baseUrl: string): string {
  const trimmed = trimTrailingSlashes(baseUrl);
  const suffixes = ["/api/v1", "/v1", "/api"];

  for (const suffix of suffixes) {
    if (trimmed.endsWith(suffix)) {
      return trimmed.slice(0, -suffix.length);
    }
  }

  return trimmed;
}

/** Formats a curl command from request specification */
function formatCurlCommand(spec: CurlRequestSpec): string {
  const parts: string[] = [];
  const urlEscaped = escapeForSingleQuotedString(spec.url);

  parts.push(`curl --request ${spec.method} '${urlEscaped}'`);

  for (const arg of spec.curlArgs ?? []) {
    parts.push(`  ${arg}`);
  }

  // Order headers for readability
  const orderedKeys = [
    "Content-Type",
    "Accept",
    "Authorization",
    "x-goog-api-key",
    "api-key",
    "x-api-key",
    "anthropic-version",
    "OpenAI-Organization",
  ];

  const headers = spec.headers ?? {};
  const emitted = new Set<string>();

  for (const key of orderedKeys) {
    if (headers[key] !== undefined) {
      emitted.add(key);
      parts.push(`  --header '${escapeForSingleQuotedString(`${key}: ${headers[key]}`)}'`);
    }
  }

  for (const key of Object.keys(headers).sort()) {
    if (!emitted.has(key)) {
      parts.push(`  --header '${escapeForSingleQuotedString(`${key}: ${headers[key]}`)}'`);
    }
  }

  if (spec.body !== undefined) {
    const json = JSON.stringify(spec.body, null, 2);
    parts.push(`  --data-raw '${escapeForSingleQuotedString(json)}'`);
  }

  return parts.join(" \\\n");
}

// ============================================================================
// OpenAI-Compatible Provider Builder
// ============================================================================

/** Builds curl request spec for OpenAI-compatible APIs */
async function buildOpenAICompatibleRequestSpec(
  model: CustomModel,
  isEmbeddingModel: boolean
): Promise<
  | { ok: true; spec: CurlRequestSpec; warnings: string[] }
  | { ok: false; error: string; warnings: string[] }
> {
  const warnings: string[] = [];
  const provider = model.provider?.trim() ?? "";

  const providerBase = getProviderCurlBaseURL(provider);
  const baseUrlOverride = model.baseUrl?.trim() ?? "";

  // Build base URL (deterministic - no guessing /v1)
  const baseCandidate = trimTrailingSlashes(
    baseUrlOverride || providerBase || "https://api.example.com/v1"
  );
  const apiBase = stripOpenAIEndpointSuffix(baseCandidate);

  // Model name
  const modelName = model.name?.trim() || "<MODEL_NAME>";
  if (!model.name?.trim()) {
    warnings.push("Model name is empty; using placeholder.");
  }

  // API key
  const apiKeyResolved = await resolveApiKeyForCurl(model.apiKey);
  warnings.push(...apiKeyResolved.warnings);

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${apiKeyResolved.apiKey}`,
  };

  if (isEmbeddingModel) {
    return {
      ok: true,
      warnings,
      spec: {
        method: "POST",
        url: `${apiBase}/embeddings`,
        headers,
        body: {
          model: modelName,
          input: DEFAULT_EMBEDDING_INPUT,
        },
      },
    };
  }

  return {
    ok: true,
    warnings,
    spec: {
      method: "POST",
      url: `${apiBase}/chat/completions`,
      headers,
      body: {
        model: modelName,
        messages: [{ role: "user", content: DEFAULT_CHAT_MESSAGE }],
        stream: false,
        max_tokens: DEFAULT_OPENAI_MAX_TOKENS,
      },
    },
  };
}

// ============================================================================
// Ollama Builder
// ============================================================================

/**
 * Builds curl request spec for Ollama native API.
 * Uses /api/chat for chat models and /api/embed for embedding models.
 * Default base URL is http://localhost:11434.
 */
async function buildOllamaRequestSpec(
  model: CustomModel,
  isEmbeddingModel: boolean
): Promise<
  | { ok: true; spec: CurlRequestSpec; warnings: string[] }
  | { ok: false; error: string; warnings: string[] }
> {
  const warnings: string[] = [];

  // Build base URL (deterministic - curlBaseURL is http://localhost:11434)
  const baseOverride = model.baseUrl?.trim() ?? "";
  const providerBase = getProviderCurlBaseURL(ChatModelProviders.OLLAMA);
  const apiBase = normalizeOllamaBaseUrl(
    trimTrailingSlashes(baseOverride || providerBase || "http://localhost:11434")
  );

  // Model name
  const modelName = model.name?.trim() || "<MODEL_NAME>";
  if (!model.name?.trim()) {
    warnings.push("Model name is empty; using placeholder.");
  }

  // Build headers - only add Authorization for remote/cloud deployments with API key
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Ollama local deployments (localhost) typically don't require auth
  // Only add Authorization header if user has provided an API key
  const hasApiKey = model.apiKey?.trim();
  if (hasApiKey) {
    const apiKeyResolved = await resolveApiKeyForCurl(model.apiKey);
    // Filter out "API key is empty" warnings for Ollama since it's often optional
    const filteredWarnings = apiKeyResolved.warnings.filter((w) => !w.includes("API key is empty"));
    warnings.push(...filteredWarnings);
    headers.Authorization = `Bearer ${apiKeyResolved.apiKey}`;
  }

  if (isEmbeddingModel) {
    return {
      ok: true,
      warnings,
      spec: {
        method: "POST",
        url: `${apiBase}/api/embed`,
        headers,
        body: {
          model: modelName,
          input: DEFAULT_EMBEDDING_INPUT,
          truncate: true,
        },
      },
    };
  }

  return {
    ok: true,
    warnings,
    spec: {
      method: "POST",
      url: `${apiBase}/api/chat`,
      headers,
      body: {
        model: modelName,
        messages: [{ role: "user", content: DEFAULT_CHAT_MESSAGE }],
        stream: false,
      },
    },
  };
}

// ============================================================================
// Main Entry Function
// ============================================================================

/**
 * Builds an example curl command for the provided model configuration.
 * Intended for debugging connectivity and validating request formats.
 */
export async function buildCurlCommandForModel(
  model: CustomModel
): Promise<BuildCurlCommandResult> {
  const warnings: string[] = [];
  const provider = model.provider?.trim();

  if (!provider) {
    return { ok: false, error: "Provider is required to build a curl command.", warnings };
  }

  const isEmbeddingModel = Boolean(model.isEmbeddingModel);

  // Ollama (native API)
  if (provider === ChatModelProviders.OLLAMA || provider === EmbeddingModelProviders.OLLAMA) {
    const result = await buildOllamaRequestSpec(model, isEmbeddingModel);
    if (!result.ok) return result;
    return { ok: true, command: formatCurlCommand(result.spec), warnings: result.warnings };
  }

  // OpenAI-compatible providers
  if (OPENAI_COMPATIBLE_PROVIDERS.has(provider)) {
    const result = await buildOpenAICompatibleRequestSpec(model, isEmbeddingModel);
    if (!result.ok) return result;
    return { ok: true, command: formatCurlCommand(result.spec), warnings: result.warnings };
  }

  return {
    ok: false,
    error: `Provider "${provider}" is not supported for curl generation.`,
    warnings,
  };
}
