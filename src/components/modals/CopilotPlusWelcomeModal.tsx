import { PLUS_UTM_MEDIUMS } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getConfiguredOllamaBaseUrl,
  parseOllamaTagsResponse,
} from "@/services/ollama/ollamaModelDiscovery";
import { updateSetting, useSettingsValue } from "@/settings/model";
import {
  applyPlusSettings,
  getOllamaMachineProfile,
  getOllamaMachineProfileLabel,
  getOllamaProfileGuidance,
  getOllamaPullRecommendations,
  navigateToPlusPage,
  pickRecommendedOllamaChatModelName,
  pickRecommendedOllamaEmbeddingModelName,
} from "@/plusUtils";
import { err2String } from "@/utils";
import { ExternalLink, Loader2 } from "lucide-react";
import { App, Modal, requestUrl } from "obsidian";
import React, { useEffect, useState } from "react";
import { createRoot, Root } from "react-dom/client";

type OllamaRuntimeState = "checking" | "unreachable" | "empty" | "ready";

interface RuntimeSnapshot {
  state: OllamaRuntimeState;
  message: string;
  modelNames: string[];
}

function RuntimeBadge({ state }: { state: OllamaRuntimeState }) {
  const labelMap: Record<OllamaRuntimeState, string> = {
    checking: "Checking",
    unreachable: "Unavailable",
    empty: "No models",
    ready: "Ready",
  };

  const classNameMap: Record<OllamaRuntimeState, string> = {
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

function CopilotPlusWelcomeModalContent({
  onApplyDefaults,
  onDismiss,
}: {
  onApplyDefaults: () => void;
  onDismiss: () => void;
}) {
  const settings = useSettingsValue();
  const profile = getOllamaMachineProfile();
  const profileLabel = getOllamaMachineProfileLabel(profile);
  const ollamaBaseUrl = getConfiguredOllamaBaseUrl(settings);
  const [runtime, setRuntime] = useState<RuntimeSnapshot>({
    state: "checking",
    message: "",
    modelNames: [],
  });

  const pullRecommendations = getOllamaPullRecommendations(profile);
  const recommendedChatModel = pickRecommendedOllamaChatModelName(runtime.modelNames, profile);
  const recommendedEmbeddingModel = pickRecommendedOllamaEmbeddingModelName(runtime.modelNames);

  /**
   * Inspect the local Ollama host so onboarding can show the correct next step.
   */
  useEffect(() => {
    let isMounted = true;

    const checkLocalOllama = async () => {
      setRuntime({
        state: "checking",
        message: "",
        modelNames: [],
      });

      try {
        const response = await requestUrl({
          url: `${ollamaBaseUrl}/api/tags`,
          method: "GET",
        });
        const modelNames = parseOllamaTagsResponse(response.json);
        const nextState: OllamaRuntimeState = modelNames.length > 0 ? "ready" : "empty";

        if (!isMounted) {
          return;
        }

        setRuntime({
          state: nextState,
          modelNames,
          message:
            nextState === "ready"
              ? `${modelNames.length} local model(s) detected.`
              : "Ollama is reachable, but no local models are installed yet.",
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRuntime({
          state: "unreachable",
          modelNames: [],
          message: err2String(error),
        });
      }
    };

    void checkLocalOllama();

    return () => {
      isMounted = false;
    };
  }, [ollamaBaseUrl]);

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <p>
          KOS2 works best when local Ollama is the default runtime for chat, embeddings, and the
          workflow agent.
        </p>
        <p>
          The setup below adjusts to the real state of your machine instead of assuming specific
          models are already installed.
        </p>
      </div>

      <div className="tw-flex tw-flex-col tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
        <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
          <div className="tw-flex tw-flex-col tw-gap-1">
            <div className="tw-text-sm tw-font-semibold tw-text-normal">Local Ollama runtime</div>
            <div className="tw-text-xs tw-text-muted">{ollamaBaseUrl}</div>
          </div>
          <RuntimeBadge state={runtime.state} />
        </div>

        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <Badge variant="outline">Profile: {profileLabel}</Badge>
          <Badge variant="outline">
            Cloud: {settings.ollamaCloudApiKey ? "configured" : "optional"}
          </Badge>
        </div>

        <div className="tw-text-sm tw-text-muted">
          {runtime.state === "checking" && (
            <span className="tw-inline-flex tw-items-center tw-gap-2">
              <Loader2 className="tw-size-4 tw-animate-spin" />
              Checking your local Ollama runtime...
            </span>
          )}
          {runtime.state === "unreachable" && (
            <>Ollama is not reachable. Start the app or service first, then come back to KOS2.</>
          )}
          {runtime.state === "empty" && (
            <>
              Ollama is running, but it does not expose any local models yet. Install one chat model
              and one embedding model to unlock the full KOS2 path.
            </>
          )}
          {runtime.state === "ready" && runtime.message}
        </div>

        <div className="tw-text-sm tw-text-muted">{getOllamaProfileGuidance(profile)}</div>

        {runtime.state === "unreachable" && runtime.message && (
          <div className="tw-text-xs tw-text-error">{runtime.message}</div>
        )}

        {runtime.state === "empty" && (
          <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
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

        {runtime.state === "ready" && (
          <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
            <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/20">
              <div className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                Recommended chat model
              </div>
              <div className="tw-mt-2 tw-text-sm tw-text-normal">
                {recommendedChatModel ?? "Use the strongest local chat model that feels stable."}
              </div>
            </div>
            <div className="tw-rounded-md tw-border tw-border-border tw-p-3 tw-bg-secondary/20">
              <div className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.16em] tw-text-muted">
                Recommended embedding model
              </div>
              <div className="tw-mt-2 tw-text-sm tw-text-normal">
                {recommendedEmbeddingModel ?? "Use a general-purpose local embedding model."}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="tw-flex tw-w-full tw-justify-end tw-gap-2">
        <Button variant="ghost" onClick={onDismiss}>
          Close for now
        </Button>
        {runtime.state === "ready" ? (
          <Button variant="default" onClick={onApplyDefaults}>
            Use local Ollama defaults
          </Button>
        ) : (
          <Button variant="default" onClick={() => navigateToPlusPage(PLUS_UTM_MEDIUMS.SETTINGS)}>
            Open Ollama
            <ExternalLink className="tw-size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export class CopilotPlusWelcomeModal extends Modal {
  private root: Root;

  constructor(app: App) {
    super(app);
    // https://docs.obsidian.md/Reference/TypeScript+API/Modal/setTitle
    // @ts-ignore
    this.setTitle("KOS2 Ollama Setup");
  }

  /**
   * Render the one-time Ollama-first onboarding surface.
   */
  onOpen() {
    const { contentEl } = this;
    this.root = createRoot(contentEl);

    const handleApplyDefaults = () => {
      applyPlusSettings();
      updateSetting("hasSeenOllamaOnboarding", true);
      this.close();
    };

    const handleDismiss = () => {
      updateSetting("hasSeenOllamaOnboarding", true);
      this.close();
    };

    this.root.render(
      <CopilotPlusWelcomeModalContent
        onApplyDefaults={handleApplyDefaults}
        onDismiss={handleDismiss}
      />
    );
  }

  onClose() {
    this.root.unmount();
  }
}
