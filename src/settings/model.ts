import { CustomModel, ProjectConfig } from "@/aiParams";
import { atom, createStore, useAtomValue } from "jotai";
import { v4 as uuidv4 } from "uuid";

import { type ChainType } from "@/chainFactory";
import { type SortStrategy, isSortStrategy } from "@/utils/recentUsageManager";
import {
  AGENT_MAX_ITERATIONS_LIMIT,
  ChatModelProviders,
  COPILOT_FOLDER_ROOT,
  DEFAULT_OPEN_AREA,
  DEFAULT_QA_EXCLUSIONS_SETTING,
  DEFAULT_SETTINGS,
  EmbeddingModelProviders,
  LEGACY_COPILOT_FOLDER_ROOT,
  SEND_SHORTCUT,
} from "@/constants";
import { DEFAULT_CLEANUP_FOLDER_CONFIG, normalizeCleanupFolderConfig } from "@/kos/cleanup/config";
import { CleanupFolderConfig, CleanupLearnedRule } from "@/kos/cleanup/types";

/**
 * We used to store commands in the settings file with the following interface.
 * It has been migrated to CustomCommand. This interface is needed to migrate
 * the legacy commands to the new format.
 */
export interface LegacyCommandSettings {
  /**
   * The name of the command. The name will be turned into id by replacing
   * spaces with underscores.
   */
  name: string;

  /**
   * The model key of the command. If not provided, the current chat model will
   * be used.
   */
  modelKey?: string;

  /**
   * The prompt of the command.
   */
  prompt: string;

  /**
   * Whether to show the command in the context menu.
   */
  showInContextMenu: boolean;
}

