import { ChainType } from "@/chainFactory";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Input } from "@/components/ui/input";
import { getModelDisplayWithIcons } from "@/components/ui/model-display";
import { SettingItem } from "@/components/ui/setting-item";
import { DEFAULT_OPEN_AREA, KOS2_LOCAL_AGENT_MODEL_KEY, SEND_SHORTCUT } from "@/constants";
import { useTab } from "@/contexts/TabContext";
import {
  getModelKeyFromModel,
  getVisibleChatModels,
  updateSetting,
  useSettingsValue,
} from "@/settings/model";
import { PlusSettings } from "@/settings/v2/components/PlusSettings";
import { checkModelApiKey, formatDateTime } from "@/utils";
import { Loader2 } from "lucide-react";
import { Notice } from "obsidian";
import React, { useState } from "react";

const ChainType2Label: Record<ChainType, string> = {
  [ChainType.LLM_CHAIN]: "Chat",
  [ChainType.VAULT_QA_CHAIN]: "Knowledge",
  [ChainType.COPILOT_PLUS_CHAIN]: "KOS2 Agent",
  [ChainType.PROJECT_CHAIN]: "Projects",
};

export const BasicSettings: React.FC = () => {
  const settings = useSettingsValue();
  const { setSelectedTab } = useTab();
  const [isChecking, setIsChecking] = useState(false);
  const [conversationNoteName, setConversationNoteName] = useState(
    settings.defaultConversationNoteName || "{$date}_{$time}__{$topic}"
  );

  const applyCustomNoteFormat = () => {
    setIsChecking(true);

    try {
      const format = conversationNoteName || "{$date}_{$time}__{$topic}";
      const requiredVars = ["{$date}", "{$time}", "{$topic}"];
      const missingVars = requiredVars.filter((v) => !format.includes(v));

      if (missingVars.length > 0) {
        new Notice(`Error: Missing required variables: ${missingVars.join(", ")}`, 4000);
        return;
      }

      const illegalChars = /[\\/:*?"<>|]/;
      const formatWithoutVars = format
        .replace(/\{\$date}/g, "")
        .replace(/\{\$time}/g, "")
        .replace(/\{\$topic}/g, "");

      if (illegalChars.test(formatWithoutVars)) {
        new Notice(`Error: Format contains illegal characters (\\/:*?"<>|)`, 4000);
        return;
      }

      const { fileName: timestampFileName } = formatDateTime(new Date());
      const firstTenWords = "test topic name";

      const customFileName = format
        .replace("{$topic}", firstTenWords.slice(0, 100).replace(/\s+/g, "_"))
        .replace("{$date}", timestampFileName.split("_")[0])
        .replace("{$time}", timestampFileName.split("_")[1]);

      updateSetting("defaultConversationNoteName", format);
      setConversationNoteName(format);
      new Notice(`Format applied successfully! Example: ${customFileName}`, 4000);
    } catch (error) {
      new Notice(`Error applying format: ${error.message}`, 4000);
    } finally {
      setIsChecking(false);
    }
  };

  const enabledChatModels = getVisibleChatModels(settings);
  const localAgentModel = enabledChatModels[0];
  const defaultModelActivated = enabledChatModels.some(
    (model) => getModelKeyFromModel(model) === settings.defaultModelKey
  );
  const availableChatModels = enabledChatModels.map((model) => ({
    label: getModelDisplayWithIcons(model),
    value: getModelKeyFromModel(model),
  }));
  const localAgentLabel = localAgentModel
    ? `KOS2 Local Agent (${localAgentModel.displayName || localAgentModel.name})`
    : "KOS2 Local Agent (sync local models first)";
  const selectedDefaultModelValue = settings.useLocalAgentAsDefaultModel
    ? KOS2_LOCAL_AGENT_MODEL_KEY
    : defaultModelActivated
      ? settings.defaultModelKey
      : "Select Model";

  /**
   * Persist the default chat model preference from the setup surface.
   *
   * @param value - Selected dropdown value.
   */
  const handleDefaultChatModelChange = (value: string) => {
    if (value === KOS2_LOCAL_AGENT_MODEL_KEY) {
      updateSetting("useLocalAgentAsDefaultModel", true);
      if (localAgentModel) {
        updateSetting("defaultModelKey", getModelKeyFromModel(localAgentModel));
      } else {
        new Notice("Sync local Ollama models first so KOS2 can resolve the Local Agent.");
      }
      return;
    }

    const selectedModel = enabledChatModels.find((model) => getModelKeyFromModel(model) === value);
    if (!selectedModel) return;

    const { hasApiKey } = checkModelApiKey(selectedModel, settings);
    if (!hasApiKey) {
      // Keep selection allowed; any runtime issue is surfaced when sending messages.
    }
    updateSetting("useLocalAgentAsDefaultModel", false);
    updateSetting("defaultModelKey", value);
  };

  return (
    <div className="tw-space-y-6">
      <PlusSettings />

      <section className="tw-space-y-4">
        <div>
          <div className="tw-text-xl tw-font-bold">Setup</div>
          <div className="tw-text-sm tw-text-muted">
            Start with local Ollama, then choose how private and how guided the default KOS2 path
            should feel.
          </div>
        </div>

        <SettingItem
          type="custom"
          title="Ollama Services"
          description="Use Knowledge for model sync and inventory checks. Local Ollama stays the primary runtime."
        >
          <Button
            onClick={() => setSelectedTab("knowledge")}
            variant="secondary"
            className="tw-flex tw-w-full tw-items-center tw-justify-center tw-gap-2 sm:tw-w-auto sm:tw-justify-start"
          >
            Go to Knowledge
          </Button>
        </SettingItem>

        <SettingItem
          type="select"
          title="Default Chat Model"
          description={
            <div className="tw-flex tw-items-center tw-gap-1.5">
              <span className="tw-leading-none">
                Choose one fixed local model or let KOS2 follow the synced local agent path.
              </span>
              <HelpTooltip
                content={
                  <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2 tw-py-4">
                    <div className="tw-text-sm tw-font-medium tw-text-accent">
                      KOS2 Local Agent stays on the local Ollama path
                    </div>
                    <div className="tw-text-xs tw-text-muted">
                      It always follows the first verified local Ollama chat model after a sync.
                      Pick a fixed model only when you want to pin KOS2 to one specific local model.
                    </div>
                  </div>
                }
              />
            </div>
          }
          value={selectedDefaultModelValue}
          onChange={handleDefaultChatModelChange}
          options={[
            { label: localAgentLabel, value: KOS2_LOCAL_AGENT_MODEL_KEY },
            ...(defaultModelActivated || settings.useLocalAgentAsDefaultModel
              ? []
              : [{ label: "Select Model", value: "Select Model" }]),
            ...availableChatModels,
          ]}
          placeholder="Model"
        />

        <SettingItem
          type="select"
          title="Startup Screen"
          description={
            <div className="tw-flex tw-items-center tw-gap-1.5">
              <span className="tw-leading-none">Choose the first screen KOS2 opens to</span>
              <HelpTooltip
                content={
                  <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2">
                    <ul className="tw-pl-4 tw-text-sm tw-text-muted">
                      <li>
                        <strong>Chat:</strong> regular local Ollama chat for general tasks.
                      </li>
                      <li>
                        <strong>Knowledge:</strong> semantic search and vault Q&A with local
                        embeddings.
                      </li>
                      <li>
                        <strong>KOS2 Agent:</strong> advanced workflow path with vault tools, write
                        preview, and optional web tools.
                      </li>
                    </ul>
                  </div>
                }
              />
            </div>
          }
          value={settings.defaultChainType}
          onChange={(value) => updateSetting("defaultChainType", value as ChainType)}
          options={Object.entries(ChainType2Label).map(([key, value]) => ({
            label: value,
            value: key,
          }))}
        />

        <SettingItem
          type="switch"
          title="Privacy (local) Mode"
          description={
            settings.privacyLocalMode
              ? "KOS2 keeps the default chat and knowledge path local-first. Optional cloud tools stay off the happy path."
              : "Use this when you want the default KOS2 path to stay on local Ollama models for note work."
          }
          checked={settings.privacyLocalMode}
          onCheckedChange={(checked) => {
            updateSetting("privacyLocalMode", checked);
            if (checked) {
              updateSetting("useLocalAgentAsDefaultModel", true);
              updateSetting(
                "autonomousAgentEnabledToolIds",
                settings.autonomousAgentEnabledToolIds.filter((toolId) => toolId !== "webSearch")
              );
            }
          }}
        />
      </section>

      <section className="tw-space-y-4">
        <div>
          <div className="tw-text-xl tw-font-bold">PARA + SI</div>
          <div className="tw-text-sm tw-text-muted">
            KOS2 becomes much clearer when users can see the operational path, not just the model
            settings.
          </div>
        </div>

        <div className="tw-grid tw-gap-3 lg:tw-grid-cols-2">
          <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
            <div className="tw-text-sm tw-font-semibold">Starter structure</div>
            <div className="tw-mt-2 tw-text-sm tw-leading-relaxed tw-text-muted">
              If your vault already follows PARA, keep using it. If not, start with a simple local
              structure: Inbox, Projects, Areas, and Resources.
            </div>
          </div>
          <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
            <div className="tw-text-sm tw-font-semibold">Operational paths</div>
            <div className="tw-mt-2 tw-text-sm tw-leading-relaxed tw-text-muted">
              Organise intake first, then run Next steps on project notes, draft Decision artifacts
              from analysis, and use Review to close the loop.
            </div>
          </div>
        </div>

        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <Button variant="secondary" onClick={() => setSelectedTab("knowledge")}>
            Open Knowledge
          </Button>
          <Button variant="secondary" onClick={() => setSelectedTab("workflows")}>
            Open Workflows
          </Button>
        </div>
      </section>

      <section className="tw-space-y-4">
        <div>
          <div className="tw-text-xl tw-font-bold">Behavior</div>
          <div className="tw-text-sm tw-text-muted">
            These are the day-to-day desktop defaults. Keep the rest in preferences if you need them
            later.
          </div>
        </div>

        <SettingItem
          type="select"
          title="Open Plugin In"
          description="Choose where KOS2 opens by default."
          value={settings.defaultOpenArea}
          onChange={(value) => updateSetting("defaultOpenArea", value as DEFAULT_OPEN_AREA)}
          options={[
            { label: "Sidebar View", value: DEFAULT_OPEN_AREA.VIEW },
            { label: "Editor", value: DEFAULT_OPEN_AREA.EDITOR },
          ]}
        />

        <SettingItem
          type="select"
          title="Send Shortcut"
          description={
            <div className="tw-flex tw-items-center tw-gap-1.5">
              <span className="tw-leading-none">Choose the keyboard shortcut used to send</span>
              <HelpTooltip
                content={
                  <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2 tw-py-4">
                    <div className="tw-text-sm tw-font-medium tw-text-accent">
                      Shortcut conflicts are handled by Obsidian
                    </div>
                    <div className="tw-text-xs tw-text-muted">
                      If a shortcut does not work, check Obsidian&apos;s Hotkeys settings for a
                      collision and remap the other command.
                    </div>
                  </div>
                }
              />
            </div>
          }
          value={settings.defaultSendShortcut}
          onChange={(value) => updateSetting("defaultSendShortcut", value as SEND_SHORTCUT)}
          options={[
            { label: "Enter", value: SEND_SHORTCUT.ENTER },
            { label: "Shift + Enter", value: SEND_SHORTCUT.SHIFT_ENTER },
          ]}
        />

        <SettingItem
          type="switch"
          title="Auto-Add Active Content to Context"
          description="Automatically add the active note or web tab to chat context when sending."
          checked={settings.autoAddActiveContentToContext}
          onCheckedChange={(checked) => {
            updateSetting("autoAddActiveContentToContext", checked);
          }}
        />

        <SettingItem
          type="switch"
          title="Auto-Add Selection to Context"
          description="Automatically add selected text to chat context."
          checked={settings.autoAddSelectionToContext}
          onCheckedChange={(checked) => {
            updateSetting("autoAddSelectionToContext", checked);
          }}
        />

        <SettingItem
          type="switch"
          title="Images in Markdown"
          description="Pass embedded images in markdown to the model when the chosen model supports it."
          checked={settings.passMarkdownImages}
          onCheckedChange={(checked) => {
            updateSetting("passMarkdownImages", checked);
          }}
        />
      </section>

      <section className="tw-space-y-4">
        <div>
          <div className="tw-text-xl tw-font-bold">Display</div>
          <div className="tw-text-sm tw-text-muted">
            Optional helpers that make the desktop flow more discoverable.
          </div>
        </div>

        <SettingItem
          type="switch"
          title="Suggested Prompts"
          description="Show suggested starter prompts in the chat view."
          checked={settings.showSuggestedPrompts}
          onCheckedChange={(checked) => updateSetting("showSuggestedPrompts", checked)}
        />

        <SettingItem
          type="switch"
          title="Relevant Notes"
          description="Show relevant notes in the chat view."
          checked={settings.showRelevantNotes}
          onCheckedChange={(checked) => updateSetting("showRelevantNotes", checked)}
        />
      </section>

      <section className="tw-space-y-4">
        <div>
          <div className="tw-text-xl tw-font-bold">Conversation Storage</div>
          <div className="tw-text-sm tw-text-muted">
            Saving should stay boring and predictable. The model should not be needed for basic note
            capture.
          </div>
        </div>

        <SettingItem
          type="switch"
          title="Autosave Chat"
          description="Save the chat after every user message and AI response."
          checked={settings.autosaveChat}
          onCheckedChange={(checked) => updateSetting("autosaveChat", checked)}
        />

        <SettingItem
          type="switch"
          title="Generate AI Chat Title on Save"
          description="Generate a concise title when saving a chat note."
          checked={settings.generateAIChatTitleOnSave}
          onCheckedChange={(checked) => updateSetting("generateAIChatTitleOnSave", checked)}
        />

        <SettingItem
          type="text"
          title="Default Conversation Folder Name"
          description="Default folder where chat conversations are saved."
          value={settings.defaultSaveFolder}
          onChange={(value) => updateSetting("defaultSaveFolder", value)}
          placeholder="05 System/KOS2/copilot-conversations"
        />

        <SettingItem
          type="text"
          title="Default Conversation Tag"
          description="Default tag used when saving a conversation."
          value={settings.defaultConversationTag}
          onChange={(value) => updateSetting("defaultConversationTag", value)}
          placeholder="ai-conversations"
        />

        <SettingItem
          type="custom"
          title="Conversation Filename Template"
          description={
            <div className="tw-flex tw-items-start tw-gap-1.5">
              <span className="tw-leading-none">
                Customize the format of saved conversation note names.
              </span>
              <HelpTooltip
                content={
                  <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2 tw-py-4">
                    <div className="tw-text-sm tw-font-medium tw-text-accent">Variables</div>
                    <div className="tw-text-xs tw-text-muted">
                      <p>Use these variables in your template:</p>
                      <ul className="tw-mt-2 tw-pl-4">
                        <li>
                          <code>{"{$date}"}</code> - Current date
                        </li>
                        <li>
                          <code>{"{$time}"}</code> - Current time
                        </li>
                        <li>
                          <code>{"{$topic}"}</code> - Topic or title from the conversation
                        </li>
                      </ul>
                      <p className="tw-mt-2">
                        Example: <code>{"{$date}_{$time}__{$topic}"}</code>
                      </p>
                    </div>
                  </div>
                }
              />
            </div>
          }
        >
          <div className="tw-flex tw-gap-2">
            <Input
              value={conversationNoteName}
              onChange={(e) => setConversationNoteName(e.target.value)}
              placeholder="{$date}_{$time}__{$topic}"
              className="tw-flex-1"
            />
            <Button onClick={applyCustomNoteFormat} disabled={isChecking} className="tw-min-w-20">
              {isChecking ? <Loader2 className="tw-animate-spin" /> : "Apply"}
            </Button>
          </div>
        </SettingItem>
      </section>
    </div>
  );
};
