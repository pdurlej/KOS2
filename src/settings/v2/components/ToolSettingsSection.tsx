import React from "react";
import { Badge } from "@/components/ui/badge";
import { SettingItem } from "@/components/ui/setting-item";
import { AGENT_MAX_ITERATIONS_LIMIT } from "@/constants";
import { hasTranscriptApiKeyConfigured } from "@/plusUtils";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { ToolDefinition } from "@/tools/ToolRegistry";
import { ToolRegistry } from "@/tools/ToolRegistry";

const PRIMARY_TOOL_ORDER = ["localSearch", "readNote", "writeFile", "editFile", "webSearch"];
const OPTIONAL_TOOL_ORDER = ["youtubeTranscription", "updateMemory"];

/**
 * Return a stable ordering weight for known tool IDs.
 *
 * @param toolId - Tool ID from the registry.
 * @param preferredOrder - Ordered list of preferred IDs.
 * @returns Sort weight for the tool.
 */
function getToolOrderWeight(toolId: string, preferredOrder: readonly string[]): number {
  const index = preferredOrder.indexOf(toolId);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export const ToolSettingsSection: React.FC = () => {
  const settings = useSettingsValue();
  const registry = ToolRegistry.getInstance();
  const transcriptReady = hasTranscriptApiKeyConfigured();

  const enabledToolIds = new Set(settings.autonomousAgentEnabledToolIds || []);

  const configurableTools = registry.getConfigurableTools();

  const visibleConfigurableTools = configurableTools.filter(
    (tool) => tool.metadata.id !== "youtubeTranscription" || transcriptReady
  );

  const primaryTools = visibleConfigurableTools
    .filter((tool) => PRIMARY_TOOL_ORDER.includes(tool.metadata.id))
    .sort(
      (left, right) =>
        getToolOrderWeight(left.metadata.id, PRIMARY_TOOL_ORDER) -
        getToolOrderWeight(right.metadata.id, PRIMARY_TOOL_ORDER)
    );

  const optionalTools = visibleConfigurableTools
    .filter((tool) => OPTIONAL_TOOL_ORDER.includes(tool.metadata.id))
    .sort(
      (left, right) =>
        getToolOrderWeight(left.metadata.id, OPTIONAL_TOOL_ORDER) -
        getToolOrderWeight(right.metadata.id, OPTIONAL_TOOL_ORDER)
    );

  const cliTools = visibleConfigurableTools.filter((tool) => tool.metadata.category === "cli");
  const allCliEnabled = cliTools.every(({ metadata }) => enabledToolIds.has(metadata.id));

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    const newEnabledIds = new Set(enabledToolIds);
    if (enabled) {
      newEnabledIds.add(toolId);
    } else {
      newEnabledIds.delete(toolId);
    }

    updateSetting("autonomousAgentEnabledToolIds", Array.from(newEnabledIds));
  };

  /**
   * Toggle all CLI tools on or off at once.
   */
  const handleCliMasterToggle = (enabled: boolean, cliTools: ToolDefinition[]) => {
    const newEnabledIds = new Set(enabledToolIds);
    for (const { metadata } of cliTools) {
      if (enabled) {
        newEnabledIds.add(metadata.id);
      } else {
        newEnabledIds.delete(metadata.id);
      }
    }
    updateSetting("autonomousAgentEnabledToolIds", Array.from(newEnabledIds));
  };

  return (
    <>
      <SettingItem
        type="slider"
        title="Max Iterations"
        description="Maximum number of reasoning iterations the autonomous agent can perform. Higher values allow for more complex reasoning but may take longer."
        value={settings.autonomousAgentMaxIterations ?? 4}
        onChange={(value) => {
          updateSetting("autonomousAgentMaxIterations", value);
        }}
        min={4}
        max={AGENT_MAX_ITERATIONS_LIMIT}
        step={1}
      />

      <div className="tw-mt-4 tw-rounded-lg tw-bg-secondary tw-p-4">
        <div className="tw-mb-2 tw-flex tw-items-center tw-justify-between tw-gap-2">
          <div className="tw-text-sm tw-font-medium">Agent Accessible Tools</div>
          {settings.privacyLocalMode && (
            <Badge variant="outline" className="tw-text-accent">
              Privacy mode keeps web off
            </Badge>
          )}
        </div>
        <div className="tw-mb-4 tw-text-xs tw-text-muted">
          Keep only the few capabilities you want KOS2 Agent to use by default.
        </div>

        <div className="tw-space-y-4">
          <div className="tw-rounded-md tw-border tw-border-border tw-bg-secondary/20">
            <div className="tw-border-b tw-p-3 tw-border-border/70">
              <div className="tw-text-sm tw-font-medium tw-text-normal">Core workflow tools</div>
              <div className="tw-text-xs tw-text-muted">
                These are the tools that make the KOS2 workflow loop useful in day-to-day note work.
              </div>
            </div>
            <div className="tw-pb-2">
              {primaryTools.map(({ metadata }) => {
                const isWebSearch = metadata.id === "webSearch";
                const isDisabledByPrivacy = settings.privacyLocalMode && isWebSearch;

                return (
                  <SettingItem
                    key={metadata.id}
                    type="switch"
                    title={metadata.displayName}
                    description={
                      isDisabledByPrivacy
                        ? "Privacy (local) Mode keeps web search off. Turn off privacy mode if you want online lookups."
                        : metadata.description
                    }
                    checked={isDisabledByPrivacy ? false : enabledToolIds.has(metadata.id)}
                    onCheckedChange={(checked) => handleToolToggle(metadata.id, checked)}
                    disabled={isDisabledByPrivacy}
                  />
                );
              })}
            </div>
          </div>

          {optionalTools.length > 0 && (
            <div className="tw-rounded-md tw-border tw-border-border tw-bg-secondary/20">
              <div className="tw-border-b tw-p-3 tw-border-border/70">
                <div className="tw-text-sm tw-font-medium tw-text-normal">Optional extras</div>
                <div className="tw-text-xs tw-text-muted">
                  Turn these on only when you want memory updates or transcript-specific workflows.
                </div>
              </div>
              <div className="tw-pb-2">
                {optionalTools.map(({ metadata }) => (
                  <SettingItem
                    key={metadata.id}
                    type="switch"
                    title={metadata.displayName}
                    description={metadata.description}
                    checked={enabledToolIds.has(metadata.id)}
                    onCheckedChange={(checked) => handleToolToggle(metadata.id, checked)}
                  />
                ))}
              </div>
            </div>
          )}

          {cliTools.length > 0 && (
            <details className="tw-rounded-md tw-border tw-border-border tw-bg-secondary/20">
              <summary className="tw-cursor-pointer tw-select-none tw-p-3 tw-text-sm tw-font-medium">
                Experimental desktop controls
              </summary>
              <div className="tw-border-t tw-pb-2 tw-border-border/70">
                <SettingItem
                  type="switch"
                  title="Obsidian CLI (Experimental)"
                  description="Enable direct vault operations via the Obsidian desktop CLI."
                  checked={allCliEnabled}
                  onCheckedChange={(checked) => handleCliMasterToggle(checked, cliTools)}
                />
                <div className="tw-ml-4 tw-flex tw-flex-col tw-gap-1 tw-border-l tw-border-border tw-px-3">
                  {cliTools.map(({ metadata }) => (
                    <div key={metadata.id} className="tw-flex tw-flex-col">
                      <span className="tw-text-xs tw-font-medium tw-text-normal">
                        {metadata.displayName}
                      </span>
                      <span className="tw-text-xs tw-text-muted">{metadata.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    </>
  );
};
