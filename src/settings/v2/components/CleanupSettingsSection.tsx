import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingItem } from "@/components/ui/setting-item";
import { DEFAULT_CLEANUP_FOLDER_CONFIG } from "@/kos/cleanup/config";
import { CleanupLearnedRule } from "@/kos/cleanup/types";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { Notice } from "obsidian";
import React, { useMemo, useState } from "react";

/**
 * Parse the learned cleanup rules JSON textarea safely.
 *
 * @param rawValue - JSON string provided by the user.
 * @returns Parsed learned rules or null when invalid.
 */
function parseCleanupRules(rawValue: string): CleanupLearnedRule[] | null {
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? (parsed as CleanupLearnedRule[]) : null;
  } catch {
    return null;
  }
}

/**
 * Settings surface for cleanup folder mapping and learned routing rules.
 *
 * @returns Cleanup settings section.
 */
export const CleanupSettingsSection: React.FC = () => {
  const settings = useSettingsValue();
  const [rulesText, setRulesText] = useState(
    JSON.stringify(settings.cleanupLearnedRules ?? [], null, 2)
  );

  const folderConfig = settings.cleanupFolderConfig ?? DEFAULT_CLEANUP_FOLDER_CONFIG;
  const destinationHints = useMemo(
    () => [
      folderConfig.inbox,
      folderConfig.projects,
      folderConfig.areas,
      folderConfig.resources,
      folderConfig.archive,
      folderConfig.trash,
    ],
    [
      folderConfig.archive,
      folderConfig.areas,
      folderConfig.inbox,
      folderConfig.projects,
      folderConfig.resources,
      folderConfig.trash,
    ]
  );

  return (
    <section className="tw-space-y-4 tw-rounded-xl tw-border tw-border-border tw-p-4 tw-bg-secondary/20">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <div className="tw-flex tw-items-center tw-gap-2">
          <div className="tw-text-lg tw-font-semibold">Cleanup Inbox</div>
          <Badge variant="outline">26.4.5 / 26.4.6</Badge>
        </div>
        <div className="tw-text-sm tw-text-muted">
          `cleanup` is a batch inbox workflow. It keeps proposal-first safety from v1, then layers
          in folder mapping and learned routing rules from v2.
        </div>
      </div>

      <div className="tw-grid tw-gap-3 md:tw-grid-cols-2">
        <SettingItem
          type="text"
          title="Inbox folder"
          description="Default scan root for the cleanup workflow."
          value={folderConfig.inbox}
          onChange={(value) =>
            updateSetting("cleanupFolderConfig", {
              ...folderConfig,
              inbox: value,
            })
          }
        />
        <SettingItem
          type="text"
          title="Projects root"
          description="Active work destination used by cleanup."
          value={folderConfig.projects}
          onChange={(value) =>
            updateSetting("cleanupFolderConfig", {
              ...folderConfig,
              projects: value,
            })
          }
        />
        <SettingItem
          type="text"
          title="Areas root"
          description="Ongoing responsibility destination used by cleanup."
          value={folderConfig.areas}
          onChange={(value) =>
            updateSetting("cleanupFolderConfig", {
              ...folderConfig,
              areas: value,
            })
          }
        />
        <SettingItem
          type="text"
          title="Resources root"
          description="Reference-material destination used by cleanup."
          value={folderConfig.resources}
          onChange={(value) =>
            updateSetting("cleanupFolderConfig", {
              ...folderConfig,
              resources: value,
            })
          }
        />
        <SettingItem
          type="text"
          title="Archive root"
          description="Historical material destination used by cleanup."
          value={folderConfig.archive}
          onChange={(value) =>
            updateSetting("cleanupFolderConfig", {
              ...folderConfig,
              archive: value,
            })
          }
        />
        <SettingItem
          type="text"
          title="Trash staging root"
          description="Base folder for staged trash. Cleanup appends the current date automatically."
          value={folderConfig.trash}
          onChange={(value) =>
            updateSetting("cleanupFolderConfig", {
              ...folderConfig,
              trash: value,
            })
          }
        />
      </div>

      <div className="tw-flex tw-flex-wrap tw-gap-2">
        <Button
          variant="secondary"
          onClick={() => updateSetting("cleanupFolderConfig", DEFAULT_CLEANUP_FOLDER_CONFIG)}
        >
          Reset mapping to KOS defaults
        </Button>
        <Badge variant="outline">{destinationHints.join(" • ")}</Badge>
      </div>

      <div className="tw-space-y-2">
        <div className="tw-text-sm tw-font-medium tw-text-normal">Learned cleanup rules</div>
        <div className="tw-text-xs tw-leading-relaxed tw-text-muted">
          Use JSON to store recurring routing rules. This is a user-managed rule store, not code
          mutation. Each rule should include `id`, `matcherType`, `matchMode`, `pattern`, `action`,
          and optionally `destinationPath`, `neverHardDelete`, `notes`.
        </div>
        <textarea
          className="tw-min-h-[220px] tw-w-full tw-rounded-md tw-border tw-border-border tw-bg-transparent tw-p-3 tw-font-mono tw-text-xs"
          value={rulesText}
          onChange={(event) => setRulesText(event.target.value)}
        />
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const parsed = parseCleanupRules(rulesText);
              if (!parsed) {
                new Notice("Cleanup rules must be valid JSON array.");
                return;
              }
              updateSetting("cleanupLearnedRules", parsed);
              new Notice("Saved cleanup learned rules.");
            }}
          >
            Save rules JSON
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setRulesText(JSON.stringify(settings.cleanupLearnedRules ?? [], null, 2))
            }
          >
            Reload current rules
          </Button>
        </div>
      </div>
    </section>
  );
};
