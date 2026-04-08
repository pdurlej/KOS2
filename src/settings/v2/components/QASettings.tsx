import React from "react";

import { Notice } from "obsidian";

import { RebuildIndexConfirmModal } from "@/components/modals/RebuildIndexConfirmModal";
import { SemanticSearchToggleModal } from "@/components/modals/SemanticSearchToggleModal";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { getModelDisplayWithIcons } from "@/components/ui/model-display";
import { SettingItem } from "@/components/ui/setting-item";
import { VAULT_VECTOR_STORE_STRATEGIES } from "@/constants";
import {
  getModelKeyFromModel,
  getVisibleEmbeddingModels,
  updateSetting,
  useSettingsValue,
} from "@/settings/model";
import { PatternListEditor } from "@/settings/v2/components/PatternListEditor";

export const QASettings: React.FC = () => {
  const settings = useSettingsValue();
  const isMiyoSearchActive = settings.enableMiyo;
  const visibleEmbeddingModels = getVisibleEmbeddingModels(settings);

  const handleSetDefaultEmbeddingModel = async (modelKey: string) => {
    if (modelKey === settings.embeddingModelKey) return;

    if (settings.enableSemanticSearchV3) {
      new RebuildIndexConfirmModal(app, async () => {
        updateSetting("embeddingModelKey", modelKey);
        const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
        await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
          userInitiated: true,
        });
      }).open();
      return;
    }

    updateSetting("embeddingModelKey", modelKey);
    new Notice("Embedding model saved. Enable Semantic Search to build the index.");
  };

  const handleBuildOrRebuildIndex = async () => {
    if (isMiyoSearchActive) {
      new Notice("Miyo handles embeddings in this mode. Disable Miyo to rebuild the local index.");
      return;
    }

    if (!settings.enableSemanticSearchV3) {
      new SemanticSearchToggleModal(
        app,
        async () => {
          updateSetting("enableSemanticSearchV3", true);
          const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
          await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
            userInitiated: true,
          });
        },
        true
      ).open();
      return;
    }

    const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
    await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
      userInitiated: true,
    });
    new Notice("Semantic search index refresh started.");
  };

  const statusText = !settings.enableSemanticSearchV3
    ? "Semantic search is off. KOS2 will use lexical search only."
    : isMiyoSearchActive
      ? "Semantic search is on and embeddings are delegated to Miyo."
      : "Semantic search is on. Rebuild the index after changing embedding models or vault content.";

  return (
    <div className="tw-space-y-6">
      <section className="tw-space-y-4">
        <div>
          <div className="tw-text-xl tw-font-bold">Knowledge</div>
          <div className="tw-text-sm tw-text-muted">
            Keep this surface focused on whether KOS2 can search the vault meaningfully with local
            embeddings. Ollama Cloud is not used for the vault index.
          </div>
        </div>

        <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
          <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
            <div className="tw-space-y-1">
              <div className="tw-text-sm tw-font-semibold">Index status</div>
              <div className="tw-text-sm tw-text-muted">{statusText}</div>
            </div>
            <Button onClick={handleBuildOrRebuildIndex} variant="secondary">
              {settings.enableSemanticSearchV3 ? "Rebuild Index" : "Build Index"}
            </Button>
          </div>
        </div>

        <SettingItem
          type="switch"
          title="Enable Semantic Search"
          description="Enable meaning-based vault retrieval. When off, KOS2 falls back to lexical search."
          checked={settings.enableSemanticSearchV3}
          onCheckedChange={(checked) => {
            new SemanticSearchToggleModal(
              app,
              async () => {
                updateSetting("enableSemanticSearchV3", checked);
                if (!checked && settings.enableMiyo) {
                  updateSetting("enableMiyo", false);
                }
                if (checked && !isMiyoSearchActive) {
                  const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
                  await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
                    userInitiated: true,
                  });
                }
              },
              checked
            ).open();
          }}
        />

        <SettingItem
          type="select"
          title="Ollama Local Embedding Model"
          description={
            <div className="tw-space-y-2">
              <div className="tw-flex tw-items-center tw-gap-1.5">
                <span className="tw-font-medium tw-leading-none tw-text-accent">
                  Powers semantic search and relevant notes on the local Ollama path.
                </span>
                <HelpTooltip
                  content={
                    <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2">
                      <div className="tw-pt-2 tw-text-sm tw-text-muted">
                        Changing the embedding model affects semantic search quality and requires
                        rebuilding the vault index.
                      </div>
                    </div>
                  }
                />
              </div>
              {isMiyoSearchActive && (
                <div className="tw-text-sm tw-text-muted">
                  Miyo search is enabled, so embeddings are generated by Miyo and this setting is
                  ignored.
                </div>
              )}
            </div>
          }
          value={settings.embeddingModelKey}
          onChange={handleSetDefaultEmbeddingModel}
          options={visibleEmbeddingModels.map((model) => ({
            label: getModelDisplayWithIcons(model),
            value: getModelKeyFromModel(model),
          }))}
          placeholder="Model"
          disabled={isMiyoSearchActive}
        />
      </section>

      <section className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
        <details>
          <summary className="tw-cursor-pointer tw-select-none tw-text-sm tw-font-semibold">
            Advanced indexing
          </summary>
          <div className="tw-mt-4 tw-space-y-4">
            <SettingItem
              type="switch"
              title="Enable Inline Citations (experimental)"
              description="Show footnote-style citations in AI responses."
              checked={settings.enableInlineCitations}
              onCheckedChange={(checked) => updateSetting("enableInlineCitations", checked)}
            />

            <SettingItem
              type="select"
              title="Auto-Index Strategy"
              description="Choose when the vault should be indexed."
              value={settings.indexVaultToVectorStore}
              onChange={(value) => {
                updateSetting("indexVaultToVectorStore", value);
              }}
              options={VAULT_VECTOR_STORE_STRATEGIES.map((strategy) => ({
                label: strategy,
                value: strategy,
              }))}
              placeholder="Strategy"
            />

            <SettingItem
              type="slider"
              title="Max Sources"
              description="Limit how many retrieved notes are passed into the model."
              min={1}
              max={128}
              step={1}
              value={settings.maxSourceChunks}
              onChange={(value) => updateSetting("maxSourceChunks", value)}
            />

            {settings.enableSemanticSearchV3 && (
              <>
                <SettingItem
                  type="slider"
                  title="Requests per Minute"
                  description="Throttle embedding requests if your runtime is rate-limited."
                  min={10}
                  max={60}
                  step={10}
                  value={Math.min(settings.embeddingRequestsPerMin, 60)}
                  onChange={(value) => updateSetting("embeddingRequestsPerMin", value)}
                />

                <SettingItem
                  type="slider"
                  title="Embedding Batch Size"
                  description="Batch size used while building the embedding index."
                  min={1}
                  max={128}
                  step={1}
                  value={settings.embeddingBatchSize}
                  onChange={(value) => updateSetting("embeddingBatchSize", value)}
                />

                <SettingItem
                  type="select"
                  title="Number of Partitions"
                  description="Partition count for large index builds."
                  value={String(settings.numPartitions || 1)}
                  onChange={(value) => updateSetting("numPartitions", Number(value))}
                  options={[
                    { label: "1", value: "1" },
                    { label: "2", value: "2" },
                    { label: "4", value: "4" },
                    { label: "8", value: "8" },
                    { label: "16", value: "16" },
                    { label: "32", value: "32" },
                    { label: "40", value: "40" },
                  ]}
                  placeholder="Select partitions"
                />
              </>
            )}

            <SettingItem
              type="slider"
              title="Lexical Search RAM Limit"
              description="Maximum RAM usage for full-text search indexing."
              min={20}
              max={1000}
              step={20}
              value={settings.lexicalSearchRamLimit || 100}
              onChange={(value) => updateSetting("lexicalSearchRamLimit", value)}
              suffix=" MB"
            />

            <SettingItem
              type="switch"
              title="Enable Folder and Graph Boosts"
              description="Use folder and link structure to nudge lexical search ranking."
              checked={settings.enableLexicalBoosts}
              onCheckedChange={(checked) => updateSetting("enableLexicalBoosts", checked)}
            />

            <SettingItem
              type="custom"
              title="Exclusions"
              description="Exclude folders, tags, note titles or file extensions from the index."
            >
              <PatternListEditor
                value={settings.qaExclusions}
                onChange={(value) => updateSetting("qaExclusions", value)}
              />
            </SettingItem>

            <SettingItem
              type="custom"
              title="Inclusions"
              description="Index only the specified paths, tags, or note titles."
            >
              <PatternListEditor
                value={settings.qaInclusions}
                onChange={(value) => updateSetting("qaInclusions", value)}
              />
            </SettingItem>

            <SettingItem
              type="switch"
              title="Enable Obsidian Sync for KOS2 index"
              description="Store the semantic index in .obsidian so it syncs with Obsidian Sync."
              checked={settings.enableIndexSync}
              onCheckedChange={(checked) => updateSetting("enableIndexSync", checked)}
            />

            <SettingItem
              type="switch"
              title="Disable index loading on mobile"
              description="Save resources on mobile devices by skipping index load."
              checked={settings.disableIndexOnMobile}
              onCheckedChange={(checked) => updateSetting("disableIndexOnMobile", checked)}
            />
          </div>
        </details>
      </section>
    </div>
  );
};
