import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmbeddingManager from "@/LLMProviders/embeddingManager";
import ProjectManager from "@/LLMProviders/projectManager";
import { logError } from "@/logger";
import {
  getDiscoveryManagedChatModels,
  getDiscoveryManagedEmbeddingModels,
  useSettingsValue,
} from "@/settings/model";
import { PLUS_UTM_MEDIUMS } from "@/constants";
import {
  getConfiguredOllamaBaseUrl,
  normalizeOllamaBaseUrl,
  parseOllamaTagsResponse,
  syncDiscoveredOllamaModels,
} from "@/services/ollama/ollamaModelDiscovery";
import {
  getOllamaEmptyStateHint,
  getOllamaMachineProfile,
  getOllamaMachineProfileLabel,
  getOllamaPullRecommendations,
  getOllamaProfileGuidance,
  navigateToPlusPage,
  pickRecommendedOllamaChatModelName,
  pickRecommendedOllamaEmbeddingModelName,
} from "@/plusUtils";
import { err2String } from "@/utils";
import { ExternalLink, Loader2, RefreshCcw, RotateCcw } from "lucide-react";
import { Notice, requestUrl } from "obsidian";
import React, { useEffect, useState } from "react";

type OllamaRuntimeState = "idle" | "checking" | "unreachable" | "empty" | "ready";

interface RuntimeSnapshot {
  state: OllamaRuntimeState;
  message: string;
  modelNames: string[];
}

/**
 * Main section component for local Ollama discovery.
 */
