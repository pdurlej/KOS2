import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PLUS_UTM_MEDIUMS } from "@/constants";
import {
  getConfiguredOllamaBaseUrl,
  parseOllamaTagsResponse,
} from "@/services/ollama/ollamaModelDiscovery";
import { updateSetting, useSettingsValue } from "@/settings/model";
import {
  getOllamaEmptyStateHint,
  getOllamaMachineCapabilities,
  getOllamaMachineProfile,
  getOllamaMachineProfileLabel,
  getOllamaPullRecommendations,
  getOllamaProfileGuidance,
  navigateToPlusPage,
  pickRecommendedOllamaChatModelName,
  pickRecommendedOllamaEmbeddingModelName,
} from "@/plusUtils";
import { err2String } from "@/utils";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Notice, requestUrl } from "obsidian";
import React, { useEffect, useState } from "react";

type OllamaRuntimeState = "idle" | "checking" | "unreachable" | "empty" | "ready";

interface RuntimeSnapshot {
  state: OllamaRuntimeState;
  message: string;
  modelNames: string[];
}

function RuntimeBadge({ state }: { state: OllamaRuntimeState }) {
  const labelMap: Record<OllamaRuntimeState, string> = {
    idle: "Unchecked",
    checking: "Checking",
    unreachable: "Unavailable",
    empty: "No models",
    ready: "Ready",
  };

  const classNameMap: Record<OllamaRuntimeState, string> = {
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

export function PlusSettings() {
  const settings = useSettingsValue();
  const [localCloudKey, setLocalCloudKey] = useState(settings.ollamaCloudApiKey || "");
  const [runtime, setRuntime] = useState<RuntimeSnapshot>({
    state: "idle",
    message: "",
    modelNames: [],
  });

  useEffect(() => {
    setLocalCloudKey(settings.ollamaCloudApiKey || "");
  }, [settings.ollamaCloudApiKey]);

  const ollamaBaseUrl = getConfiguredOllamaBaseUrl(settings);
  const machineProfile = getOllamaMachineProfile();
  const profileLabel = getOllamaMachineProfileLabel(machineProfile);
  const machineCapabilities = getOllamaMachineCapabilities();
  const pullRecommendations = getOllamaPullRecommendations(machineProfile);
  const recommendedChatModel = pickRecommendedOllamaChatModelName(
    runtime.modelNames,
    machineProfile
  );
  const recommendedEmbeddingModel = pickRecommendedOllamaEmbeddingModelName(runtime.modelNames);
  const isPrivacyLocalMode = settings.privacyLocalMode;

  const checkLocalOllama = async () => {
    setRuntime((prev) => ({
      ...prev,
      state: "checking",
      message: "",
    }));

    try {
      const response = await requestUrl({
        url: `${ollamaBaseUrl}/api/tags`,
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

  useEffect(() => {
    void checkLocalOllama();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runtime check should rerun when the resolved host changes
  }, [ollamaBaseUrl]);

  const showRecommendation = runtime.state === "empty" || runtime.state === "ready";

  return (
    <section className="tw-flex tw-flex-col tw-gap-4 tw-rounded-lg tw-bg-secondary tw-p-4">
      <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <div className="tw-flex tw-items-center tw-gap-2 tw-text-xl tw-font-bold">
            <span>Local Ollama</span>
            <Badge variant="outline" className="tw-text-success">
              Primary runtime
            </Badge>
            {isPrivacyLocalMode && (
              <Badge variant="outline" className="tw-text-accent">
                Privacy (local)
              </Badge>
            )}
          </div>
          <div className="tw-text-sm tw-text-muted">
            KOS2 uses local Ollama for chat and embeddings. Ollama Cloud remains optional and is
            only used for web search and web fetch.
          </div>
        </div>

        <div className="tw-flex tw-flex-col tw-items-end tw-gap-2">
          <RuntimeBadge state={runtime.state} />
          <Button
            variant="secondary"
            onClick={checkLocalOllama}
            className="tw-min-w-24 tw-gap-2"
            disabled={runtime.state === "checking"}
          >
            {runtime.state === "checking" ? (
              <Loader2 className="tw-size-4 tw-animate-spin" />
            ) : (
              <RefreshCw className="tw-size-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="tw-flex tw-flex-col tw-gap-2 tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/40">
        <div className="tw-flex tw-flex-col tw-gap-1 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
          <div className="tw-flex tw-flex-col">
            <span className="tw-font-medium tw-text-normal">Runtime status</span>
            <span className="tw-text-xs tw-text-muted">{ollamaBaseUrl}</span>
          </div>
          <div className="tw-text-xs tw-text-muted">Profile: {profileLabel}</div>
        </div>

        <div className="tw-text-sm tw-text-muted">
          {runtime.state === "unreachable" && (
            <>
              Ollama is not reachable right now. Start the Ollama app or service, then refresh this
              check.
            </>
          )}
          {runtime.state === "empty" && (
            <>
              Ollama is running, but no models are installed yet. Install one chat model and one
              embedding model before using KOS2.
            </>
          )}
          {runtime.state === "ready" && runtime.message}
          {runtime.state === "checking" && "Checking the local Ollama host..."}
          {runtime.state === "idle" && "Checking the local Ollama host..."}
        </div>

        {runtime.message && runtime.state === "unreachable" && (
          <div className="tw-text-xs tw-text-error">{runtime.message}</div>
        )}

        {(runtime.state === "unreachable" || runtime.state === "empty") && (
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            <Button variant="default" onClick={() => navigateToPlusPage(PLUS_UTM_MEDIUMS.SETTINGS)}>
              Open Ollama
              <ExternalLink className="tw-size-4" />
            </Button>
            <Button variant="secondary" onClick={checkLocalOllama}>
              Try again
            </Button>
          </div>
        )}
      </div>

      {showRecommendation && (
        <div className="tw-grid tw-gap-3 lg:tw-grid-cols-2">
          <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/40">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-font-medium tw-text-normal">Local chat path</div>
              <Badge variant="outline">
                {isPrivacyLocalMode ? "Private by default" : profileLabel}
              </Badge>
            </div>
            <div className="tw-mt-2 tw-text-sm tw-text-muted">
              {isPrivacyLocalMode
                ? "Keep note work on your local Ollama runtime. This path never needs Ollama Cloud."
                : getOllamaProfileGuidance(machineProfile)}
            </div>
            <div className="tw-mt-2 tw-text-sm">
              {runtime.state === "ready" && recommendedChatModel ? (
                <>
                  Use <b className="tw-text-accent">{recommendedChatModel}</b> as the local chat
                  default.
                </>
              ) : (
                <>{getOllamaEmptyStateHint(machineProfile)}</>
              )}
            </div>
          </div>

          <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/40">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-font-medium tw-text-normal">Local embedding path</div>
              <Badge variant="outline">Knowledge stays local</Badge>
            </div>
            <div className="tw-mt-2 tw-text-sm tw-text-muted">
              Keep embeddings local so semantic search stays fast, private, and independent from
              cloud tools.
            </div>
            <div className="tw-mt-2 tw-text-sm">
              {runtime.state === "ready" && recommendedEmbeddingModel ? (
                <>
                  Use <b className="tw-text-accent">{recommendedEmbeddingModel}</b> for local
                  embeddings.
                </>
              ) : (
                <>
                  Choose one general-purpose embedding model after installing your first local
                  models.
                </>
              )}
            </div>
          </div>

          <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/40">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-font-medium tw-text-normal">Ollama Cloud companion</div>
              <Badge
                variant="outline"
                className={settings.ollamaCloudApiKey ? "tw-text-success" : "tw-text-muted"}
              >
                {settings.ollamaCloudApiKey ? "Configured" : "Optional"}
              </Badge>
            </div>
            <div className="tw-mt-2 tw-text-sm tw-text-muted">
              Cloud is only used for web search and web fetch. It does not power local chat or local
              embeddings.
            </div>
            <div className="tw-mt-2 tw-text-sm">
              {settings.ollamaCloudApiKey ? (
                <>Use Ollama Cloud only when you want explicit web help on top of the local path.</>
              ) : isPrivacyLocalMode ? (
                <>
                  Privacy mode is already safe without a cloud key. Add one only if you want
                  optional web tools.
                </>
              ) : (
                <>Keep this optional unless you want web search in the agent workflow.</>
              )}
            </div>
          </div>

          <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/40">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-font-medium tw-text-normal">Local machine capability</div>
              <Badge variant="outline">{machineCapabilities.profileLabel}</Badge>
            </div>
            <div className="tw-mt-2 tw-text-sm tw-text-muted">
              KOS2 estimates what this machine can comfortably handle before recommending local
              models.
            </div>
            <div className="tw-mt-3 tw-grid tw-gap-2 sm:tw-grid-cols-2">
              <div className="tw-rounded-md tw-border tw-p-2 tw-bg-secondary/20 tw-border-border/70">
                <div className="tw-text-[11px] tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                  CPU threads
                </div>
                <div className="tw-mt-1 tw-text-sm tw-font-medium tw-text-normal">
                  {machineCapabilities.cpuThreads || "Unknown"}
                </div>
              </div>
              <div className="tw-rounded-md tw-border tw-p-2 tw-bg-secondary/20 tw-border-border/70">
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
      )}

      {runtime.state === "empty" && (
        <div className="tw-grid tw-gap-3 lg:tw-grid-cols-2">
          <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/20">
            <div className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
              Suggested chat pull
            </div>
            <div className="tw-mt-2 tw-font-mono tw-text-xs tw-text-normal">
              {pullRecommendations.chatCommand}
            </div>
          </div>
          <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/20">
            <div className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
              Suggested embedding pull
            </div>
            <div className="tw-mt-2 tw-font-mono tw-text-xs tw-text-normal">
              {pullRecommendations.embeddingCommand}
            </div>
          </div>
        </div>
      )}

      {runtime.state === "ready" && runtime.modelNames.length > 0 && (
        <div className="tw-flex tw-flex-col tw-gap-2 tw-rounded-md tw-border tw-border-border tw-p-3">
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
            <span className="tw-font-medium tw-text-normal">Detected models</span>
            <span className="tw-text-xs tw-text-muted">{runtime.modelNames.length} total</span>
          </div>
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            {runtime.modelNames.slice(0, 8).map((name) => (
              <Badge key={name} variant="secondary" className="tw-max-w-full tw-truncate">
                {name}
              </Badge>
            ))}
            {runtime.modelNames.length > 8 && (
              <Badge variant="outline">+{runtime.modelNames.length - 8} more</Badge>
            )}
          </div>
        </div>
      )}

      <div className="tw-flex tw-flex-col tw-gap-2 tw-rounded-md tw-border tw-border-border tw-p-3">
        <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
          <div className="tw-flex tw-flex-col">
            <span className="tw-font-medium tw-text-normal">Ollama Cloud</span>
            <span className="tw-text-xs tw-text-muted">
              Optional and only used for web search and web fetch flows.
            </span>
          </div>
          <Badge
            variant="outline"
            className={settings.ollamaCloudApiKey ? "tw-text-success" : "tw-text-muted"}
          >
            {settings.ollamaCloudApiKey ? "Configured" : "Optional"}
          </Badge>
        </div>

        <div className="tw-text-xs tw-text-muted">
          Preferred key sources are: plugin setting, <code>OLLAMA_API_KEY</code>, then macOS
          Keychain item <code>cos2-ollama-cloud</code>.
        </div>

        <div className="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row">
          <PasswordInput
            className="tw-w-full"
            placeholder="Optional: save Ollama Cloud API key in plugin settings"
            value={localCloudKey}
            onChange={setLocalCloudKey}
          />
          <Button
            onClick={() => {
              updateSetting("ollamaCloudApiKey", localCloudKey);
              new Notice(
                localCloudKey
                  ? "Saved Ollama Cloud API key for KOS2."
                  : "Cleared Ollama Cloud API key from plugin settings."
              );
            }}
            className="tw-min-w-20 tw-text-xs md:tw-text-sm"
          >
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}
