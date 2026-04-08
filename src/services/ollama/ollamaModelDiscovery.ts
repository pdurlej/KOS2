import { CustomModel } from "@/aiParams";
import { ChatModelProviders, EmbeddingModelProviders } from "@/constants";
import { logInfo, logWarn } from "@/logger";
import { getSettings, setSettings, type CopilotSettings } from "@/settings/model";
import { err2String } from "@/utils";
import { requestUrl } from "obsidian";

/**
 * A single Ollama model capability probe result.
 */
export interface OllamaProbeFailure {
  name: string;
  chatError?: string;
  embeddingError?: string;
}

/**
 * Result of probing local Ollama for chat and embedding capabilities.
 */
export interface OllamaDiscoveryResult {
  baseUrl: string;
  discoveredNames: string[];
  chatModels: CustomModel[];
  embeddingModels: CustomModel[];
  failedModels: OllamaProbeFailure[];
}

/**
 * Result of syncing local Ollama models into plugin settings.
 */
export interface OllamaSyncResult extends OllamaDiscoveryResult {
  previousDefaultModelKey: string;
  nextDefaultModelKey: string;
  previousEmbeddingModelKey: string;
  nextEmbeddingModelKey: string;
}

/**
 * Probe function signature for a candidate model.
 */
export type OllamaModelPing = (model: CustomModel) => Promise<boolean>;

interface DiscoverOllamaModelsOptions {
  baseUrl: string;
  chatPing: OllamaModelPing;
  embeddingPing: OllamaModelPing;
  existingChatModels?: CustomModel[];
  existingEmbeddingModels?: CustomModel[];
}

interface SyncDiscoveredOllamaModelsOptions {
  baseUrl?: string;
  chatPing: OllamaModelPing;
  embeddingPing: OllamaModelPing;
  notify?: (message: string) => void;
  settings?: Readonly<CopilotSettings>;
  showSummaryNotice?: boolean;
}

const OLLAMA_PROBE_TIMEOUT_MS = 8000;

/**
 * Normalize an Ollama base URL so all callers use the same host shape.
 *
 * @param url - Raw Ollama URL from settings or user input.
 * @returns Normalized URL without trailing slash or `/v1`.
 */
export function normalizeOllamaBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
}

/**
 * Build a stable key for a model entry.
 *
 * @param model - Model to key.
 * @returns Stable `name|provider` key.
 */
function getModelKey(model: Pick<CustomModel, "name" | "provider">): string {
  return `${model.name}|${model.provider}`;
}

/**
 * Resolve the best Ollama base URL from the current settings snapshot.
 *
 * @param settings - Settings snapshot.
 * @returns Normalized Ollama base URL.
 */
export function getConfiguredOllamaBaseUrl(settings: Readonly<CopilotSettings>): string {
  const defaultOllamaModel = settings.activeModels.find(
    (model) =>
      model.provider === ChatModelProviders.OLLAMA &&
      getModelKey(model) === settings.defaultModelKey
  );

  const anyOllamaChatModel = settings.activeModels.find(
    (model) => model.provider === ChatModelProviders.OLLAMA
  );

  const anyOllamaEmbeddingModel = settings.activeEmbeddingModels.find(
    (model) => model.provider === EmbeddingModelProviders.OLLAMA
  );

  const rawBaseUrl =
    defaultOllamaModel?.baseUrl ||
    anyOllamaChatModel?.baseUrl ||
    anyOllamaEmbeddingModel?.baseUrl ||
    "http://127.0.0.1:11434";

  return normalizeOllamaBaseUrl(rawBaseUrl);
}

/**
 * Parse `/api/tags` payload into a stable list of Ollama model names.
 *
 * @param payload - Raw response JSON.
 * @returns Unique model names in server order.
 */
export function parseOllamaTagsResponse(payload: unknown): string[] {
  const rawModels = Array.isArray((payload as { models?: unknown[] } | null)?.models)
    ? ((payload as { models: Array<{ name?: unknown }> }).models ?? [])
    : [];

  const seen = new Set<string>();
  const parsedNames: string[] = [];

  rawModels.forEach((model) => {
    const modelName = typeof model?.name === "string" ? model.name.trim() : "";
    if (!modelName || seen.has(modelName)) {
      return;
    }
    seen.add(modelName);
    parsedNames.push(modelName);
  });

  return parsedNames;
}

/**
 * Infer whether an Ollama model name likely refers to an embedding model.
 *
 * This is a fallback for local runtimes where the embedding probe is flaky or slow,
 * but the model family is clearly intended for embeddings.
 *
 * @param modelName - Raw Ollama model name.
 * @returns True when the model name strongly suggests embedding usage.
 */
export function looksLikeOllamaEmbeddingModelName(modelName: string): boolean {
  return /embed|embedding|bge|e5|nomic|mxbai|gte|jina/i.test(modelName);
}