export interface CopilotSettings {
  userId: string;
  plusLicenseKey: string;
  openAIApiKey: string;
  openAIOrgId: string;
  huggingfaceApiKey: string;
  cohereApiKey: string;
  anthropicApiKey: string;
  azureOpenAIApiKey: string;
  azureOpenAIApiInstanceName: string;
  azureOpenAIApiDeploymentName: string;
  azureOpenAIApiVersion: string;
  azureOpenAIApiEmbeddingDeploymentName: string;
  googleApiKey: string;
  ollamaCloudApiKey: string;
  openRouterAiApiKey: string;
  xaiApiKey: string;
  mistralApiKey: string;
  deepseekApiKey: string;
  amazonBedrockApiKey: string;
  amazonBedrockRegion: string;
  siliconflowApiKey: string;
  // GitHub Copilot OAuth tokens
  githubCopilotAccessToken: string;
  githubCopilotToken: string;
  githubCopilotTokenExpiresAt: number;
  defaultChainType: ChainType;
  defaultModelKey: string;
  embeddingModelKey: string;
  /** Keep default note work on a local-only path. */
  privacyLocalMode: boolean;
  /** Use the dynamic KOS2 local agent instead of pinning one fixed local chat model. */
  useLocalAgentAsDefaultModel: boolean;
  temperature: number;
  maxTokens: number;
  contextTurns: number;
  lastDismissedVersion: string | null;
  // DEPRECATED: Do not use this directly, migrated to file-based system prompts
  userSystemPrompt: string;
  openAIProxyBaseUrl: string;
  openAIEmbeddingProxyBaseUrl: string;
  stream: boolean;
  defaultSaveFolder: string;
  defaultConversationTag: string;
  autosaveChat: boolean;
  /**
   * When enabled, generate a short AI title for chat notes on save.
   * When disabled (default), use the first 10 words of the first user message.
   */
  generateAIChatTitleOnSave: boolean;
  autoAddActiveContentToContext: boolean;
  customPromptsFolder: string;
  indexVaultToVectorStore: string;
  chatNoteContextPath: string;
  chatNoteContextTags: string[];
  enableIndexSync: boolean;
  debug: boolean;
  enableEncryption: boolean;
  maxSourceChunks: number;
  enableInlineCitations: boolean;
  qaExclusions: string;
  qaInclusions: string;
  groqApiKey: string;
  activeModels: Array<CustomModel>;
  activeEmbeddingModels: Array<CustomModel>;
  promptUsageTimestamps: Record<string, number>;
  promptSortStrategy: string;
  chatHistorySortStrategy: SortStrategy;
  projectListSortStrategy: SortStrategy;
  embeddingRequestsPerMin: number;
  embeddingBatchSize: number;
  defaultOpenArea: DEFAULT_OPEN_AREA;
  defaultSendShortcut: SEND_SHORTCUT;
  disableIndexOnMobile: boolean;
  showSuggestedPrompts: boolean;
  showRelevantNotes: boolean;
  /** Whether the one-time Ollama-first onboarding surface has already been shown. */
  hasSeenOllamaOnboarding: boolean;
  /** Last manual setup check timestamp. This is diagnostic state, not runtime truth. */
  lastKOSSetupCheckAt: number | null;
  /** Last manual setup check summary. This is diagnostic state, not runtime truth. */
  lastKOSSetupCheckStatus: "pass" | "warn" | "fail" | null;
  numPartitions: number;
  defaultConversationNoteName: string;
  // undefined means never checked
  isPlusUser: boolean | undefined;
  inlineEditCommands: LegacyCommandSettings[] | undefined;
  projectList: Array<ProjectConfig>;
  passMarkdownImages: boolean;
  enableAutonomousAgent: boolean;
  enableCustomPromptTemplating: boolean;
  /** Enable semantic search using Orama for meaning-based document retrieval */
  enableSemanticSearchV3: boolean;
  /** Enable self-host mode (e.g., Miyo) - uses self-hosted services for search, LLMs, OCR, etc. */
  enableSelfHostMode: boolean;
  /** Enable Miyo-backed indexing and semantic search when self-host mode is active */
  enableMiyo: boolean;
  /** Timestamp of last successful Believer validation for self-host mode (null if never validated) */
  selfHostModeValidatedAt: number | null;
  /** Count of successful periodic validations (3 = permanently valid) */
  selfHostValidationCount: number;
  /** URL endpoint for the self-host mode backend */
  selfHostUrl: string;
  /** API key for the self-host mode backend (if required) */
  selfHostApiKey: string;
  /** Custom Miyo server URL, e.g. "http://192.168.1.10:8742" (empty = use local service discovery) */
  miyoServerUrl: string;
  /** @deprecated Miyo now uses the current vault path as `folder_path`; preserved only for backwards-compatible settings migration. */
  miyoRemoteVaultPath: string;
  /** Which provider to use for self-host web search */
  selfHostSearchProvider: "firecrawl" | "perplexity";
  /** Firecrawl API key for self-host web search */
  firecrawlApiKey: string;
  /** Perplexity API key for self-host web search via Sonar */
  perplexityApiKey: string;
  /** Supadata API key for self-host YouTube transcripts */
  supadataApiKey: string;
  /** Enable lexical boosts (folder and graph) in search - default: true */
  enableLexicalBoosts: boolean;
  /**
   * RAM limit for lexical search index (in MB)
   * Controls memory usage for full-text search operations
   * - Range: 20-1000 MB
   * - Default: 100 MB
   */
  lexicalSearchRamLimit: number;
  /** Whether we have suggested built-in default commands to the user once. */
  suggestedDefaultCommands: boolean;
  autonomousAgentMaxIterations: number;
  autonomousAgentEnabledToolIds: string[];
  /** Default reasoning effort for models that support it (GPT-5, O-series, etc.) */
  reasoningEffort: "minimal" | "low" | "medium" | "high";
  /** Default verbosity level for models that support it */
  verbosity: "low" | "medium" | "high";
  /** Folder where memory data is stored */
  memoryFolderName: string;
  /** Reference recent conversation history to provide more contextually relevant responses */
  enableRecentConversations: boolean;
  /** Maximum number of recent conversations to remember (10-50) */
  maxRecentConversations: number;
  /** Reference saved memories that user explicitly asked to remember */
  enableSavedMemory: boolean;
  /** Last selected model for quick command */
  quickCommandModelKey: string | undefined;
  /** Last checkbox state for including note context in quick command */
  quickCommandIncludeNoteContext: boolean;
  /** Automatically add text selections to chat context */
  autoIncludeTextSelection: boolean;
  autoAddSelectionToContext: boolean;
  /** Automatically accept file edits without showing preview confirmation */
  autoAcceptEdits: boolean;
  /** Preferred diff view mode: side-by-side or split */
  diffViewMode: "side-by-side" | "split";
  /** Folder where user system prompts are stored */
  userSystemPromptsFolder: string;
  /**
   * Global default system prompt title
   * Used as the default for all new chat sessions
   * Empty string means no custom system prompt (use builtin)
   */
  defaultSystemPromptTitle: string;
  /** Token threshold for auto-compacting large context (range: 64k-1M tokens, default: 128000) */
  autoCompactThreshold: number;
  /** Folder where converted document markdown files are saved */
  convertedDocOutputFolder: string;
  /** Cleanup workflow folder mapping, configurable from v2 onwards. */
  cleanupFolderConfig: CleanupFolderConfig;
  /** User-managed learned cleanup rules for recurring inbox routing. */
  cleanupLearnedRules: CleanupLearnedRule[];
}

