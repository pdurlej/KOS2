import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ObsidianNativeSelect } from "@/components/ui/obsidian-native-select";
import { SettingItem } from "@/components/ui/setting-item";
import { flushRecordedPromptPayloadToLog } from "@/LLMProviders/chainRunner/utils/promptPayloadRecorder";
import { logFileManager } from "@/logFileManager";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { ArrowUpRight, Plus } from "lucide-react";
import React from "react";
import {
  ensureKOS2PromptPack,
  getPromptFilePath,
  KOS2_PROMPT_PRESETS,
  SystemPromptAddModal,
  SystemPromptManager,
} from "@/system-prompts";
import { useSystemPrompts } from "@/system-prompts/state";
import { Notice } from "obsidian";

export const AdvancedSettings: React.FC = () => {
  const settings = useSettingsValue();
  const prompts = useSystemPrompts();

  const defaultPromptExists = prompts.some(
    (prompt) => prompt.title === settings.defaultSystemPromptTitle
  );

  const displayValue = defaultPromptExists ? settings.defaultSystemPromptTitle : "";

  const handleSelectChange = (value: string) => {
    updateSetting("defaultSystemPromptTitle", value);
  };

  const handleOpenSourceFile = () => {
    if (!displayValue) return;
    const filePath = getPromptFilePath(displayValue);
    (app as any).setting.close();
    app.workspace.openLinkText(filePath, "", true);
  };

  const handleAddPrompt = () => {
    const modal = new SystemPromptAddModal(app, prompts);
    modal.open();
  };

  const handleInstallKOS2PromptPack = async () => {
    const manager = SystemPromptManager.getInstance();
    await ensureKOS2PromptPack(manager);
    new Notice("Installed the KOS2 system prompt pack.", 4000);
  };

  return (
    <div className="tw-space-y-6">
      <section className="tw-space-y-4 tw-rounded-lg tw-border tw-p-4">
        <div>
          <div className="tw-text-lg tw-font-semibold">System Prompt</div>
          <div className="tw-text-sm tw-text-muted">
            Advanced prompt control for users who want to tune the assistant behavior directly.
          </div>
        </div>

        <div className="tw-rounded-lg tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
          <div className="tw-flex tw-flex-col tw-gap-3 lg:tw-flex-row lg:tw-items-start lg:tw-justify-between">
            <div className="tw-space-y-2">
              <div className="tw-text-sm tw-font-medium tw-text-normal">
                Recommended KOS2 presets
              </div>
              <div className="tw-text-xs tw-text-muted">
                These prompts are based on the KOS workflows rather than generic assistant tones.
              </div>
              <div className="tw-flex tw-flex-wrap tw-gap-2">
                {KOS2_PROMPT_PRESETS.map((preset) => (
                  <Badge key={preset.title} variant="outline">
                    {preset.title}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="secondary" onClick={() => void handleInstallKOS2PromptPack()}>
              Install KOS2 Prompt Pack
            </Button>
          </div>
        </div>

        <SettingItem
          type="custom"
          title="Default System Prompt"
          description="Choose which KOS2 behavior profile should guide all messages by default."
        >
          <div className="tw-flex tw-items-center tw-gap-2">
            <ObsidianNativeSelect
              value={displayValue}
              onChange={(e) => handleSelectChange(e.target.value)}
              options={[
                { label: "None (use built-in prompt)", value: "" },
                ...prompts.map((prompt) => ({
                  label:
                    prompt.title === settings.defaultSystemPromptTitle
                      ? `${prompt.title} (Default)`
                      : prompt.title,
                  value: prompt.title,
                })),
              ]}
              containerClassName="tw-flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenSourceFile}
              className="tw-size-5 tw-shrink-0 tw-p-0"
              title="Open the source file"
              disabled={!displayValue}
            >
              <ArrowUpRight className="tw-size-5" />
            </Button>
            <Button variant="default" size="icon" onClick={handleAddPrompt} title="Add new prompt">
              <Plus className="tw-size-4" />
            </Button>
          </div>
        </SettingItem>

        <SettingItem
          type="text"
          title="System Prompts Folder Name"
          description="Folder where system prompts are stored."
          value={settings.userSystemPromptsFolder}
          onChange={(value) => updateSetting("userSystemPromptsFolder", value)}
          placeholder="05 System/KOS2/system-prompts"
        />
      </section>

      <section className="tw-space-y-4 tw-rounded-lg tw-border tw-p-4">
        <div>
          <div className="tw-text-lg tw-font-semibold">Diagnostics</div>
          <div className="tw-text-sm tw-text-muted">
            Keep these hidden until you need to debug settings or share a log with the user.
          </div>
        </div>

        <SettingItem
          type="switch"
          title="Enable Encryption"
          description="Encrypt API keys stored by the plugin."
          checked={settings.enableEncryption}
          onCheckedChange={(checked) => {
            updateSetting("enableEncryption", checked);
          }}
        />

        <SettingItem
          type="switch"
          title="Debug Mode"
          description="Write additional debug details to the console."
          checked={settings.debug}
          onCheckedChange={(checked) => {
            updateSetting("debug", checked);
          }}
        />

        <SettingItem
          type="custom"
          title="Create Log File"
          description={`Open the KOS2 log file (${logFileManager.getLogPath()}) for easy sharing when reporting issues.`}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await flushRecordedPromptPayloadToLog();
              await logFileManager.flush();
              await logFileManager.openLogFile();
            }}
          >
            Create Log File
          </Button>
        </SettingItem>
      </section>
    </div>
  );
};
