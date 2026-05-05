import { VAULT_VECTOR_STORE_STRATEGY } from "@/constants";
import {
  fetchOllamaModelNames,
  getConfiguredOllamaBaseUrl,
} from "@/services/ollama/ollamaModelDiscovery";
import {
  CopilotSettings,
  getSettings,
  getVisibleChatModels,
  getVisibleEmbeddingModels,
} from "@/settings/model";
import { err2String } from "@/utils";
import { KOSDoctorCheck, KOSDoctorReport } from "@/kos/doctor/types";

interface RunKOSDoctorOptions {
  settings?: Readonly<CopilotSettings>;
  fetchModelNames?: (baseUrl: string) => Promise<string[]>;
}

/**
 * Normalize an Ollama model name for readiness comparisons.
 *
 * @param modelName - Model name from settings or `/api/tags`.
 * @returns Trimmed model name.
 */
function normalizeOllamaModelName(modelName: string): string {
  return modelName.trim();
}

/**
 * Return equivalent local Ollama names for readiness checks.
 *
 * Ollama often treats an omitted tag as `:latest`, while `/api/tags` returns the explicit tag.
 *
 * @param modelName - Model name from settings.
 * @returns Candidate names that can refer to the same local model.
 */
function getOllamaModelNameCandidates(modelName: string): string[] {
  const normalizedName = normalizeOllamaModelName(modelName);

  if (!normalizedName) {
    return [];
  }

  if (normalizedName.includes(":")) {
    return [normalizedName];
  }

  return [normalizedName, `${normalizedName}:latest`];
}

/**
 * Check whether a configured Ollama model is still installed locally.
 *
 * @param modelName - Configured model name.
 * @param installedModelNames - Names returned by local Ollama `/api/tags`.
 * @returns True when the configured model is present in the local inventory.
 */
function isInstalledOllamaModel(
  modelName: string,
  installedModelNames: readonly string[]
): boolean {
  const installedNameSet = new Set(installedModelNames.map(normalizeOllamaModelName));
  return getOllamaModelNameCandidates(modelName).some((candidate) =>
    installedNameSet.has(candidate)
  );
}

/**
 * Summarize individual doctor checks into a single status.
 *
 * @param checks - Doctor checks to summarize.
 * @returns Summary status for settings and command surfaces.
 */
export function summarizeKOSDoctorChecks(
  checks: readonly KOSDoctorCheck[]
): KOSDoctorReport["summaryStatus"] {
  if (checks.some((check) => check.severity === "required" && check.status === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.status === "warn" || check.status === "fail")) {
    return "warn";
  }

  return "pass";
}

/**
 * Run the KOS2 setup doctor without throwing for normal readiness failures.
 *
 * @param options - Optional settings and Ollama fetch adapter for tests.
 * @returns A doctor report with required, recommended, and optional checks.
 */
