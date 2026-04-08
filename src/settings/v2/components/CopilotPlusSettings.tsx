import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SettingItem } from "@/components/ui/setting-item";
import { DEFAULT_SETTINGS } from "@/constants";
import { logError } from "@/logger";
import { MiyoClient } from "@/miyo/MiyoClient";
import { getMiyoCustomUrl, getMiyoFolderPath } from "@/miyo/miyoUtils";
import {
  getLocalTranscriptSetup,
  hasTranscriptApiKeyConfigured,
  useIsSelfHostEligible,
  validateSelfHostMode,
} from "@/plusUtils";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { Copy, ExternalLink } from "lucide-react";
import { Notice } from "obsidian";
import React, { useEffect, useState } from "react";
import { ToolSettingsSection } from "./ToolSettingsSection";

/**
 * Copy text to the clipboard and show a Notice with the result.
 *
 * @param text - Text to copy.
 * @param successMessage - Notice shown after a successful copy.
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

export const CopilotPlusSettings: React.FC = () => {
  const settings = useSettingsValue();
  const [isValidatingSelfHost, setIsValidatingSelfHost] = useState(false);
  const [transcriptApiKey, setTranscriptApiKey] = useState(settings.supadataApiKey || "");
  const isSelfHostEligible = useIsSelfHostEligible();
  const transcriptReady = hasTranscriptApiKeyConfigured();
  const localTranscriptSetup = getLocalTranscriptSetup();

  useEffect(() => {
    setTranscriptApiKey(settings.supadataApiKey || "");
  }, [settings.supadataApiKey]);

  const handleSelfHostModeToggle = async (enabled: boolean) => {
    if (enabled) {
      setIsValidatingSelfHost(true);
      const isValid = await validateSelfHostMode();
      setIsValidatingSelfHost(false);
      if (!isValid) {
        return;
      }
      updateSetting("enableSelfHostMode", true);
    } else {
      updateSetting("enableSelfHostMode", false);
      updateSetting("enableMiyo", false);
    }
  };

  const handleMiyoSearchToggle = async (enabled: boolean) => {
    if (enabled === settings.enableMiyo) {
      return;
    }

    if (!enabled) {
      updateSetting("enableMiyo", false);
      return;
    }

    setIsValidatingSelfHost(true);
    try {
      const miyoClient = new MiyoClient();
      const isMiyoAvailable = await miyoClient.isBackendAvailable(getMiyoCustomUrl(settings));
      if (!isMiyoAvailable) {
        new Notice("Miyo app is not available. Please start the Miyo app and try again.");
        return;
      }
    } finally {
      setIsValidatingSelfHost(false);
    }

    const confirmChange = async () => {
      if (enabled && settings.embeddingBatchSize !== DEFAULT_SETTINGS.embeddingBatchSize) {
        updateSetting("embeddingBatchSize", DEFAULT_SETTINGS.embeddingBatchSize);
      }

      updateSetting("enableMiyo", enabled);

      if (enabled && !settings.enableSemanticSearchV3) {
        updateSetting("enableSemanticSearchV3", true);
      }

      if (settings.enableSemanticSearchV3 || enabled) {
        const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
        await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
          userInitiated: true,
        });
      }
    };

    new ConfirmModal(
      app,
      confirmChange,
      `Enabling Miyo Search will use your current vault path as the Miyo folder path and request a scan from Miyo. Make sure this folder is already registered in Miyo. Embedding Batch Size will be reset to the default (${DEFAULT_SETTINGS.embeddingBatchSize}) for local stability. Continue?`,
      "Request Miyo Scan"
    ).open();
  };

  return (
    <div className="tw-space-y-6">
      <section className="tw-space-y-4">
        <div className="tw-flex tw-items-center tw-py-2">
          <Badge variant="secondary" className="tw-text-accent">
            KOS2 Workflows
          </Badge>
        </div>

        <div>
          <div className="tw-text-xl tw-font-bold">Workflow Agent</div>
          <div className="tw-text-sm tw-text-muted">
            Keep this surface small and honest: only expose tools that map to the current KOS2
            runtime and real vault work.
          </div>
        </div>

        <SettingItem
          type="switch"
          title="Enable KOS2 Agent"
          description="Enable the advanced KOS2 workflow loop. The model will decide which tools to use for more complex vault and web tasks."
          checked={settings.enableAutonomousAgent}
          onCheckedChange={(checked) => {
            updateSetting("enableAutonomousAgent", checked);
          }}
        />

        {settings.enableAutonomousAgent && <ToolSettingsSection />}

        <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
          <div className="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-start sm:tw-justify-between">
            <div>
              <div className="tw-flex tw-items-center tw-gap-2">
                <div className="tw-text-lg tw-font-semibold">YouTube Transcripts</div>
                <Badge
                  variant="outline"
                  className={transcriptReady ? "tw-text-success" : "tw-text-warning"}
                >
                  {transcriptReady ? "Transcript API ready" : "Setup needed"}
                </Badge>
              </div>
              <div className="tw-mt-1 tw-text-sm tw-text-muted">
                Web search is real via Ollama Cloud. YouTube transcripts need explicit setup. Today
                the working runtime path is a transcript API key. Supadata is the cleanest fit here
                because it offers a free starter tier and does not require wiring a full local
                pipeline first. A local `yt-dlp + whisper` path can be prepared now, but it is not
                yet wired into the main KOS2 runtime.
              </div>
            </div>
            <Button
              variant="ghost"
              className="tw-gap-2"
              onClick={() =>
                window.open("https://supadata.ai/video-analysis-api?ref=obcopilot", "_blank")
              }
            >
              Supadata docs
              <ExternalLink className="tw-size-4" />
            </Button>
          </div>

          <div className="tw-mt-4 tw-grid tw-gap-3 lg:tw-grid-cols-2">
            <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
              <div className="tw-text-sm tw-font-medium tw-text-normal">
                Supadata / transcript API key
              </div>
              <div className="tw-mt-1 tw-text-xs tw-text-muted">
                Save a transcript API key to turn on the YouTube transcript capability in KOS2. The
                current adapter uses Supadata-compatible transcripts. Supadata currently offers free
                starter requests with no card required.
              </div>
              <div className="tw-mt-3 tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row">
                <input
                  type="password"
                  className="tw-flex !tw-h-9 tw-w-full !tw-min-w-[50px] !tw-rounded-md !tw-border tw-border-solid tw-border-border !tw-bg-transparent !tw-px-3 !tw-py-1 !tw-text-sm tw-shadow-sm !tw-transition-colors placeholder:tw-text-muted focus-visible:!tw-shadow-sm focus-visible:!tw-outline-none focus-visible:!tw-ring-1 focus-visible:!tw-ring-ring disabled:tw-cursor-not-allowed disabled:tw-opacity-50 md:!tw-text-base"
                  placeholder="Transcript API key"
                  value={transcriptApiKey}
                  onChange={(event) => setTranscriptApiKey(event.target.value)}
                />
                <Button
                  onClick={() => {
                    updateSetting("supadataApiKey", transcriptApiKey.trim());
                    new Notice(
                      transcriptApiKey.trim()
                        ? "Saved transcript API key for KOS2."
                        : "Cleared transcript API key from KOS2 settings."
                    );
                  }}
                  className="tw-min-w-20"
                >
                  Save
                </Button>
              </div>
              <div className="tw-mt-2 tw-text-xs tw-text-muted">
                Once saved, the <strong>YouTube Transcription</strong> tool becomes available in the
                agent tool list.
              </div>
            </div>

            <div className="tw-rounded-md tw-border tw-p-3 tw-bg-secondary/20 tw-border-border/70">
              <div className="tw-text-sm tw-font-medium tw-text-normal">
                Prepare local transcript tools
              </div>
              <div className="tw-mt-1 tw-text-xs tw-text-muted">
                This is the local path you asked for. It prepares `yt-dlp` and Whisper on the Mac,
                but KOS2 does not call this path automatically yet.
              </div>
              <div className="tw-mt-3 tw-space-y-2">
                <div className="tw-font-mono tw-text-xs tw-text-normal">
                  {localTranscriptSetup.installCommand}
                </div>
                <div className="tw-font-mono tw-text-xs tw-text-muted">
                  {localTranscriptSetup.exampleCommand}
                </div>
              </div>
              <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
                <Button
                  variant="secondary"
                  className="tw-gap-2"
                  onClick={() =>
                    void copyTextToClipboard(
                      localTranscriptSetup.installCommand,
                      "Copied local transcript install command."
                    )
                  }
                >
                  <Copy className="tw-size-4" />
                  Copy install
                </Button>
                <Button
                  variant="secondary"
                  className="tw-gap-2"
                  onClick={() =>
                    void copyTextToClipboard(
                      localTranscriptSetup.exampleCommand,
                      "Copied example local transcript command."
                    )
                  }
                >
                  <Copy className="tw-size-4" />
                  Copy example
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tw-space-y-4">
        <div>
          <div className="tw-text-xl tw-font-bold">Labs</div>
          <div className="tw-text-sm tw-text-muted">
            Advanced document, memory, and compatibility settings stay here so the main workflow
            surface remains focused.
          </div>
        </div>

        <SettingItem
          type="text"
          title="Store converted markdown at"
          description="When PDFs and other documents are processed, the converted markdown is saved to this folder."
          value={settings.convertedDocOutputFolder}
          onChange={(value) => {
            updateSetting("convertedDocOutputFolder", value);
          }}
          placeholder="05 System/KOS2/converted-docs"
        />

        <SettingItem
          type="text"
          title="Memory Folder Name"
          description="Folder where memory data is stored."
          value={settings.memoryFolderName}
          onChange={(value) => {
            updateSetting("memoryFolderName", value);
          }}
          placeholder="05 System/KOS2/memory"
        />

        <SettingItem
          type="switch"
          title="Reference Recent Conversation"
          description="Reference recent conversation history for more contextually relevant responses."
          checked={settings.enableRecentConversations}
          onCheckedChange={(checked) => {
            updateSetting("enableRecentConversations", checked);
          }}
        />

        {settings.enableRecentConversations && (
          <SettingItem
            type="slider"
            title="Max Recent Conversations"
            description="Number of recent conversations to remember for context."
            min={10}
            max={50}
            step={1}
            value={settings.maxRecentConversations}
            onChange={(value) => updateSetting("maxRecentConversations", value)}
          />
        )}

        <SettingItem
          type="switch"
          title="Reference Saved Memories"
          description="Allow KOS2 to access memories you explicitly asked it to remember."
          checked={settings.enableSavedMemory}
          onCheckedChange={(checked) => {
            updateSetting("enableSavedMemory", checked);
          }}
        />

        {isSelfHostEligible && (
          <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
            <details>
              <summary className="tw-cursor-pointer tw-select-none tw-text-sm tw-font-semibold">
                Legacy self-host integrations
              </summary>
              <div className="tw-mt-4 tw-space-y-4">
                <div className="tw-text-sm tw-text-muted">
                  Keep this collapsed unless you actively use Miyo, remote search providers, or an
                  older self-host flow. This is not the primary KOS2 setup.
                </div>

                <SettingItem
                  type="switch"
                  title="Enable Self-Host Mode"
                  description={
                    <div className="tw-flex tw-items-center tw-gap-1.5">
                      <span className="tw-leading-none">
                        Use your own infrastructure for search, embeddings, and document
                        understanding.
                      </span>
                      <HelpTooltip
                        content={
                          <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2 tw-py-4">
                            <div className="tw-text-sm tw-font-medium tw-text-accent">
                              Compatibility surface
                            </div>
                            <div className="tw-text-xs tw-text-muted">
                              This remains available for legacy self-host setups, but it is not the
                              primary Ollama-first KOS2 path.
                            </div>
                          </div>
                        }
                      />
                    </div>
                  }
                  checked={settings.enableSelfHostMode}
                  onCheckedChange={handleSelfHostModeToggle}
                  disabled={isValidatingSelfHost}
                />

                {settings.enableSelfHostMode && (
                  <>
                    <SettingItem
                      type="text"
                      title="Remote Miyo Server URL (Optional)"
                      description="Leave blank when accessing Miyo locally. Use only when Miyo runs on a remote machine."
                      value={settings.miyoServerUrl || ""}
                      onChange={(value) => updateSetting("miyoServerUrl", value)}
                    />

                    {(settings.miyoServerUrl || "").trim() && (
                      <SettingItem
                        type="text"
                        title="Remote Vault Folder (Optional)"
                        description="The folder path on the remote machine that Miyo should search."
                        value={settings.miyoRemoteVaultPath || ""}
                        onChange={(value) => updateSetting("miyoRemoteVaultPath", value)}
                        placeholder="e.g. /Users/you/Documents/vault"
                      />
                    )}

                    <SettingItem
                      type="switch"
                      title="Enable Miyo"
                      description="Use Miyo as your local search, PDF parsing, and context hub."
                      checked={settings.enableMiyo}
                      onCheckedChange={handleMiyoSearchToggle}
                      disabled={isValidatingSelfHost}
                    />

                    {settings.enableMiyo && (
                      <div className="tw-text-xs tw-text-muted">
                        Folder path sent to Miyo:{" "}
                        <span className="tw-font-medium tw-text-normal">
                          {getMiyoFolderPath(app, settings)}
                        </span>
                      </div>
                    )}

                    <SettingItem
                      type="select"
                      title="Web Search Provider"
                      description="Choose which service to use for self-host web search."
                      value={settings.selfHostSearchProvider}
                      onChange={(value) =>
                        updateSetting("selfHostSearchProvider", value as "firecrawl" | "perplexity")
                      }
                      options={[
                        { label: "Firecrawl (default)", value: "firecrawl" },
                        { label: "Perplexity Sonar", value: "perplexity" },
                      ]}
                    />

                    {settings.selfHostSearchProvider === "firecrawl" && (
                      <SettingItem
                        type="password"
                        title="Firecrawl API Key"
                        description={
                          <span>
                            API key for web search via Firecrawl.{" "}
                            <a
                              href="https://firecrawl.link/logan-yang"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tw-text-accent"
                            >
                              Sign up &rarr;
                            </a>
                          </span>
                        }
                        value={settings.firecrawlApiKey}
                        onChange={(value) => updateSetting("firecrawlApiKey", value)}
                        placeholder="fc-..."
                      />
                    )}

                    {settings.selfHostSearchProvider === "perplexity" && (
                      <SettingItem
                        type="password"
                        title="Perplexity API Key"
                        description={
                          <span>
                            API key for web search via Perplexity Sonar.{" "}
                            <a
                              href="https://docs.perplexity.ai"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tw-text-accent"
                            >
                              Get API key &rarr;
                            </a>
                          </span>
                        }
                        value={settings.perplexityApiKey}
                        onChange={(value) => updateSetting("perplexityApiKey", value)}
                        placeholder="pplx-..."
                      />
                    )}
                  </>
                )}
              </div>
            </details>
          </div>
        )}
      </section>
    </div>
  );
};