export const settingsStore = createStore();
export const settingsAtom = atom<CopilotSettings>(DEFAULT_SETTINGS);

/**
 * Migrate legacy `kos2/...` folder defaults into the new `05 System/KOS2/...` layout.
 *
 * Only exact legacy defaults are rewritten. Custom user paths are preserved.
 *
 * @param value - Saved folder setting.
 * @param legacyDefault - Previous default path.
 * @param nextDefault - New default path.
 * @returns Migrated folder path.
 */
function migrateLegacyFolderDefault(
  value: string | undefined,
  legacyDefault: string,
  nextDefault: string
): string {
  const trimmedValue = (value || "").trim();

  if (!trimmedValue) {
    return nextDefault;
  }

  return trimmedValue === legacyDefault ? nextDefault : trimmedValue;
}

/**
 * Return the Ollama chat models shown in the main KOS2 flow.
 *
 * @param settings - Current settings snapshot.
 * @returns Enabled Ollama chat models.
 */
export function getVisibleChatModels(settings: Readonly<CopilotSettings>): CustomModel[] {
  return (settings.activeModels || []).filter(
    (model) =>
      model.provider === ChatModelProviders.OLLAMA && model.enabled && !model.isEmbeddingModel
  );
}

/**
 * Return the Ollama chat models managed by discovery, regardless of enable state.
 *
 * @param settings - Current settings snapshot.
 * @returns Ollama chat model inventory.
 */
export function getDiscoveryManagedChatModels(settings: Readonly<CopilotSettings>): CustomModel[] {
  return (settings.activeModels || []).filter(
    (model) => model.provider === ChatModelProviders.OLLAMA && !model.isEmbeddingModel
  );
}

/**
 * Return the Ollama embedding models shown in the main KOS2 flow.
 *
 * @param settings - Current settings snapshot.
 * @returns Verified Ollama embedding models.
 */
export function getVisibleEmbeddingModels(settings: Readonly<CopilotSettings>): CustomModel[] {
  return (settings.activeEmbeddingModels || []).filter(
    (model) => model.provider === EmbeddingModelProviders.OLLAMA && model.enabled !== false
  );
}

/**
 * Return the Ollama embedding inventory managed by discovery.
 *
 * @param settings - Current settings snapshot.
 * @returns Ollama embedding model inventory.
 */
export function getDiscoveryManagedEmbeddingModels(
  settings: Readonly<CopilotSettings>
): CustomModel[] {
  return (settings.activeEmbeddingModels || []).filter(
    (model) => model.provider === EmbeddingModelProviders.OLLAMA
  );
}

/**
 * Resolve a valid chat model key for the current settings.
 *
 * @param settings - Current Copilot settings.
 * @returns A valid Ollama chat model key or an empty string when none are available.
 */
function resolveDefaultModelKey(settings: CopilotSettings): string {
  if (settings.useLocalAgentAsDefaultModel) {
    return getVisibleChatModels(settings)[0]
      ? getModelKeyFromModel(getVisibleChatModels(settings)[0])
      : "";
  }

  const activeChatModelKeys = new Set(
    getVisibleChatModels(settings).map((model) => getModelKeyFromModel(model))
  );

  if (settings.defaultModelKey && activeChatModelKeys.has(settings.defaultModelKey)) {
    return settings.defaultModelKey;
  }

  return getVisibleChatModels(settings)[0]
    ? getModelKeyFromModel(getVisibleChatModels(settings)[0])
    : "";
}

/**
 * Resolve a valid embedding model key for the current settings.
 *
 * @param settings - Current Copilot settings.
 * @returns A valid embedding model key.
 */
function resolveEmbeddingModelKey(settings: CopilotSettings): string {
  const activeEmbeddingModelKeys = new Set(
    getVisibleEmbeddingModels(settings).map((model) => getModelKeyFromModel(model))
  );

  if (settings.embeddingModelKey && activeEmbeddingModelKeys.has(settings.embeddingModelKey)) {
    return settings.embeddingModelKey;
  }

  return getVisibleEmbeddingModels(settings)[0]
    ? getModelKeyFromModel(getVisibleEmbeddingModels(settings)[0])
    : "";
}

/**
 * Sets the settings in the atom.
 */
export function setSettings(settings: Partial<CopilotSettings>) {
  const newSettings = mergeAllActiveModelsWithCoreModels({ ...getSettings(), ...settings });
  newSettings.defaultModelKey = resolveDefaultModelKey(newSettings);
  newSettings.embeddingModelKey = resolveEmbeddingModelKey(newSettings);
  settingsStore.set(settingsAtom, newSettings);
}