export async function runKOSDoctor(options: RunKOSDoctorOptions = {}): Promise<KOSDoctorReport> {
  const settings = options.settings ?? getSettings();
  const baseUrl = getConfiguredOllamaBaseUrl(settings);
  const fetchModelNames = options.fetchModelNames ?? fetchOllamaModelNames;
  const visibleChatModels = getVisibleChatModels(settings);
  const visibleEmbeddingModels = getVisibleEmbeddingModels(settings);
  let installedModelNames: string[] = [];
  let ollamaError = "";

  try {
    installedModelNames = await fetchModelNames(baseUrl);
  } catch (error) {
    ollamaError = err2String(error);
  }

  const ollamaReachable = !ollamaError;
  const verifiedInstalledChatModels = ollamaReachable
    ? visibleChatModels.filter((model) => isInstalledOllamaModel(model.name, installedModelNames))
    : [];
  const verifiedInstalledEmbeddingModels = ollamaReachable
    ? visibleEmbeddingModels.filter((model) =>
        isInstalledOllamaModel(model.name, installedModelNames)
      )
    : [];
  const staleChatModelCount = visibleChatModels.length - verifiedInstalledChatModels.length;
  const staleEmbeddingModelCount =
    visibleEmbeddingModels.length - verifiedInstalledEmbeddingModels.length;

  const checks: KOSDoctorCheck[] = [
    {
      id: "plugin-loaded",
      label: "KOS2 plugin",
      status: "pass",
      severity: "required",
      message: "KOS2 loaded inside Obsidian.",
      action: { label: "No action needed", type: "none" },
    },
    {
      id: "settings-valid",
      label: "Settings",
      status: "pass",
      severity: "required",
      message: "Settings were loaded and sanitized.",
      action: { label: "No action needed", type: "none" },
    },
    {
      id: "ollama-reachable",
      label: "Local Ollama",
      status: ollamaReachable ? (installedModelNames.length > 0 ? "pass" : "warn") : "fail",
      severity: "required",
      message: ollamaReachable
        ? installedModelNames.length > 0
          ? `${installedModelNames.length} local model(s) found at ${baseUrl}.`
          : `Ollama is reachable at ${baseUrl}, but it has no local models yet.`
        : `KOS2 cannot reach local Ollama at ${baseUrl}. ${ollamaError}`,
      action: ollamaReachable
        ? { label: "Sync models", type: "sync-models", targetTab: "knowledge" }
        : { label: "Retry", type: "retry" },
    },
    {
      id: "local-chat-model",
      label: "Local chat model",
      status: verifiedInstalledChatModels.length > 0 ? "pass" : "fail",
      severity: "required",
      message: !ollamaReachable
        ? "Local chat model cannot be verified because local Ollama is unreachable."
        : verifiedInstalledChatModels.length > 0
          ? staleChatModelCount > 0
            ? `${verifiedInstalledChatModels.length} local chat model(s) ready. ${staleChatModelCount} saved model(s) are no longer installed; sync models to clean them up.`
            : `${verifiedInstalledChatModels.length} local chat model(s) ready.`
          : visibleChatModels.length > 0
            ? "Saved chat model(s) are not installed in local Ollama anymore. Sync models or pull a local chat model before running KOS2 workflows."
            : "No verified local chat model is selected yet. Chat and first workflows need one local model.",
      action:
        verifiedInstalledChatModels.length > 0
          ? { label: "No action needed", type: "none" }
          : ollamaReachable
            ? { label: "Sync models", type: "sync-models", targetTab: "knowledge" }
            : { label: "Retry", type: "retry" },
    },
    {
      id: "local-embedding-model",
      label: "Local embedding model",
      status: verifiedInstalledEmbeddingModels.length > 0 ? "pass" : "warn",
      severity: "recommended",
      message: !ollamaReachable
        ? "Local embedding model cannot be verified because local Ollama is unreachable. Chat setup is checked first."
        : verifiedInstalledEmbeddingModels.length > 0
          ? staleEmbeddingModelCount > 0
            ? `${verifiedInstalledEmbeddingModels.length} local embedding model(s) ready. ${staleEmbeddingModelCount} saved embedding model(s) are no longer installed; sync models to clean them up.`
            : `${verifiedInstalledEmbeddingModels.length} local embedding model(s) ready.`
          : visibleEmbeddingModels.length > 0
            ? "Saved embedding model(s) are not installed in local Ollama anymore. Chat still works; semantic search needs a synced local embedding model."
            : "No local embedding model is verified. Chat and Organise still work; semantic search waits.",
      action:
        verifiedInstalledEmbeddingModels.length > 0
          ? { label: "No action needed", type: "none" }
          : ollamaReachable
            ? { label: "Sync models", type: "sync-models", targetTab: "knowledge" }
            : { label: "Retry", type: "retry" },
    },
    {
      id: "semantic-index",
      label: "Semantic index",
      status: settings.enableSemanticSearchV3
        ? verifiedInstalledEmbeddingModels.length > 0
          ? "warn"
          : "fail"
        : "skipped",
      severity: "recommended",
      message: settings.enableSemanticSearchV3
        ? verifiedInstalledEmbeddingModels.length > 0
          ? "Semantic search is enabled. Rebuild the index after model or vault changes."
          : "Semantic search is enabled, but no local embedding model is ready."
        : "Semantic search is off. KOS2 will use lexical search until you build an index.",
      action: settings.enableSemanticSearchV3
        ? { label: "Build index", type: "build-index", targetTab: "knowledge" }
        : { label: "Open Knowledge", type: "open-settings", targetTab: "knowledge" },
    },
    {
      id: "auto-indexing",
      label: "Auto-indexing",
      status:
        settings.indexVaultToVectorStore === VAULT_VECTOR_STORE_STRATEGY.ON_STARTUP
          ? "warn"
          : "pass",
      severity: "recommended",
      message:
        settings.indexVaultToVectorStore === VAULT_VECTOR_STORE_STRATEGY.ON_STARTUP
          ? "Auto-index on startup is enabled. Manual indexing is safer for first-run reliability."
          : "KOS2 is not configured to build the semantic index on startup.",
      action:
        settings.indexVaultToVectorStore === VAULT_VECTOR_STORE_STRATEGY.ON_STARTUP
          ? { label: "Open Knowledge", type: "open-settings", targetTab: "knowledge" }
          : { label: "No action needed", type: "none" },
    },
    {
      id: "ollama-cloud",
      label: "Ollama Cloud",
      status: settings.ollamaCloudApiKey?.trim() ? "pass" : "skipped",
      severity: "optional",
      message: settings.ollamaCloudApiKey?.trim()
        ? "Ollama Cloud key is configured for optional web search and web fetch."
        : "No Ollama Cloud key configured. Local-only chat and workflows can still run.",
      action: { label: "Open setup", type: "open-settings", targetTab: "setup" },
    },
    {
      id: "diagnostics-log",
      label: "Diagnostics log",
      status: "pass",
      severity: "optional",
      message: "A sanitized diagnostics log can be created when needed.",
      action: { label: "Open log", type: "open-log" },
    },
  ];

  return {
    generatedAt: Date.now(),
    baseUrl,
    installedModelCount: installedModelNames.length,
    summaryStatus: summarizeKOSDoctorChecks(checks),
    checks,
  };
}

/**
 * Format a doctor report for clipboard sharing without secrets.
 *
 * @param report - Doctor report to format.
 * @returns Markdown diagnostics summary.
 */
export function formatKOSDoctorReport(report: KOSDoctorReport): string {
  const lines = [
    "# KOS2 Doctor",
    `Generated: ${new Date(report.generatedAt).toISOString()}`,
    `Summary: ${report.summaryStatus}`,
    `Ollama host: ${report.baseUrl}`,
    `Installed model count: ${report.installedModelCount}`,
    "",
    "## Checks",
    ...report.checks.map(
      (check) =>
        `- ${check.status.toUpperCase()} [${check.severity}] ${check.label}: ${check.message}`
    ),
  ];

  return lines.join("\n");
}
