import { CustomModel } from "@/aiParams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingItem } from "@/components/ui/setting-item";
import EmbeddingManager from "@/LLMProviders/embeddingManager";
import ProjectManager from "@/LLMProviders/projectManager";
import { logError } from "@/logger";
import {
  createOllamaLibraryUrl,
  getOllamaCatalogRecommendations,
  getOllamaMachineCapabilities,
  getOllamaMachineProfile,
  getOllamaMachineProfileLabel,
  getOllamaProfileGuidance,
  navigateToOllamaLibrary,
} from "@/plusUtils";
import {
  fetchOllamaModelNames,
  getConfiguredOllamaBaseUrl,
  looksLikeOllamaEmbeddingModelName,
  syncDiscoveredOllamaModels,
} from "@/services/ollama/ollamaModelDiscovery";
import {
  CopilotSettings,
  getDiscoveryManagedChatModels,
  getDiscoveryManagedEmbeddingModels,
  setSettings,
  updateSetting,
  useSettingsValue,
} from "@/settings/model";
import { ModelEditModal } from "@/settings/v2/components/ModelEditDialog";
import { ModelTable } from "@/settings/v2/components/ModelTable";
import { err2String } from "@/utils";
import { Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Notice } from "obsidian";
import React, { useMemo, useState } from "react";

type LocalInventoryState = "idle" | "checking" | "unreachable" | "empty" | "ready";

interface LocalInventorySnapshot {
  state: LocalInventoryState;
  message: string;
  modelNames: string[];
}

/**
 * Render a compact inventory status badge.
 *
 * @param props - Badge props.
 * @returns Status badge for the local Ollama runtime.
 */
function InventoryStatusBadge({ state }: { state: LocalInventoryState }) {
  const labelMap: Record<LocalInventoryState, string> = {
    idle: "Unchecked",
    checking: "Checking",
    unreachable: "Unavailable",
    empty: "No models",
    ready: "Ready",
  };

  const classNameMap: Record<LocalInventoryState, string> = {
    idle: "tw-text-muted",
    checking: "tw-text-muted",
    unreachable: "tw-text-error",
    empty: "tw-text-warning",
    ready: "tw-text-success",
  };

  return (
    <Badge variant="outline" className={classNameMap[state]}>
      {labelMap[state]}
    </Badge>
  );
}

/**
 * Copy text to the clipboard and notify the user.
 *
 * @param text - Text to copy.
 * @param successMessage - Notice shown when the copy succeeds.
 */
async function copyTextToClipboard(text: string, successMessage: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    new Notice("Clipboard is not available in this environment.", 4000);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    new Notice(successMessage, 4000);
  } catch (error) {
    logError("Failed to copy text to clipboard.", error);
    new Notice("Failed to copy to clipboard.", 4000);
  }
}

/**
 * Return status chips describing how KOS2 can use a local Ollama model.
 *
 * @param modelName - Local Ollama model name.
 * @param verifiedChatNames - Verified chat-capable model names.
 * @param verifiedEmbeddingNames - Verified embedding-capable model names.
 * @returns Labels for the local model row.
 */
function getLocalModelUsageLabels(
  modelName: string,
  verifiedChatNames: Set<string>,
  verifiedEmbeddingNames: Set<string>
): string[] {
  const labels: string[] = [];

  if (verifiedChatNames.has(modelName)) {
    labels.push("Chat ready");
  }
  if (verifiedEmbeddingNames.has(modelName)) {
    labels.push("Embedding ready");
  }
  if (labels.length === 0) {
    labels.push("Local only");
  }

  return labels;
}

/**
 * Knowledge settings for Ollama inventory, verification, and runtime tuning.
 *
 * @returns Model settings surface.
 */