/**
 * Build a discovery-managed Ollama chat model, preserving user metadata when possible.
 *
 * @param modelName - Name reported by Ollama.
 * @param baseUrl - Normalized Ollama base URL.
 * @param existingModel - Matching persisted model, if present.
 * @returns Discovery-managed chat model entry.
 */
function buildDiscoveredChatModel(
  modelName: string,
  baseUrl: string,
  existingModel?: CustomModel
): CustomModel {
  return {
    ...existingModel,
    name: modelName,
    provider: ChatModelProviders.OLLAMA,
    baseUrl,
    enabled: existingModel?.enabled ?? true,
    projectEnabled: existingModel?.projectEnabled ?? true,
    isBuiltIn: false,
    core: false,
    isEmbeddingModel: false,
  };
}

/**
 * Build a discovery-managed Ollama embedding model, preserving user metadata when possible.
 *
 * @param modelName - Name reported by Ollama.
 * @param baseUrl - Normalized Ollama base URL.
 * @param existingModel - Matching persisted model, if present.
 * @returns Discovery-managed embedding model entry.
 */
function buildDiscoveredEmbeddingModel(
  modelName: string,
  baseUrl: string,
  existingModel?: CustomModel
): CustomModel {
  return {
    ...existingModel,
    name: modelName,
    provider: EmbeddingModelProviders.OLLAMA,
    baseUrl,
    enabled: existingModel?.enabled ?? true,
    isBuiltIn: false,
    core: false,
    isEmbeddingModel: true,
  };
}

/**
 * Fetch raw Ollama model names from `/api/tags`.
 *
 * @param baseUrl - Normalized Ollama base URL.
 * @returns Unique model names reported by the local Ollama instance.
 */
export async function fetchOllamaModelNames(baseUrl: string): Promise<string[]> {
  const response = await requestUrl({
    url: `${baseUrl}/api/tags`,
    method: "GET",
  });

  return parseOllamaTagsResponse(response.json);
}

/**
 * Race an Ollama capability probe against a timeout so discovery cannot hang forever.
 *
 * @param probe - Probe promise to guard.
 * @param capability - Capability name for the timeout message.
 * @param modelName - Probed model name.
 * @returns Probe result when it finishes in time.
 */
