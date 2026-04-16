import { computeAssetOwnership } from "@/kos/cleanup/assets";
import { classifyCleanupProposal } from "@/kos/cleanup/classify";
import { DEFAULT_CLEANUP_FOLDER_CONFIG, normalizeCleanupFolderConfig } from "@/kos/cleanup/config";
import { executeCleanupProposal } from "@/kos/cleanup/execute";
import { scanDestinationFolders, scanInboxItems } from "@/kos/cleanup/scan";
import {
  CleanupExecutionResult,
  CleanupFolderConfig,
  CleanupProposal,
  CleanupProposalDecision,
  CleanupScanResult,
} from "@/kos/cleanup/types";
import type CopilotPlugin from "@/main";
import { CopilotSettings, getSettings } from "@/settings/model";
import { TFile } from "obsidian";

/**
 * Resolve the effective cleanup folder configuration from plugin settings.
 *
 * @param settings - Current plugin settings snapshot.
 * @returns Effective cleanup folder configuration.
 */
export function getEffectiveCleanupFolderConfig(
  settings: Pick<CopilotSettings, "cleanupFolderConfig">
): CleanupFolderConfig {
  return normalizeCleanupFolderConfig(
    settings.cleanupFolderConfig ?? DEFAULT_CLEANUP_FOLDER_CONFIG
  );
}

/**
 * Scan the vault and build the cleanup proposal payload.
 *
 * @param plugin - Active plugin instance.
 * @returns Cleanup proposal together with raw scan data.
 */
export async function prepareCleanupProposal(
  plugin: CopilotPlugin
): Promise<{ proposal: CleanupProposal; scanResult: CleanupScanResult }> {
  const currentSettings = getSettings();
  const folderConfig = getEffectiveCleanupFolderConfig(currentSettings);
  const learnedRules = currentSettings.cleanupLearnedRules ?? [];
  const { inboxItems, assetItems } = await scanInboxItems(plugin.app.vault, folderConfig);
  const destinationFolders = await scanDestinationFolders(plugin.app.vault, folderConfig);
  const markdownNotes = inboxItems.filter(
    (item): item is typeof item & { kind: "file"; file: TFile } =>
      item.kind === "file" && item.file instanceof TFile && item.extension === "md"
  );
  const contentEntries = await Promise.all(
    markdownNotes.map(
      async (item) => [item.path, await plugin.app.vault.cachedRead(item.file)] as const
    )
  );
  const contentByPath = Object.fromEntries(contentEntries);
  const assetOwnership = computeAssetOwnership(markdownNotes, contentByPath, assetItems);
  const scanResult: CleanupScanResult = {
    inboxItems,
    assetItems,
    destinationFolders,
    assetOwnership,
  };
  const proposal = await classifyCleanupProposal(
    scanResult,
    contentByPath,
    folderConfig,
    learnedRules
  );

  return {
    proposal,
    scanResult,
  };
}

/**
 * Execute a cleanup proposal after the modal returns a user decision.
 *
 * @param proposal - Original cleanup proposal.
 * @param decision - User decision returned by the proposal modal.
 * @param scanResult - Raw scan result that backs the proposal.
 * @returns Execution result.
 */
export async function applyCleanupDecision(
  proposal: CleanupProposal,
  decision: CleanupProposalDecision,
  scanResult: CleanupScanResult
): Promise<CleanupExecutionResult> {
  const folderConfig = getEffectiveCleanupFolderConfig(getSettings());
  return executeCleanupProposal(proposal, decision, scanResult, folderConfig);
}
