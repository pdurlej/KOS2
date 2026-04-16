import {
  CleanupExecutionResult,
  CleanupExecutionItem,
  CleanupProposal,
  CleanupProposalDecision,
} from "@/kos/cleanup/types";
import { ensureFolderExists } from "@/utils";
import { normalizePath } from "obsidian";

const CLEANUP_LOG_FOLDER = "99 System/cleanup-logs";

/**
 * Build a YYYY-MM-DD date stamp in the local timezone.
 *
 * @returns Local cleanup date stamp.
 */
export function getCleanupDateStamp(): string {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Build the markdown content for a cleanup execution log.
 *
 * @param proposal - Original cleanup proposal.
 * @param decision - User decision applied to the proposal.
 * @param executionItems - Final execution items after overrides.
 * @param executionResult - Result of the execution or dry-run.
 * @returns Markdown log content.
 */
export function renderCleanupLog(
  proposal: CleanupProposal,
  decision: CleanupProposalDecision,
  executionItems: CleanupExecutionItem[],
  executionResult: CleanupExecutionResult
): string {
  const dateStamp = getCleanupDateStamp();
  const summaryLines = [
    `- Scanned: ${proposal.scannedItemCount} items`,
    `- Proposed actions: ${proposal.items.length}`,
    `- Execution mode: ${executionResult.dryRun ? "dry-run" : "apply"}`,
    `- Moved: ${executionResult.moved.length}`,
    `- Archived: ${executionResult.archived.length}`,
    `- Trashed: ${executionResult.trashed.length}`,
    `- Deleted: ${executionResult.deleted.length}`,
    `- Skipped: ${executionResult.skipped.length + decision.skippedItemIds.length}`,
    `- Ambiguous left unresolved: ${
      proposal.items.filter(
        (item) =>
          item.action === "ambiguous" &&
          !executionItems.some((candidate) => candidate.proposalItemId === item.id)
      ).length
    }`,
  ];

  const actionLines = [
    "## Actions",
    "",
    "### Planned items",
    ...executionItems.map(
      (item) =>
        `- \`${item.sourcePath}\`${item.destinationPath ? ` -> \`${item.destinationPath}\`` : ""} (${item.action}, ${item.reason})`
    ),
    "",
    "### Executed moves",
    ...executionResult.moved.map(
      (action) => `- \`${action.sourcePath}\` -> \`${action.destinationPath}\` (${action.reason})`
    ),
    "",
    "### Executed archives",
    ...executionResult.archived.map(
      (action) => `- \`${action.sourcePath}\` -> \`${action.destinationPath}\` (${action.reason})`
    ),
    "",
    "### Trashed",
    ...executionResult.trashed.map(
      (action) => `- \`${action.sourcePath}\` -> \`${action.destinationPath}\` (${action.reason})`
    ),
    "",
    "### Hard deleted",
    ...executionResult.deleted.map((action) => `- \`${action.sourcePath}\` (${action.reason})`),
    "",
    "### Assets moved",
    ...executionResult.assetsMoved.map(
      (assetMove) =>
        `- \`${assetMove.sourcePath}\` -> \`${assetMove.destinationPath}\` (referenced by ${assetMove.referencedBy.join(", ")})`
    ),
    "",
    "### Warnings",
    ...[
      ...executionResult.warnings,
      ...executionResult.sharedAssetWarnings,
      ...executionResult.linkRepairWarnings,
    ].map((warning) => `- ${warning}`),
  ];

  return [
    `# Cleanup Log ${dateStamp}`,
    "",
    "## Summary",
    ...summaryLines,
    "",
    ...actionLines,
    "",
    "## Proposal metadata",
    `- Duplicate groups: ${proposal.duplicateGroups.length}`,
    `- Same-day clusters: ${proposal.clusters.length}`,
    `- New folders proposed: ${proposal.newFolders.length}`,
  ].join("\n");
}

/**
 * Write the cleanup log markdown file to the dedicated log folder.
 *
 * @param proposal - Original cleanup proposal.
 * @param decision - User decision applied to the proposal.
 * @param executionItems - Final execution items after overrides.
 * @param executionResult - Result of execution or dry-run.
 * @returns Written log path.
 */
export async function writeCleanupLog(
  proposal: CleanupProposal,
  decision: CleanupProposalDecision,
  executionItems: CleanupExecutionItem[],
  executionResult: CleanupExecutionResult
): Promise<string> {
  const dateStamp = getCleanupDateStamp();
  const folderPath = normalizePath(CLEANUP_LOG_FOLDER);
  const logPath = normalizePath(`${folderPath}/${dateStamp}.md`);
  await ensureFolderExists(folderPath);
  const content = renderCleanupLog(proposal, decision, executionItems, executionResult);

  if (await app.vault.adapter.exists(logPath)) {
    await app.vault.adapter.write(logPath, content);
  } else {
    await app.vault.create(logPath, content);
  }

  return logPath;
}