async function withProbeTimeout<T>(
  probe: Promise<T>,
  capability: "chat" | "embedding",
  modelName: string
): Promise<T> {
  return Promise.race([
    probe,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(
            `Timed out after ${OLLAMA_PROBE_TIMEOUT_MS}ms during ${capability} probe for '${modelName}'.`
          )
        );
      }, OLLAMA_PROBE_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Probe local Ollama and classify discovered models by supported capability.
 *
 * @param options - Discovery configuration and probe implementations.
 * @returns Verified Ollama model sets for chat and embeddings.
 */
export async function discoverOllamaModels(
  options: DiscoverOllamaModelsOptions
): Promise<OllamaDiscoveryResult> {
  const existingChatModels = options.existingChatModels ?? [];
  const existingEmbeddingModels = options.existingEmbeddingModels ?? [];
  const discoveredNames = await fetchOllamaModelNames(options.baseUrl);
  const chatModels: CustomModel[] = [];
  const embeddingModels: CustomModel[] = [];
  const failedModels: OllamaProbeFailure[] = [];

  for (const modelName of discoveredNames) {
    const existingChatModel = existingChatModels.find(
      (model) => model.provider === ChatModelProviders.OLLAMA && model.name === modelName
    );
    const existingEmbeddingModel = existingEmbeddingModels.find(
      (model) => model.provider === EmbeddingModelProviders.OLLAMA && model.name === modelName
    );

    const chatModel = buildDiscoveredChatModel(modelName, options.baseUrl, existingChatModel);
    const embeddingModel = buildDiscoveredEmbeddingModel(
      modelName,
      options.baseUrl,
      existingEmbeddingModel
    );

    const [chatProbe, embeddingProbe] = await Promise.allSettled([
      withProbeTimeout(options.chatPing(chatModel), "chat", modelName),
      withProbeTimeout(options.embeddingPing(embeddingModel), "embedding", modelName),
    ]);

    const probeFailure: OllamaProbeFailure = { name: modelName };
    const looksLikeEmbeddingModel = looksLikeOllamaEmbeddingModelName(modelName);

    if (chatProbe.status === "fulfilled" && chatProbe.value !== false) {
      chatModels.push(chatModel);
    } else {
      probeFailure.chatError =
        chatProbe.status === "fulfilled"
          ? "Chat probe returned false."
          : err2String(chatProbe.reason);
    }

    if (embeddingProbe.status === "fulfilled" && embeddingProbe.value !== false) {
      embeddingModels.push(embeddingModel);
    } else if (looksLikeEmbeddingModel) {
      embeddingModels.push(embeddingModel);
      probeFailure.embeddingError =
        embeddingProbe.status === "fulfilled"
          ? "Embedding probe returned false. Included as a likely embedding model based on its name."
          : `${err2String(embeddingProbe.reason)} Included as a likely embedding model based on its name.`;
    } else {
      probeFailure.embeddingError =
        embeddingProbe.status === "fulfilled"
          ? "Embedding probe returned false."
          : err2String(embeddingProbe.reason);
    }

    if (probeFailure.chatError || probeFailure.embeddingError) {
      failedModels.push(probeFailure);
    }
  }

  failedModels.forEach((failure) => {
    logWarn("Ollama capability probe failed for one or more capabilities.", failure);
  });

  return {
    baseUrl: options.baseUrl,
    discoveredNames,
    chatModels,
    embeddingModels,
    failedModels,
  };
}

/**
 * Replace the discovery-managed Ollama subset while preserving all other models and user order.
 *
 * @param existingModels - Persisted model list.
 * @param discoveredModels - Newly discovered Ollama models for a specific capability.
 * @returns Updated model list with the Ollama subset replaced.
 */
export function mergeDiscoveredOllamaModels(
  existingModels: CustomModel[],
  discoveredModels: CustomModel[]
): CustomModel[] {
  const orderedDiscovered = [...discoveredModels].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const discoveredByKey = new Map(orderedDiscovered.map((model) => [getModelKey(model), model]));
  const usedDiscoveredKeys = new Set<string>();
  const mergedModels: CustomModel[] = [];

  existingModels.forEach((model) => {
    if (
      model.provider !== ChatModelProviders.OLLAMA &&
      model.provider !== EmbeddingModelProviders.OLLAMA
    ) {
      mergedModels.push(model);
      return;
    }

    const matchedModel = discoveredByKey.get(getModelKey(model));
    if (!matchedModel) {
      return;
    }

    mergedModels.push(matchedModel);
    usedDiscoveredKeys.add(getModelKey(matchedModel));
  });

  orderedDiscovered.forEach((model) => {
    const modelKey = getModelKey(model);
    if (!usedDiscoveredKeys.has(modelKey)) {
      mergedModels.push(model);
    }
  });

  return mergedModels;
}

/**
 * Sync verified Ollama models into settings and reconcile active defaults.
 *
 * @param options - Sync configuration.
 * @returns Discovery details plus the reconciled default keys.
 */
export async function syncDiscoveredOllamaModels(
  options: SyncDiscoveredOllamaModelsOptions
): Promise<OllamaSyncResult> {
  const currentSettings = options.settings ?? getSettings();
  const baseUrl = normalizeOllamaBaseUrl(
    options.baseUrl || getConfiguredOllamaBaseUrl(currentSettings)
  );

  logInfo("Syncing discovery-managed Ollama models.", { baseUrl });

  const discovery = await discoverOllamaModels({
    baseUrl,
    chatPing: options.chatPing,
    embeddingPing: options.embeddingPing,
    existingChatModels: currentSettings.activeModels,
    existingEmbeddingModels: currentSettings.activeEmbeddingModels,
  });

  const previousDefaultModelKey = currentSettings.defaultModelKey;
  const previousEmbeddingModelKey = currentSettings.embeddingModelKey;

  setSettings({
    ...currentSettings,
    activeModels: mergeDiscoveredOllamaModels(currentSettings.activeModels, discovery.chatModels),
    activeEmbeddingModels: mergeDiscoveredOllamaModels(
      currentSettings.activeEmbeddingModels,
      discovery.embeddingModels
    ),
  });

  const nextSettings = getSettings();
  const nextDefaultModelKey = nextSettings.defaultModelKey;
  const nextEmbeddingModelKey = nextSettings.embeddingModelKey;

  if (options.notify && previousDefaultModelKey !== nextDefaultModelKey) {
    options.notify(
      nextDefaultModelKey
        ? `Default chat model '${previousDefaultModelKey || "unset"}' is no longer available in local Ollama. Switched to '${nextDefaultModelKey}'.`
        : "No verified Ollama chat models are currently available. Start local Ollama and sync models again."
    );
  }

  if (options.notify && previousEmbeddingModelKey !== nextEmbeddingModelKey) {
    options.notify(
      nextEmbeddingModelKey
        ? `Embedding model '${previousEmbeddingModelKey || "unset"}' is no longer available in local Ollama. Switched to '${nextEmbeddingModelKey}'.`
        : "No verified Ollama embedding models are currently available. Semantic search needs a local Ollama embedding model."
    );
  }

  if (options.notify && options.showSummaryNotice) {
    options.notify(
      `Synced Ollama models: ${discovery.chatModels.length} chat, ${discovery.embeddingModels.length} embedding.`
    );
  }

  return {
    ...discovery,
    previousDefaultModelKey,
    nextDefaultModelKey,
    previousEmbeddingModelKey,
    nextEmbeddingModelKey,
  };
}