/**
 * Normalize QA exclusion patterns and guarantee the Copilot folder root is excluded.
 * @param rawValue - Persisted QA exclusion setting value.
 * @returns Encoded QA exclusion patterns string.
 */
export function sanitizeQaExclusions(rawValue: unknown): string {
  const rawValueString = typeof rawValue === "string" ? rawValue : DEFAULT_QA_EXCLUSIONS_SETTING;

  const decodedPatterns: string[] = rawValueString
    .split(",")
    .map((pattern: string) => decodeURIComponent(pattern.trim()))
    .filter((pattern: string) => pattern.length > 0);

  const canonicalToOriginalPattern = new Map<string, string>();

  decodedPatterns.forEach((pattern) => {
    const canonical = pattern.replace(/\/+$/, "");
    const canonicalKey = canonical.length > 0 ? canonical : pattern;
    if (canonicalKey === COPILOT_FOLDER_ROOT) {
      canonicalToOriginalPattern.set(COPILOT_FOLDER_ROOT, COPILOT_FOLDER_ROOT);
      return;
    }
    if (!canonicalToOriginalPattern.has(canonicalKey)) {
      const normalizedValue =
        canonical.length > 0 && pattern.endsWith("/") ? `${canonical}/` : pattern;
      canonicalToOriginalPattern.set(canonicalKey, normalizedValue);
    }
  });

  canonicalToOriginalPattern.set(COPILOT_FOLDER_ROOT, COPILOT_FOLDER_ROOT);

  return Array.from(canonicalToOriginalPattern.values())
    .map((pattern) => encodeURIComponent(pattern))
    .join(",");
}

/**
 * Sets a single setting in the atom.
 */
export function updateSetting<K extends keyof CopilotSettings>(key: K, value: CopilotSettings[K]) {
  const settings = getSettings();
  setSettings({ ...settings, [key]: value });
}

/**
 * Gets the settings from the atom. Use this if you don't need to subscribe to
 * changes.
 */
export function getSettings(): Readonly<CopilotSettings> {
  return settingsStore.get(settingsAtom);
}

/**
 * Resets the settings to the default values.
 */
export function resetSettings(): void {
  const defaultSettingsWithBuiltIns = {
    ...DEFAULT_SETTINGS,
    activeModels: [],
    activeEmbeddingModels: [],
  };
  setSettings(defaultSettingsWithBuiltIns);
}

/**
 * Subscribes to changes in the settings atom.
 */
export function subscribeToSettingsChange(
  callback: (prev: CopilotSettings, next: CopilotSettings) => void
): () => void {
  let previousValue = getSettings();

  return settingsStore.sub(settingsAtom, () => {
    const currentValue = getSettings();
    callback(previousValue, currentValue);
    previousValue = currentValue;
  });
}

/**
 * Hook to get the settings value from the atom.
 */
export function useSettingsValue(): Readonly<CopilotSettings> {
  return useAtomValue(settingsAtom, {
    store: settingsStore,
  });
}

/**
 * Sanitizes the settings to ensure they are valid.
 * Note: This will be better handled by Zod in the future.
 */
