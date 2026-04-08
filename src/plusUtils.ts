import { setChainType, setModelKey } from "@/aiParams";
import { ChainType } from "@/chainFactory";
import {
  ChatModelProviders,
  ChatModels,
  DEFAULT_SETTINGS,
  EmbeddingModelProviders,
  EmbeddingModels,
  PlusUtmMedium,
} from "@/constants";
import { logInfo } from "@/logger";
import {
  getSettings,
  getVisibleChatModels,
  getVisibleEmbeddingModels,
  setSettings,
  updateSetting,
  useSettingsValue,
} from "@/settings/model";

// Legacy naming preserved for compatibility with the upstream codebase.
export const DEFAULT_COPILOT_PLUS_CHAT_MODEL = ChatModels.KOS2_QWEN3_CODER_30B;
export const DEFAULT_COPILOT_PLUS_CHAT_MODEL_KEY =
  DEFAULT_COPILOT_PLUS_CHAT_MODEL + "|" + ChatModelProviders.OLLAMA;
export const DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL = EmbeddingModels.KOS2_BGE_M3;
export const DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL_KEY =
  DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL + "|" + EmbeddingModelProviders.OLLAMA;
export const DEFAULT_FREE_CHAT_MODEL_KEY = DEFAULT_SETTINGS.defaultModelKey;
export const DEFAULT_FREE_EMBEDDING_MODEL_KEY = DEFAULT_SETTINGS.embeddingModelKey;

export type OllamaMachineProfile = "compact" | "balanced" | "power";

export interface OllamaPullRecommendations {
  chatModel: string;
  embeddingModel: string;
  chatCommand: string;
  embeddingCommand: string;
}

export interface OllamaCatalogRecommendation {
  id: string;
  title: string;
  description: string;
  model: string;
  command: string;
  kind: "chat" | "embedding";
  recommended: boolean;
}

export interface LocalTranscriptSetup {
  installCommand: string;
  exampleCommand: string;
}

export interface OllamaMachineCapabilities {
  profile: OllamaMachineProfile;
  profileLabel: string;
  cpuThreads: number;
  memoryGb: number | null;
}

/**
 * Legacy helper preserved for expired modal logic and compatibility.
 * In KOS2 this no longer drives any product gating.
 */
export function isPlusModel(modelKey: string): boolean {
  const provider = modelKey.split("|")[1];
  return provider === ChatModelProviders.COPILOT_PLUS;
}

/**
 * In KOS2 the advanced agent path is always available.
 * Legacy "Plus" gating stays enabled to avoid widespread upstream churn.
 */
export function isPlusEnabled(): boolean {
  return true;
}

export function useIsPlusUser(): boolean | undefined {
  useSettingsValue();
  return true;
}

export async function checkIsPlusUser(
  _context?: Record<string, any>
): Promise<boolean | undefined> {
  turnOnPlus();
  return true;
}

export async function isSelfHostEligiblePlan(): Promise<boolean> {
  return true;
}

export function isSelfHostAccessValid(): boolean {
  const settings = getSettings();
  return settings.enableSelfHostMode || settings.selfHostValidationCount > 0;
}

export function isSelfHostModeValid(): boolean {
  return getSettings().enableSelfHostMode;
}

export function useIsSelfHostEligible(): boolean | undefined {
  useSettingsValue();
  return true;
}

export async function validateSelfHostMode(): Promise<boolean> {
  updateSetting("selfHostModeValidatedAt", Date.now());
  updateSetting("selfHostValidationCount", Math.max(getSettings().selfHostValidationCount, 1));
  return true;
}

export async function refreshSelfHostModeValidation(): Promise<void> {
  if (!getSettings().enableSelfHostMode) {
    return;
  }

  if (getSettings().selfHostValidationCount < 1) {
    updateSetting("selfHostValidationCount", 1);
  }
  if (getSettings().selfHostModeValidatedAt == null) {
    updateSetting("selfHostModeValidatedAt", Date.now());
  }
}

/**
 * Estimate the local machine profile from browser-exposed hardware hints.
 *
 * @returns Compact, balanced, or power profile.
 */
export function getOllamaMachineProfile(): OllamaMachineProfile {
  const nav = globalThis.navigator as Navigator & { deviceMemory?: number };
  const memoryGb = nav?.deviceMemory ?? 0;
  const cores = nav?.hardwareConcurrency ?? 0;

  if (memoryGb >= 16 || cores >= 8) {
    return "power";
  }
  if (memoryGb >= 8 || cores >= 4) {
    return "balanced";
  }
  return "compact";
}

/**
 * Convert a machine profile into a short UI label.
 *
 * @param profile - Machine profile classification.
 * @returns Human-readable label.
 */
export function getOllamaMachineProfileLabel(profile: OllamaMachineProfile): string {
  if (profile === "power") return "Best quality";
  if (profile === "balanced") return "Balanced";
  return "Fast";
}

/**
 * Return a compact hardware snapshot for local Ollama guidance.
 *
 * @returns Machine capability summary derived from browser-exposed hints.
 */
