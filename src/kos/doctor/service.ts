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
      status: visibleChatModels.length > 0 ? "pass" : "fail",
      severity: "required",
      message:
        visibleChatModels.length > 0
          ? `${visibleChatModels.length} verified local chat model(s) ready.`
          : "No verified local chat model is selected yet. Chat and first workflows need one local model.",
      action:
        visibleChatModels.length > 0
          ? { label: "No action needed", type: "none" }
          : { label: "Open models", type: "open-settings", targetTab: "knowledge" },
    },
    {
      id: "local-embedding-model",
      label: "Local embedding model",
      status: visibleEmbeddingModels.length > 0 ? "pass" : "warn",
      severity: "recommended",
      message:
        visibleEmbeddingModels.length > 0
          ? `${visibleEmbeddingModels.length} verified local embedding model(s) ready.`
          : "No local embedding model is verified. Chat and Organise still work; semantic search waits.",
      action:
        visibleEmbeddingModels.length > 0
          ? { label: "No action needed", type: "none" }
          : { label: "Open models", type: "open-settings", targetTab: "knowledge" },
    },
    {
      id: "semantic-index",
      label: "Semantic index",
      status: settings.enableSemanticSearchV3
        ? visibleEmbeddingModels.length > 0
          ? "warn"
          : "fail"
        : "skipped",
      severity: "recommended",
      message: settings.enableSemanticSearchV3
        ? visibleEmbeddingModels.length > 0
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