export function sanitizeSettings(settings: CopilotSettings): CopilotSettings {
  // If settings is null/undefined, use DEFAULT_SETTINGS
  const settingsToSanitize = settings || DEFAULT_SETTINGS;

  if (!settingsToSanitize.userId) {
    settingsToSanitize.userId = uuidv4();
  }

  if (!Array.isArray(settingsToSanitize.activeModels)) {
    settingsToSanitize.activeModels = [];
  }

  // fix: Maintain consistency between EmbeddingModelProviders.AZURE_OPENAI and ChatModelProviders.AZURE_OPENAI,
  // where it was 'azure_openai' before EmbeddingModelProviders.AZURE_OPENAI.
  if (!settingsToSanitize.activeEmbeddingModels) {
    settingsToSanitize.activeEmbeddingModels = [];
  } else {
    settingsToSanitize.activeEmbeddingModels = settingsToSanitize.activeEmbeddingModels.map((m) => {
      return {
        ...m,
        provider: m.provider === "azure_openai" ? EmbeddingModelProviders.AZURE_OPENAI : m.provider,
      };
    });
  }

  const sanitizedSettings: CopilotSettings = { ...settingsToSanitize };

  // Migration: Rename self-hosted search settings to self-host mode (v3.2.0+)
  const rawSettings = settingsToSanitize as unknown as Record<string, unknown>;
  if (
    rawSettings.enableSelfHostedSearch !== undefined &&
    sanitizedSettings.enableSelfHostMode === undefined
  ) {
    sanitizedSettings.enableSelfHostMode = rawSettings.enableSelfHostedSearch as boolean;
  }
  if (rawSettings.selfHostedSearchUrl !== undefined && !sanitizedSettings.selfHostUrl) {
    sanitizedSettings.selfHostUrl = rawSettings.selfHostedSearchUrl as string;
  }
  if (rawSettings.selfHostedSearchApiKey !== undefined && !sanitizedSettings.selfHostApiKey) {
    sanitizedSettings.selfHostApiKey = rawSettings.selfHostedSearchApiKey as string;
  }

  // Stuff in settings are string even when the interface has number type!
  const temperature = Number(settingsToSanitize.temperature);
  sanitizedSettings.temperature = isNaN(temperature) ? DEFAULT_SETTINGS.temperature : temperature;

  const maxTokens = Number(settingsToSanitize.maxTokens);
  sanitizedSettings.maxTokens = isNaN(maxTokens) ? DEFAULT_SETTINGS.maxTokens : maxTokens;

  const contextTurns = Number(settingsToSanitize.contextTurns);
  sanitizedSettings.contextTurns = isNaN(contextTurns)
    ? DEFAULT_SETTINGS.contextTurns
    : contextTurns;

  const embeddingRequestsPerMin = Number(settingsToSanitize.embeddingRequestsPerMin);
  sanitizedSettings.embeddingRequestsPerMin = isNaN(embeddingRequestsPerMin)
    ? DEFAULT_SETTINGS.embeddingRequestsPerMin
    : embeddingRequestsPerMin;

  const embeddingBatchSize = Number(settingsToSanitize.embeddingBatchSize);
  sanitizedSettings.embeddingBatchSize = isNaN(embeddingBatchSize)
    ? DEFAULT_SETTINGS.embeddingBatchSize
    : embeddingBatchSize;

  // Sanitize lexicalSearchRamLimit (20-1000 MB range)
  const lexicalSearchRamLimit = Number(settingsToSanitize.lexicalSearchRamLimit);
  if (isNaN(lexicalSearchRamLimit)) {
    sanitizedSettings.lexicalSearchRamLimit = DEFAULT_SETTINGS.lexicalSearchRamLimit;
  } else {
    // Clamp to valid range
    sanitizedSettings.lexicalSearchRamLimit = Math.min(1000, Math.max(20, lexicalSearchRamLimit));
  }

  // Ensure autoAddActiveContentToContext has a default value (migrate from old settings)
  if (typeof sanitizedSettings.autoAddActiveContentToContext !== "boolean") {
    // Migration: check old setting first (includeActiveNoteAsContext)
    const oldNoteContext = (settingsToSanitize as unknown as Record<string, unknown>)
      .includeActiveNoteAsContext;
    if (typeof oldNoteContext === "boolean") {
      sanitizedSettings.autoAddActiveContentToContext = oldNoteContext;
    } else {
      sanitizedSettings.autoAddActiveContentToContext =
        DEFAULT_SETTINGS.autoAddActiveContentToContext;
    }
  }

  // Ensure generateAIChatTitleOnSave has a default value
  if (typeof sanitizedSettings.generateAIChatTitleOnSave !== "boolean") {
    sanitizedSettings.generateAIChatTitleOnSave = DEFAULT_SETTINGS.generateAIChatTitleOnSave;
  }

  // Ensure enableMiyo has a default value
  if (typeof sanitizedSettings.enableMiyo !== "boolean") {
    sanitizedSettings.enableMiyo = DEFAULT_SETTINGS.enableMiyo;
  }

  // Migrate legacy miyoVaultName → miyoRemoteVaultPath
  const legacySettings = sanitizedSettings as unknown as Record<string, unknown>;
  if (
    typeof legacySettings["miyoVaultName"] === "string" &&
    !sanitizedSettings.miyoRemoteVaultPath
  ) {
    sanitizedSettings.miyoRemoteVaultPath = legacySettings["miyoVaultName"] as string;
    delete legacySettings["miyoVaultName"];
  }

  // Ensure miyoRemoteVaultPath has a default value
  if (typeof sanitizedSettings.miyoRemoteVaultPath !== "string") {
    sanitizedSettings.miyoRemoteVaultPath = DEFAULT_SETTINGS.miyoRemoteVaultPath;
  }

  // Ensure selfHostSearchProvider is a valid value
  const validSearchProviders = ["firecrawl", "perplexity"] as const;
  if (
    !validSearchProviders.includes(
      sanitizedSettings.selfHostSearchProvider as (typeof validSearchProviders)[number]
    )
  ) {
    sanitizedSettings.selfHostSearchProvider = DEFAULT_SETTINGS.selfHostSearchProvider;
  }

  // Ensure passMarkdownImages has a default value
  if (typeof sanitizedSettings.passMarkdownImages !== "boolean") {
    sanitizedSettings.passMarkdownImages = DEFAULT_SETTINGS.passMarkdownImages;
  }

  // Ensure enableInlineCitations has a default value
  if (typeof sanitizedSettings.enableInlineCitations !== "boolean") {
    sanitizedSettings.enableInlineCitations = DEFAULT_SETTINGS.enableInlineCitations;
  }

  // Ensure enableCustomPromptTemplating has a default value
  if (typeof sanitizedSettings.enableCustomPromptTemplating !== "boolean") {
    sanitizedSettings.enableCustomPromptTemplating = DEFAULT_SETTINGS.enableCustomPromptTemplating;
  }

  // Ensure autonomousAgentMaxIterations has a valid value
  const autonomousAgentMaxIterations = Number(settingsToSanitize.autonomousAgentMaxIterations);
  if (
    isNaN(autonomousAgentMaxIterations) ||
    autonomousAgentMaxIterations < 4 ||
    autonomousAgentMaxIterations > AGENT_MAX_ITERATIONS_LIMIT
  ) {
    sanitizedSettings.autonomousAgentMaxIterations = DEFAULT_SETTINGS.autonomousAgentMaxIterations;
  } else {
    sanitizedSettings.autonomousAgentMaxIterations = autonomousAgentMaxIterations;
  }

  // Ensure autonomousAgentEnabledToolIds is an array
  if (!Array.isArray(sanitizedSettings.autonomousAgentEnabledToolIds)) {
    sanitizedSettings.autonomousAgentEnabledToolIds =
      DEFAULT_SETTINGS.autonomousAgentEnabledToolIds;
  }

  // Migration: rename legacy tool IDs to their new names
  const toolIdRenames: Record<string, string> = {
    writeToFile: "writeFile",
    replaceInFile: "editFile",
  };
  sanitizedSettings.autonomousAgentEnabledToolIds =
    sanitizedSettings.autonomousAgentEnabledToolIds.map((id) => toolIdRenames[id] ?? id);

  // Ensure memoryFolderName has a default value
  if (
    !sanitizedSettings.memoryFolderName ||
    typeof sanitizedSettings.memoryFolderName !== "string"
  ) {
    sanitizedSettings.memoryFolderName = DEFAULT_SETTINGS.memoryFolderName;
  }

  // Ensure enableRecentConversations has a default value
  if (typeof sanitizedSettings.enableRecentConversations !== "boolean") {
    sanitizedSettings.enableRecentConversations = DEFAULT_SETTINGS.enableRecentConversations;
  }

  // Ensure enableSavedMemory has a default value
  if (typeof sanitizedSettings.enableSavedMemory !== "boolean") {
    sanitizedSettings.enableSavedMemory = DEFAULT_SETTINGS.enableSavedMemory;
  }

  // Ensure maxRecentConversations has a valid value (10-50 range)
  const maxRecentConversations = Number(settingsToSanitize.maxRecentConversations);
  if (isNaN(maxRecentConversations) || maxRecentConversations < 10 || maxRecentConversations > 50) {
    sanitizedSettings.maxRecentConversations = DEFAULT_SETTINGS.maxRecentConversations;
  } else {
    sanitizedSettings.maxRecentConversations = maxRecentConversations;
  }

  // Ensure autosaveChat has a default value
  if (typeof sanitizedSettings.autosaveChat !== "boolean") {
    sanitizedSettings.autosaveChat = DEFAULT_SETTINGS.autosaveChat;
  }

  // Ensure autoCompactThreshold has a valid value (64k-1M tokens range)
  const autoCompactThreshold = Number(settingsToSanitize.autoCompactThreshold);
  if (isNaN(autoCompactThreshold)) {
    sanitizedSettings.autoCompactThreshold = DEFAULT_SETTINGS.autoCompactThreshold;
  } else {
    // Clamp to valid range
    sanitizedSettings.autoCompactThreshold = Math.min(
      1000000,
      Math.max(64000, autoCompactThreshold)
    );
  }

  // Ensure quickCommandIncludeNoteContext has a default value
  if (typeof sanitizedSettings.quickCommandIncludeNoteContext !== "boolean") {
    sanitizedSettings.quickCommandIncludeNoteContext =
      DEFAULT_SETTINGS.quickCommandIncludeNoteContext;
  }

  // Ensure quickCommandModelKey is either undefined or a string
  if (
    settingsToSanitize.quickCommandModelKey !== undefined &&
    typeof settingsToSanitize.quickCommandModelKey !== "string"
  ) {
    sanitizedSettings.quickCommandModelKey = DEFAULT_SETTINGS.quickCommandModelKey;
  }

  // Ensure autoAddSelectionToContext has a default value (migrate from old settings)
  if (typeof sanitizedSettings.autoAddSelectionToContext !== "boolean") {
    // Migration: check old setting first (autoIncludeTextSelection)
    const oldTextSelection = (settingsToSanitize as unknown as Record<string, unknown>)
      .autoIncludeTextSelection;
    if (typeof oldTextSelection === "boolean") {
      sanitizedSettings.autoAddSelectionToContext = oldTextSelection;
    } else {
      sanitizedSettings.autoAddSelectionToContext = DEFAULT_SETTINGS.autoAddSelectionToContext;
    }
  }

  // Ensure autoAcceptEdits has a default value
  if (typeof sanitizedSettings.autoAcceptEdits !== "boolean") {
    sanitizedSettings.autoAcceptEdits = DEFAULT_SETTINGS.autoAcceptEdits;
  }

  // Ensure onboarding visibility has a default value
  if (typeof sanitizedSettings.hasSeenOllamaOnboarding !== "boolean") {
    sanitizedSettings.hasSeenOllamaOnboarding = DEFAULT_SETTINGS.hasSeenOllamaOnboarding;
  }

  if (
    typeof sanitizedSettings.lastKOSSetupCheckAt !== "number" &&
    sanitizedSettings.lastKOSSetupCheckAt !== null
  ) {
    sanitizedSettings.lastKOSSetupCheckAt = DEFAULT_SETTINGS.lastKOSSetupCheckAt;
  }

  if (
    sanitizedSettings.lastKOSSetupCheckStatus !== "pass" &&
    sanitizedSettings.lastKOSSetupCheckStatus !== "warn" &&
    sanitizedSettings.lastKOSSetupCheckStatus !== "fail" &&
    sanitizedSettings.lastKOSSetupCheckStatus !== null
  ) {
    sanitizedSettings.lastKOSSetupCheckStatus = DEFAULT_SETTINGS.lastKOSSetupCheckStatus;
  }

  if (typeof sanitizedSettings.privacyLocalMode !== "boolean") {
    sanitizedSettings.privacyLocalMode = DEFAULT_SETTINGS.privacyLocalMode;
  }

  if (typeof sanitizedSettings.useLocalAgentAsDefaultModel !== "boolean") {
    sanitizedSettings.useLocalAgentAsDefaultModel = DEFAULT_SETTINGS.useLocalAgentAsDefaultModel;
  }

  // Ensure defaultSendShortcut has a valid value
  if (!Object.values(SEND_SHORTCUT).includes(sanitizedSettings.defaultSendShortcut)) {
    sanitizedSettings.defaultSendShortcut = DEFAULT_SETTINGS.defaultSendShortcut;
  }

  // Ensure folder settings fall back to defaults when empty/whitespace and migrate legacy defaults.
  const legacyDefaultSaveFolder = `${LEGACY_COPILOT_FOLDER_ROOT}/copilot-conversations`;
  const legacyCustomPromptsFolder = `${LEGACY_COPILOT_FOLDER_ROOT}/copilot-custom-prompts`;
  const legacySystemPromptsFolder = `${LEGACY_COPILOT_FOLDER_ROOT}/system-prompts`;
  const legacyMemoryFolder = `${LEGACY_COPILOT_FOLDER_ROOT}/memory`;
  const legacyConvertedDocOutputFolder = `${LEGACY_COPILOT_FOLDER_ROOT}/converted-docs`;

  sanitizedSettings.defaultSaveFolder = migrateLegacyFolderDefault(
    settingsToSanitize.defaultSaveFolder,
    legacyDefaultSaveFolder,
    DEFAULT_SETTINGS.defaultSaveFolder
  );

  sanitizedSettings.customPromptsFolder = migrateLegacyFolderDefault(
    settingsToSanitize.customPromptsFolder,
    legacyCustomPromptsFolder,
    DEFAULT_SETTINGS.customPromptsFolder
  );

  // Ensure chatHistorySortStrategy has a valid value (exclude "manual" which is only for custom commands)
  if (
    !isSortStrategy(sanitizedSettings.chatHistorySortStrategy) ||
    sanitizedSettings.chatHistorySortStrategy === "manual"
  ) {
    sanitizedSettings.chatHistorySortStrategy = DEFAULT_SETTINGS.chatHistorySortStrategy;
  }

  // Ensure projectListSortStrategy has a valid value (exclude "manual" which is only for custom commands)
  if (
    !isSortStrategy(sanitizedSettings.projectListSortStrategy) ||
    sanitizedSettings.projectListSortStrategy === "manual"
  ) {
    sanitizedSettings.projectListSortStrategy = DEFAULT_SETTINGS.projectListSortStrategy;
  }

  sanitizedSettings.userSystemPromptsFolder = migrateLegacyFolderDefault(
    settingsToSanitize.userSystemPromptsFolder,
    legacySystemPromptsFolder,
    DEFAULT_SETTINGS.userSystemPromptsFolder
  );

  sanitizedSettings.memoryFolderName = migrateLegacyFolderDefault(
    sanitizedSettings.memoryFolderName,
    legacyMemoryFolder,
    DEFAULT_SETTINGS.memoryFolderName
  );

  sanitizedSettings.convertedDocOutputFolder = migrateLegacyFolderDefault(
    settingsToSanitize.convertedDocOutputFolder,
    legacyConvertedDocOutputFolder,
    DEFAULT_SETTINGS.convertedDocOutputFolder
  );

  sanitizedSettings.cleanupFolderConfig = normalizeCleanupFolderConfig(
    typeof settingsToSanitize.cleanupFolderConfig === "object" &&
      settingsToSanitize.cleanupFolderConfig !== null
      ? (settingsToSanitize.cleanupFolderConfig as Partial<CleanupFolderConfig>)
      : DEFAULT_CLEANUP_FOLDER_CONFIG
  );

  sanitizedSettings.cleanupLearnedRules = Array.isArray(settingsToSanitize.cleanupLearnedRules)
    ? settingsToSanitize.cleanupLearnedRules
        .filter(
          (rule): rule is CleanupLearnedRule =>
            !!rule &&
            typeof rule.id === "string" &&
            typeof rule.matcherType === "string" &&
            typeof rule.matchMode === "string" &&
            typeof rule.pattern === "string" &&
            typeof rule.action === "string"
        )
        .map((rule) => ({
          ...rule,
          destinationPath: rule.destinationPath?.trim() || undefined,
          neverHardDelete: !!rule.neverHardDelete,
          notes: rule.notes?.trim() || undefined,
        }))
    : DEFAULT_SETTINGS.cleanupLearnedRules;

  sanitizedSettings.qaExclusions = sanitizeQaExclusions(settingsToSanitize.qaExclusions);

  return sanitizedSettings;
}

