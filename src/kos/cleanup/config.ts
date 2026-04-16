import { CleanupFolderConfig } from "@/kos/cleanup/types";

/**
 * Normalize a vault path without depending on Obsidian runtime helpers.
 *
 * @param value - Raw vault path.
 * @returns Normalized vault path.
 */
function normalizeVaultPath(value: string): string {
  const trimmed = value.replace(/\\/g, "/").trim();
  return trimmed.replace(/\/+/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Default folder mapping for the cleanup workflow.
 */
export const DEFAULT_CLEANUP_FOLDER_CONFIG: CleanupFolderConfig = {
  inbox: "01 Inbox",
  projects: "10 Projects",
  areas: "20 Areas",
  resources: "30 Resources",
  archive: "40 Archive",
  trash: "40 Archive/_trash",
};

/**
 * Normalize a cleanup folder configuration and fill missing values from defaults.
 *
 * @param value - Raw persisted folder configuration.
 * @returns Normalized cleanup folder configuration.
 */
export function normalizeCleanupFolderConfig(
  value?: Partial<CleanupFolderConfig>
): CleanupFolderConfig {
  return {
    inbox: normalizeVaultPath(value?.inbox?.trim() || DEFAULT_CLEANUP_FOLDER_CONFIG.inbox),
    projects: normalizeVaultPath(value?.projects?.trim() || DEFAULT_CLEANUP_FOLDER_CONFIG.projects),
    areas: normalizeVaultPath(value?.areas?.trim() || DEFAULT_CLEANUP_FOLDER_CONFIG.areas),
    resources: normalizeVaultPath(
      value?.resources?.trim() || DEFAULT_CLEANUP_FOLDER_CONFIG.resources
    ),
    archive: normalizeVaultPath(value?.archive?.trim() || DEFAULT_CLEANUP_FOLDER_CONFIG.archive),
    trash: normalizeVaultPath(value?.trash?.trim() || DEFAULT_CLEANUP_FOLDER_CONFIG.trash),
  };
}