export function getOllamaMachineCapabilities(): OllamaMachineCapabilities {
  const nav = globalThis.navigator as Navigator & { deviceMemory?: number };
  const profile = getOllamaMachineProfile();

  return {
    profile,
    profileLabel: getOllamaMachineProfileLabel(profile),
    cpuThreads: nav?.hardwareConcurrency ?? 0,
    memoryGb: nav?.deviceMemory ?? null,
  };
}

/**
 * Extract the approximate parameter count from an Ollama model name.
 *
 * @param modelName - Raw Ollama model name.
 * @returns Parameter count in billions when it can be inferred.
 */
export function getOllamaModelSize(modelName: string): number | null {
  const match = modelName.toLowerCase().match(/(\d{1,3})\s*b/);
  if (!match) return null;

  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Pick the best local chat model name from a discovered set.
 *
 * @param modelNames - Raw Ollama model names reported by the local runtime.
 * @param profile - Estimated machine profile.
 * @returns Recommended chat model name when one can be inferred.
 */
export function pickRecommendedOllamaChatModelName(
  modelNames: readonly string[],
  profile: OllamaMachineProfile = getOllamaMachineProfile()
): string | undefined {
  if (modelNames.length === 0) return undefined;

  const targetSizeByProfile: Record<OllamaMachineProfile, number> = {
    compact: 3,
    balanced: 8,
    power: 14,
  };
  const targetSize = targetSizeByProfile[profile];

  const scored = modelNames
    .map((modelName, index) => {
      const size = getOllamaModelSize(modelName);
      const knownSizePenalty = size == null ? 100 : 0;
      const closeness = size == null ? 0 : Math.abs(size - targetSize);
      const nameHintBonus = /instruct|chat|coder/i.test(modelName) ? -1 : 0;
      return {
        modelName,
        score: closeness + knownSizePenalty + nameHintBonus + index / 1000,
      };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0]?.modelName;
}

/**
 * Pick the best local embedding model name from a discovered set.
 *
 * @param modelNames - Raw Ollama model names reported by the local runtime.
 * @returns Recommended embedding model name when one can be inferred.
 */
export function pickRecommendedOllamaEmbeddingModelName(
  modelNames: readonly string[]
): string | undefined {
  if (modelNames.length === 0) return undefined;

  const scored = modelNames
    .map((modelName, index) => {
      const normalized = modelName.toLowerCase();
      const familyBonus = /bge-m3|nomic|e5|embed/.test(normalized) ? -25 : 0;
      const size = getOllamaModelSize(modelName);
      const sizePenalty = size == null ? 20 : Math.min(size, 32);

      return {
        modelName,
        score: familyBonus + sizePenalty + index / 1000,
      };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0]?.modelName;
}

/**
 * Build a short guidance string for the current machine profile.
 *
 * @param profile - Machine profile classification.
 * @returns Human-readable setup guidance.
 */
export function getOllamaProfileGuidance(profile: OllamaMachineProfile): string {
  if (profile === "power") {
    return "Best quality on this machine usually means a larger chat model and a standard embedding model.";
  }
  if (profile === "balanced") {
    return "Balanced machines usually do best with a mid-size chat model and a standard embedding model.";
  }
  return "Compact machines usually feel best with the smallest usable chat model and a lightweight embedding model.";
}

/**
 * Build a short recommendation for Ollama setup when no models are installed yet.
 *
 * @param profile - Machine profile classification.
 * @returns A copy string for first-run guidance.
 */
export function getOllamaEmptyStateHint(profile: OllamaMachineProfile): string {
  if (profile === "power") {
    return "Start with one stronger chat model and one general-purpose embedding model.";
  }
  if (profile === "balanced") {
    return "Start with one mid-size chat model and one general-purpose embedding model.";
  }
  return "Start with one small chat model and one lightweight embedding model.";
}

/**
 * Return suggested `ollama pull` commands for the current machine profile.
 *
 * These are guidance defaults for first-run setup and should only be shown when
 * the local runtime does not yet expose suitable models.
 *
 * @param profile - Machine profile classification.
 * @returns Suggested chat and embedding model pull commands.
 */
export function getOllamaPullRecommendations(
  profile: OllamaMachineProfile
): OllamaPullRecommendations {
  const chatModelByProfile: Record<OllamaMachineProfile, string> = {
    compact: "qwen2.5:3b",
    balanced: "qwen2.5:7b",
    power: "qwen2.5:14b",
  };
  const embeddingModel = "bge-m3";
  const chatModel = chatModelByProfile[profile];

  return {
    chatModel,
    embeddingModel,
    chatCommand: `ollama pull ${chatModel}`,
    embeddingCommand: `ollama pull ${embeddingModel}`,
  };
}

/**
 * Return whether a hosted transcript API key is configured for YouTube transcripts.
 *
 * @returns True when the configured transcript API key is non-empty.
 */
export function hasTranscriptApiKeyConfigured(): boolean {
  return Boolean(getSettings().supadataApiKey?.trim());
}

/**
 * Return copy-ready setup commands for a future local `yt-dlp + whisper` transcript path.
 *
 * @returns Install and example commands for local transcript tooling.
 */
export function getLocalTranscriptSetup(): LocalTranscriptSetup {
  return {
    installCommand: "brew install yt-dlp ffmpeg && python3 -m pip install -U openai-whisper",
    exampleCommand:
      "yt-dlp -x --audio-format mp3 <youtube-url> && python3 -m whisper --model medium <downloaded-audio-file>",
  };
}

/**
 * Return a small catalog of useful Ollama pull suggestions for the current machine profile.
 *
 * @param profile - Machine profile classification.
 * @returns Curated chat and embedding model recommendations with ready-to-copy commands.
 */
export function getOllamaCatalogRecommendations(
  profile: OllamaMachineProfile
): OllamaCatalogRecommendation[] {
  const recommendedChatModel = getOllamaPullRecommendations(profile).chatModel;

  return [
    {
      id: "chat-fast",
      title: "Fast chat",
      description: "Good first local model when you want the lightest usable path.",
      model: "qwen2.5:3b",
      command: "ollama pull qwen2.5:3b",
      kind: "chat",
      recommended: recommendedChatModel === "qwen2.5:3b",
    },
    {
      id: "chat-balanced",
      title: "Balanced chat",
      description: "A strong default for everyday vault work on a mid-range machine.",
      model: "qwen2.5:7b",
      command: "ollama pull qwen2.5:7b",
      kind: "chat",
      recommended: recommendedChatModel === "qwen2.5:7b",
    },
    {
      id: "chat-quality",
      title: "Best local quality",
      description: "Best choice when the machine has enough headroom for a larger chat model.",
      model: "qwen2.5:14b",
      command: "ollama pull qwen2.5:14b",
      kind: "chat",
      recommended: recommendedChatModel === "qwen2.5:14b",
    },
    {
      id: "embed-standard",
      title: "Standard embeddings",
      description: "General-purpose semantic search with good recall for most vaults.",
      model: "bge-m3",
      command: "ollama pull bge-m3",
      kind: "embedding",
      recommended: true,
    },
    {
      id: "embed-light",
      title: "Lighter embeddings",
      description: "A smaller option when you want faster local indexing on a weaker machine.",
      model: "nomic-embed-text",
      command: "ollama pull nomic-embed-text",
      kind: "embedding",
      recommended: profile === "compact",
    },
  ];
}

/**
 * Apply the KOS2 Ollama-first defaults without inventing unavailable models.
 * We intentionally keep the upstream chain type to minimize invasive changes.
 */
export function applyPlusSettings(): void {
  const settings = getSettings();
  const profile = getOllamaMachineProfile();
  const visibleChatModels = getVisibleChatModels(settings);
  const visibleEmbeddingModels = getVisibleEmbeddingModels(settings);
  const recommendedChatName = pickRecommendedOllamaChatModelName(
    visibleChatModels.map((model) => model.name),
    profile
  );
  const recommendedEmbeddingName = pickRecommendedOllamaEmbeddingModelName(
    visibleEmbeddingModels.map((model) => model.name)
  );
  const defaultModelKey = recommendedChatName
    ? `${recommendedChatName}|${ChatModelProviders.OLLAMA}`
    : settings.defaultModelKey;
  const embeddingModelKey = recommendedEmbeddingName
    ? `${recommendedEmbeddingName}|${EmbeddingModelProviders.OLLAMA}`
    : settings.embeddingModelKey;

  logInfo("Applying KOS2 Ollama-first defaults", {
    profile,
    defaultModelKey,
    embeddingModelKey,
  });

  if (recommendedChatName) {
    setModelKey(defaultModelKey);
  }
  setChainType(ChainType.COPILOT_PLUS_CHAIN);
  setSettings({
    defaultModelKey,
    embeddingModelKey,
    defaultChainType: ChainType.COPILOT_PLUS_CHAIN,
    isPlusUser: true,
  });
}

export function createPlusPageUrl(_medium: PlusUtmMedium): string {
  return "https://ollama.com/";
}

/**
 * Return the public Ollama library URL for browsing supported models.
 *
 * @returns Ollama library URL.
 */
export function createOllamaLibraryUrl(): string {
  return "https://ollama.com/library";
}

export function navigateToPlusPage(medium: PlusUtmMedium): void {
  window.open(createPlusPageUrl(medium), "_blank");
}

/**
 * Open the Ollama library in a new browser tab.
 */
export function navigateToOllamaLibrary(): void {
  window.open(createOllamaLibraryUrl(), "_blank");
}

export function turnOnPlus(): void {
  updateSetting("isPlusUser", true);
}

/**
 * Preserved for compatibility with upstream call sites.
 * KOS2 no longer expires a license, so this only updates the flag.
 */
export function turnOffPlus(): void {
  updateSetting("isPlusUser", false);
}