export const ModelSettings: React.FC = () => {
  const settings = useSettingsValue();
  const visibleChatModels = getDiscoveryManagedChatModels(settings);
  const visibleEmbeddingModels = getDiscoveryManagedEmbeddingModels(settings);
  const ollamaBaseUrl = getConfiguredOllamaBaseUrl(settings);
  const machineProfile = getOllamaMachineProfile();
  const profileLabel = getOllamaMachineProfileLabel(machineProfile);
  const machineCapabilities = getOllamaMachineCapabilities();
  const catalogRecommendations = getOllamaCatalogRecommendations(machineProfile);
  const cloudConfigured = Boolean(settings.ollamaCloudApiKey?.trim());

  const [localInventory, setLocalInventory] = useState<LocalInventorySnapshot>({
    state: "idle",
    message: "",
    modelNames: [],
  });
  const [customPullModel, setCustomPullModel] = useState("");
  const [syncing, setSyncing] = useState(false);

  const verifiedChatNames = useMemo(
    () => new Set(visibleChatModels.map((model) => model.name)),
    [visibleChatModels]
  );
  const verifiedEmbeddingNames = useMemo(
    () => new Set(visibleEmbeddingModels.map((model) => model.name)),
    [visibleEmbeddingModels]
  );
  const likelyEmbeddingModelNames = useMemo(
    () =>
      localInventory.modelNames.filter((modelName) => looksLikeOllamaEmbeddingModelName(modelName)),
    [localInventory.modelNames]
  );

  /**
   * Refresh the full local Ollama inventory from `/api/tags`.
   */
  const refreshLocalInventory = async () => {
    setLocalInventory((previous) => ({
      ...previous,
      state: "checking",
      message: "",
    }));

    try {
      const modelNames = await fetchOllamaModelNames(ollamaBaseUrl);

      setLocalInventory({
        state: modelNames.length > 0 ? "ready" : "empty",
        message:
          modelNames.length > 0
            ? `${modelNames.length} local Ollama model(s) detected on this host.`
            : "Ollama is reachable, but no local models are installed yet.",
        modelNames,
      });
    } catch (error) {
      setLocalInventory({
        state: "unreachable",
        message: err2String(error),
        modelNames: [],
      });
    }
  };

  const onDeleteModel = (modelKey: string) => {
    const [modelName, provider] = modelKey.split("|");
    const updatedActiveModels = settings.activeModels.filter(
      (model) => !(model.name === modelName && model.provider === provider)
    );

    let newDefaultModelKey = settings.defaultModelKey;
    if (modelKey === settings.defaultModelKey) {
      const newDefaultModel = updatedActiveModels.find((model) => model.enabled);
      newDefaultModelKey = newDefaultModel
        ? `${newDefaultModel.name}|${newDefaultModel.provider}`
        : "";
    }

    setSettings({
      activeModels: updatedActiveModels,
      defaultModelKey: newDefaultModelKey,
    });
  };

  const handleModelUpdate = (
    isEmbeddingModel: boolean,
    originalModel: CustomModel,
    updatedModel: CustomModel
  ) => {
    const settingField: keyof CopilotSettings = isEmbeddingModel
      ? "activeEmbeddingModels"
      : "activeModels";

    const modelIndex = settings[settingField].findIndex(
      (model) => model.name === originalModel.name && model.provider === originalModel.provider
    );
    if (modelIndex !== -1) {
      const updatedModels = [...settings[settingField]];
      updatedModels[modelIndex] = updatedModel;
      updateSetting(settingField, updatedModels);
    } else {
      new Notice("Could not find model to update");
      logError("Could not find model to update:", originalModel);
    }
  };

  const handleTableUpdate = (updatedModel: CustomModel) => {
    const updatedModels = settings.activeModels.map((model) =>
      model.name === updatedModel.name && model.provider === updatedModel.provider
        ? updatedModel
        : model
    );
    updateSetting("activeModels", updatedModels);
  };

  const onDeleteEmbeddingModel = (modelKey: string) => {
    const [modelName, provider] = modelKey.split("|");
    const updatedModels = settings.activeEmbeddingModels.filter(
      (model) => !(model.name === modelName && model.provider === provider)
    );
    updateSetting("activeEmbeddingModels", updatedModels);
  };

  const handleEmbeddingModelUpdate = (updatedModel: CustomModel) => {
    const updatedModels = settings.activeEmbeddingModels.map((model) =>
      model.name === updatedModel.name && model.provider === updatedModel.provider
        ? updatedModel
        : model
    );
    updateSetting("activeEmbeddingModels", updatedModels);
  };

  /**
   * Sync the verified KOS2-capable subset from the local Ollama inventory.
   */
  const handleRefreshOllamaModels = async () => {
    try {
      setSyncing(true);
      await syncDiscoveredOllamaModels({
        settings,
        chatPing: (model) =>
          ProjectManager.instance.getCurrentChainManager().chatModelManager.ping(model),
        embeddingPing: (model) => EmbeddingManager.getInstance().ping(model),
        notify: (message) => new Notice(message, 5000),
        showSummaryNotice: true,
      });
      await refreshLocalInventory();
    } catch (error) {
      logError("Failed to sync local Ollama inventory.", error);
      new Notice(`Failed to sync Ollama models: ${err2String(error)}`, 6000);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditModel = (model: CustomModel, isEmbeddingModel: boolean = false) => {
    const modal = new ModelEditModal(app, model, isEmbeddingModel, handleModelUpdate);
    modal.open();
  };

  const customPullCommand = customPullModel.trim() ? `ollama pull ${customPullModel.trim()}` : "";

  return (
    <div className="tw-space-y-6">
      <section className="tw-space-y-4">
        <div className="tw-flex tw-flex-col tw-gap-3 lg:tw-flex-row lg:tw-items-start lg:tw-justify-between">
          <div>
            <div className="tw-text-xl tw-font-bold">Local Models</div>
            <div className="tw-text-sm tw-text-muted">
              Track what is installed in Ollama, what KOS2 has verified, and what this machine can
              comfortably use.
            </div>
          </div>
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            <Button
              variant="secondary"
              onClick={() => void refreshLocalInventory()}
              disabled={localInventory.state === "checking" || syncing}
              className="tw-gap-2"
            >
              {localInventory.state === "checking" ? (
                <Loader2 className="tw-size-4 tw-animate-spin" />
              ) : (
                <RefreshCw className="tw-size-4" />
              )}
              Check installed models
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleRefreshOllamaModels()}
              disabled={syncing}
              className="tw-gap-2"
            >
              {syncing ? (
                <Loader2 className="tw-size-4 tw-animate-spin" />
              ) : (
                <RefreshCw className="tw-size-4" />
              )}
              Verify KOS2 models
            </Button>
            <Button variant="ghost" onClick={navigateToOllamaLibrary} className="tw-gap-2">
              Browse Ollama Library
              <ExternalLink className="tw-size-4" />
            </Button>
          </div>
        </div>

        <div className="tw-grid tw-gap-4 xl:tw-grid-cols-[1.25fr_1fr]">
          <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
            <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-start sm:tw-justify-between">
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                  <div className="tw-font-semibold tw-text-normal">Local Ollama host</div>
                  <InventoryStatusBadge state={localInventory.state} />
                </div>
                <div className="tw-text-xs tw-text-muted">{ollamaBaseUrl}</div>
              </div>
              <Badge variant="outline">{profileLabel}</Badge>
            </div>

            <div className="tw-mt-3 tw-text-sm tw-text-muted">
              {localInventory.state === "unreachable" && (
                <>
                  Ollama is not reachable. Start the Ollama app or service, then refresh this
                  inventory.
                </>
              )}
              {localInventory.state === "empty" && (
                <>Ollama is reachable, but no local models are installed yet.</>
              )}
              {localInventory.state === "ready" && localInventory.message}
              {localInventory.state === "checking" && "Checking the local Ollama host..."}
              {localInventory.state === "idle" &&
                "Unchecked. KOS2 will not contact Ollama until you refresh this inventory."}
            </div>

            {localInventory.state === "unreachable" && localInventory.message && (
              <div className="tw-mt-2 tw-text-xs tw-text-error">{localInventory.message}</div>
            )}

            <div className="tw-mt-4 tw-grid tw-gap-3 md:tw-grid-cols-3">
              <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
                <div className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  Installed in Ollama
                </div>
                <div className="tw-mt-2 tw-text-2xl tw-font-semibold tw-text-normal">
                  {localInventory.modelNames.length}
                </div>
              </div>
              <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
                <div className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  Verified for chat
                </div>
                <div className="tw-mt-2 tw-text-2xl tw-font-semibold tw-text-normal">
                  {visibleChatModels.length}
                </div>
              </div>
              <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
                <div className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  Verified for embeddings
                </div>
                <div className="tw-mt-2 tw-text-2xl tw-font-semibold tw-text-normal">
                  {visibleEmbeddingModels.length}
                </div>
              </div>
            </div>

            <div className="tw-mt-4 tw-text-sm tw-text-muted">
              {getOllamaProfileGuidance(machineProfile)}
            </div>
          </div>

          <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-font-semibold tw-text-normal">Pull new models</div>
              <Badge variant="outline">Recommended for {profileLabel.toLowerCase()}</Badge>
            </div>
            <div className="tw-mt-2 tw-text-sm tw-text-muted">
              Copy a ready-to-run pull command, install the model in Ollama, then rescan.
            </div>

            <div className="tw-mt-4 tw-space-y-3">
              {catalogRecommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70"
                >
                  <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
                    <div className="tw-flex tw-flex-col tw-gap-1">
                      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                        <span className="tw-font-medium tw-text-normal">
                          {recommendation.title}
                        </span>
                        {recommendation.recommended && (
                          <Badge variant="outline" className="tw-text-success">
                            Best fit
                          </Badge>
                        )}
                        <Badge variant="secondary">{recommendation.kind}</Badge>
                      </div>
                      <div className="tw-text-xs tw-text-muted">{recommendation.description}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="tw-gap-2"
                      onClick={() =>
                        void copyTextToClipboard(
                          recommendation.command,
                          `Copied '${recommendation.command}' to clipboard.`
                        )
                      }
                    >
                      <Copy className="tw-size-4" />
                      Copy pull
                    </Button>
                  </div>
                  <div className="tw-mt-2 tw-font-mono tw-text-xs tw-text-normal">
                    {recommendation.command}
                  </div>
                </div>
              ))}

              <div className="tw-rounded-md tw-border tw-border-dashed tw-border-border tw-p-3">
                <div className="tw-text-sm tw-font-medium tw-text-normal">Custom pull command</div>
                <div className="tw-mt-1 tw-text-xs tw-text-muted">
                  Paste any model name from the Ollama library and copy the command.
                </div>
                <div className="tw-mt-3 tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row">
                  <Input
                    value={customPullModel}
                    onChange={(event) => setCustomPullModel(event.target.value)}
                    placeholder="for example: llama3.1:8b"
                  />
                  <Button
                    variant="secondary"
                    className="tw-gap-2"
                    disabled={!customPullCommand}
                    onClick={() =>
                      void copyTextToClipboard(
                        customPullCommand,
                        `Copied '${customPullCommand}' to clipboard.`
                      )
                    }
                  >
                    <Copy className="tw-size-4" />
                    Copy pull
                  </Button>
                </div>
                <div className="tw-mt-2 tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-xs tw-text-muted">
                  <span>Need ideas?</span>
                  <a
                    className="tw-inline-flex tw-items-center tw-gap-1 tw-text-accent hover:tw-underline"
                    href={createOllamaLibraryUrl()}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open supported models
                    <ExternalLink className="tw-size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="tw-grid tw-gap-4 lg:tw-grid-cols-2">
          <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-font-semibold tw-text-normal">Ollama Cloud</div>
              <Badge
                variant="outline"
                className={cloudConfigured ? "tw-text-success" : "tw-text-muted"}
              >
                {cloudConfigured ? "Configured" : "Optional"}
              </Badge>
            </div>
            <div className="tw-mt-2 tw-text-sm tw-text-muted">
              Cloud is only used for web search and web fetch. It does not power local chat or local
              embeddings in KOS2.
            </div>
            <div className="tw-mt-3 tw-grid tw-gap-2 sm:tw-grid-cols-2">
              <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
                <div className="tw-text-[11px] tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  Local chat
                </div>
                <div className="tw-mt-1 tw-text-sm tw-font-medium tw-text-normal">Ollama Local</div>
              </div>
              <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
                <div className="tw-text-[11px] tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  Web search
                </div>
                <div className="tw-mt-1 tw-text-sm tw-font-medium tw-text-normal">
                  {cloudConfigured ? "Ollama Cloud ready" : "Optional cloud key"}
                </div>
              </div>
            </div>
          </div>

          <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-font-semibold tw-text-normal">Local machine capability</div>
              <Badge variant="outline">{machineCapabilities.profileLabel}</Badge>
            </div>
            <div className="tw-mt-2 tw-text-sm tw-text-muted">
              KOS2 estimates the local machine so the recommended chat and embedding path stays
              usable on desktop.
            </div>
            <div className="tw-mt-3 tw-grid tw-gap-2 sm:tw-grid-cols-2">
              <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
                <div className="tw-text-[11px] tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  CPU threads
                </div>
                <div className="tw-mt-1 tw-text-sm tw-font-medium tw-text-normal">
                  {machineCapabilities.cpuThreads || "Unknown"}
                </div>
              </div>
              <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
                <div className="tw-text-[11px] tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  RAM hint
                </div>
                <div className="tw-mt-1 tw-text-sm tw-font-medium tw-text-normal">
                  {machineCapabilities.memoryGb
                    ? `${machineCapabilities.memoryGb} GB`
                    : "Unavailable"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {localInventory.state === "ready" &&
          likelyEmbeddingModelNames.length > 0 &&
          visibleEmbeddingModels.length < likelyEmbeddingModelNames.length && (
            <div className="tw-rounded-lg tw-border tw-p-3 tw-text-sm tw-text-warning tw-bg-warning/10 tw-border-warning/40">
              KOS2 detected {likelyEmbeddingModelNames.length} local embedding-like model(s) on this
              host. If one is still missing below, run <strong>Sync verified models</strong> again.
            </div>
          )}

        <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
          <div className="tw-flex tw-flex-col tw-gap-1 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
            <div className="tw-font-semibold tw-text-normal">All local Ollama models</div>
            <div className="tw-text-xs tw-text-muted">
              This list comes directly from <code>/api/tags</code>. KOS2 selectors only use models
              after verification.
            </div>
          </div>

          {localInventory.modelNames.length > 0 ? (
            <div className="tw-mt-4 tw-grid tw-gap-3 md:tw-grid-cols-2">
              {localInventory.modelNames.map((modelName) => {
                const usageLabels = getLocalModelUsageLabels(
                  modelName,
                  verifiedChatNames,
                  verifiedEmbeddingNames
                );

                return (
                  <div
                    key={modelName}
                    className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70"
                  >
                    <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
                      <div className="tw-min-w-0 tw-flex-1">
                        <div className="tw-break-all tw-font-medium tw-text-normal">
                          {modelName}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="tw-gap-1"
                        onClick={() =>
                          void copyTextToClipboard(
                            `ollama pull ${modelName}`,
                            `Copied 'ollama pull ${modelName}' to clipboard.`
                          )
                        }
                      >
                        <Copy className="tw-size-3.5" />
                        Pull
                      </Button>
                    </div>
                    <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
                      {usageLabels.map((label) => (
                        <Badge
                          key={label}
                          variant={label === "Local only" ? "outline" : "secondary"}
                          className={
                            label === "Local only"
                              ? "tw-text-muted"
                              : label === "Chat ready"
                                ? "tw-text-success"
                                : "tw-text-accent"
                          }
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="tw-mt-4 tw-rounded-md tw-border tw-border-dashed tw-border-border tw-p-4 tw-text-sm tw-text-muted">
              {localInventory.state === "unreachable"
                ? "KOS2 cannot reach the configured Ollama host yet."
                : "No local models detected yet. Use the pull commands above, then check installed models."}
            </div>
          )}
        </div>

        <section className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
          <details>
            <summary className="tw-cursor-pointer tw-select-none tw-text-sm tw-font-semibold">
              Advanced verified model tables
            </summary>
            <div className="tw-mt-4 tw-space-y-4">
              <ModelTable
                models={visibleChatModels}
                onEdit={(model) => handleEditModel(model)}
                onDelete={onDeleteModel}
                onUpdateModel={handleTableUpdate}
                title="Verified Local Chat Models"
              />

              <ModelTable
                models={visibleEmbeddingModels}
                onEdit={(model) => handleEditModel(model, true)}
                onDelete={onDeleteEmbeddingModel}
                onUpdateModel={handleEmbeddingModelUpdate}
                title="Local Embedding Models for KOS2"
              />
            </div>
          </details>
        </section>
      </section>

      <section className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
        <details>
          <summary className="tw-cursor-pointer tw-select-none tw-text-sm tw-font-semibold">
            Advanced runtime tuning
          </summary>
          <div className="tw-mt-4 tw-space-y-4">
            <SettingItem
              type="slider"
              title="Conversation turns in context"
              description="The number of previous conversation turns to include in the context."
              value={settings.contextTurns}
              onChange={(value) => updateSetting("contextTurns", value)}
              min={1}
              max={50}
              step={1}
            />
            <SettingItem
              type="slider"
              title="Auto-compact threshold"
              description="Automatically summarize context when it exceeds this token count."
              min={64000}
              max={1000000}
              step={64000}
              value={settings.autoCompactThreshold}
              onChange={(value) => updateSetting("autoCompactThreshold", value)}
            />
          </div>
        </details>
      </section>
    </div>
  );
};