function mergeAllActiveModelsWithCoreModels(settings: CopilotSettings): CopilotSettings {
  settings.activeModels = mergeActiveModels(settings.activeModels, []);
  settings.activeEmbeddingModels = filterUnsupportedEmbeddingModels(
    mergeActiveModels(settings.activeEmbeddingModels, [])
  );
  return settings;
}

/**
 * Get a unique model key from a CustomModel instance
 * Format: modelName|provider
 */
export function getModelKeyFromModel(model: CustomModel): string {
  return `${model.name}|${model.provider}`;
}

function mergeActiveModels(
  existingActiveModels: CustomModel[],
  builtInModels: CustomModel[]
): CustomModel[] {
  const modelMap = new Map<string, CustomModel>();

  // Add core models to the map first
  builtInModels
    .filter((model) => model.core)
    .forEach((model) => {
      modelMap.set(getModelKeyFromModel(model), { ...model });
    });

  // Add or update existing models in the map
  existingActiveModels.forEach((model) => {
    const key = getModelKeyFromModel(model);
    const existingModel = modelMap.get(key);
    if (existingModel) {
      // If it's a built-in model, preserve all built-in properties
      const builtInModel = builtInModels.find(
        (m) => m.name === model.name && m.provider === model.provider
      );
      if (builtInModel) {
        modelMap.set(key, {
          ...builtInModel,
          ...model,
          isBuiltIn: true,
          believerExclusive: builtInModel.believerExclusive,
        });
      } else {
        modelMap.set(key, {
          ...model,
          isBuiltIn: existingModel.isBuiltIn,
        });
      }
    } else {
      modelMap.set(key, model);
    }
  });

  return Array.from(modelMap.values());
}

/**
 * Remove embedding models that use unsupported providers.
 *
 * @param models - Embedding models to validate.
 * @returns Filtered list containing only supported providers.
 */
function filterUnsupportedEmbeddingModels(models: CustomModel[]): CustomModel[] {
  const supportedProviders = new Set(Object.values(EmbeddingModelProviders));
  return models.filter((model) =>
    supportedProviders.has(model.provider as EmbeddingModelProviders)
  );
}