export function LocalServicesSection() {
  const settings = useSettingsValue();
  const discoveredChatModels = getDiscoveryManagedChatModels(settings);
  const discoveredEmbeddingModels = getDiscoveryManagedEmbeddingModels(settings);
  const configuredBaseUrl = getConfiguredOllamaBaseUrl(settings);
  const [baseUrl, setBaseUrl] = useState(configuredBaseUrl);
  const [syncing, setSyncing] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeSnapshot>({
    state: "idle",
    message: "",
    modelNames: [],
  });

  useEffect(() => {
    setBaseUrl(configuredBaseUrl);
  }, [configuredBaseUrl]);

  const machineProfile = getOllamaMachineProfile();
  const profileLabel = getOllamaMachineProfileLabel(machineProfile);
  const pullRecommendations = getOllamaPullRecommendations(machineProfile);
  const recommendedChatModel = pickRecommendedOllamaChatModelName(
    runtime.modelNames,
    machineProfile
  );
  const recommendedEmbeddingModel = pickRecommendedOllamaEmbeddingModelName(runtime.modelNames);

  /**
   * Probe the local Ollama host for reachability and installed models.
   */
  const checkLocalOllama = async () => {
    setRuntime((prev) => ({
      ...prev,
      state: "checking",
      message: "",
    }));

    try {
      const response = await requestUrl({
        url: `${normalizeOllamaBaseUrl(baseUrl || configuredBaseUrl)}/api/tags`,
        method: "GET",
      });
      const modelNames = parseOllamaTagsResponse(response.json);
      const nextState: OllamaRuntimeState = modelNames.length > 0 ? "ready" : "empty";

      setRuntime({
        state: nextState,
        modelNames,
        message:
          nextState === "ready"
            ? `${modelNames.length} local model(s) ready for KOS2.`
            : "Ollama is reachable, but no local models are installed yet.",
      });
    } catch (error) {
      setRuntime({
        state: "unreachable",
        modelNames: [],
        message: err2String(error),
      });
    }
  };

  /**
   * Sync the discovery-managed Ollama inventory against the configured host.
   */
  const handleSync = async () => {
    const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrl || configuredBaseUrl);
    setSyncing(true);

    try {
      await syncDiscoveredOllamaModels({
        baseUrl: normalizedBaseUrl,
        settings,
        chatPing: (model) =>
          ProjectManager.instance.getCurrentChainManager().chatModelManager.ping(model),
        embeddingPing: (model) => EmbeddingManager.getInstance().ping(model),
        notify: (message) => new Notice(message, 5000),
        showSummaryNotice: true,
      });
    } catch (error) {
      logError("Failed to sync local Ollama models from Services.", error);
      new Notice(`Failed to sync local Ollama: ${err2String(error)}`, 6000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="tw-mt-6 tw-border-t tw-border-border tw-pt-4">
      <div className="tw-mb-3 tw-flex tw-items-start tw-justify-between tw-gap-3">
        <div className="tw-flex tw-flex-col">
          <h3 className="tw-m-0 tw-text-base tw-font-bold">Local Ollama</h3>
          <div className="tw-mt-1 tw-text-xs tw-text-muted">
            KOS2 syncs chat and embedding models directly from your local Ollama host.
          </div>
        </div>
        <div className="tw-text-xs tw-text-muted">Profile: {profileLabel}</div>
      </div>

      <div className="tw-space-y-3">
        <div className="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row">
          <Input
            className="tw-max-w-full"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://127.0.0.1:11434"
          />
          <div className="tw-flex tw-gap-2">
            <Button
              onClick={handleSync}
              variant="secondary"
              className="tw-flex tw-items-center tw-gap-2"
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="tw-size-4 tw-animate-spin" />
              ) : (
                <RefreshCcw className="tw-size-4" />
              )}
              Sync Models
            </Button>
            <Button
              onClick={() => setBaseUrl("http://127.0.0.1:11434")}
              variant="ghost"
              className="tw-flex tw-items-center tw-gap-2"
              disabled={syncing}
            >
              <RotateCcw className="tw-size-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="tw-flex tw-flex-col tw-gap-2 tw-rounded-md tw-border tw-border-border tw-p-3">
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
            <div className="tw-flex tw-flex-col">
              <span className="tw-font-medium tw-text-normal">Runtime status</span>
              <span className="tw-text-xs tw-text-muted">
                {normalizeOllamaBaseUrl(baseUrl || configuredBaseUrl)}
              </span>
            </div>
            <Button
              variant="ghost2"
              size="sm"
              className="tw-gap-2"
              onClick={checkLocalOllama}
              disabled={runtime.state === "checking"}
            >
              {runtime.state === "checking" ? (
                <Loader2 className="tw-size-4 tw-animate-spin" />
              ) : (
                <RefreshCcw className="tw-size-4" />
              )}
              Check
            </Button>
          </div>

          <div className="tw-text-sm tw-text-muted">
            {runtime.state === "unreachable" && (
              <>Ollama is not reachable. Start the app or service, then check again.</>
            )}
            {runtime.state === "empty" && <>Ollama is running, but no models are installed yet.</>}
            {runtime.state === "ready" && runtime.message}
            {runtime.state === "checking" && "Checking the local Ollama host..."}
            {runtime.state === "idle" &&
              "Unchecked. KOS2 will not contact Ollama until you choose Check or Sync."}
          </div>

          {runtime.state === "unreachable" && runtime.message && (
            <div className="tw-text-xs tw-text-error">{runtime.message}</div>
          )}

          {(runtime.state === "unreachable" || runtime.state === "empty") && (
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              <Button
                variant="default"
                onClick={() => navigateToPlusPage(PLUS_UTM_MEDIUMS.SETTINGS)}
              >
                Open Ollama
                <ExternalLink className="tw-size-4" />
              </Button>
              <Button variant="secondary" onClick={checkLocalOllama}>
                Try again
              </Button>
            </div>
          )}

          {(runtime.state === "empty" || runtime.state === "ready") && (
            <div className="tw-flex tw-flex-col tw-gap-2 tw-text-xs tw-text-muted">
              <div>{getOllamaProfileGuidance(machineProfile)}</div>
              <div>
                {runtime.state === "ready"
                  ? `Recommended local pair: ${recommendedChatModel ?? "choose the strongest local chat model"} and ${recommendedEmbeddingModel ?? "a general-purpose embedding model"}`
                  : getOllamaEmptyStateHint(machineProfile)}
              </div>
            </div>
          )}

          {runtime.state === "empty" && (
            <div className="tw-grid tw-gap-2 sm:tw-grid-cols-2">
              <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/20">
                <div className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  Suggested chat pull
                </div>
                <div className="tw-mt-2 tw-font-mono tw-text-xs tw-text-normal">
                  {pullRecommendations.chatCommand}
                </div>
              </div>
              <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/20">
                <div className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  Suggested embedding pull
                </div>
                <div className="tw-mt-2 tw-font-mono tw-text-xs tw-text-normal">
                  {pullRecommendations.embeddingCommand}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-text-xs tw-text-muted">
          <div>{`Host: ${normalizeOllamaBaseUrl(baseUrl || configuredBaseUrl)}`}</div>
          <div>{`Chat models in inventory: ${discoveredChatModels.length}`}</div>
          <div>{`Embedding models in inventory: ${discoveredEmbeddingModels.length}`}</div>
        </div>
      </div>
    </div>
  );
}
