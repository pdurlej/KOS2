import {
  CleanupAction,
  CleanupAssetMove,
  CleanupExecutionItem,
  CleanupExecutionResult,
  CleanupFolderConfig,
  CleanupLinkRewrite,
  CleanupProposal,
  CleanupProposalDecision,
  CleanupScanResult,
} from "@/kos/cleanup/types";
import { writeCleanupLog, getCleanupDateStamp } from "@/kos/cleanup/log";
import { ensureFolderExists } from "@/utils";
import { normalizePath, TAbstractFile, TFile, TFolder } from "obsidian";

const MARKDOWN_LINK_PATTERN = /(!?\[[^\]]*]\()([^)\s]+)(\))/g;

/**
 * Build the effective execution items by applying UI skips and overrides.
 *
 * @param proposal - Cleanup proposal.
 * @param decision - User decision from the proposal modal.
 * @returns Execution-ready cleanup items.
 */
export function buildCleanupExecutionItems(
  proposal: CleanupProposal,
  decision: CleanupProposalDecision
): CleanupExecutionItem[] {
  return proposal.items
    .filter((item) => !decision.skippedItemIds.includes(item.id))
    .flatMap((item) => {
      const overriddenDestination = decision.destinationOverrides[item.id]?.trim();
      const deleteModeOverride = decision.deleteModeOverrides[item.id];
      const action = item.action === "ambiguous" && overriddenDestination ? "move" : item.action;
      const destinationPath =
        action === "move" || action === "archive" || action === "trash"
          ? overriddenDestination || item.destinationPath
          : undefined;

      if (action === "ambiguous") {
        return [];
      }

      return [
        {
          proposalItemId: item.id,
          sourcePath: item.sourcePath,
          sourceKind: item.sourceKind,
          action: action as Exclude<CleanupAction, "ambiguous">,
          destinationPath,
          deleteMode: deleteModeOverride ?? item.deleteMode,
          reason: item.reason,
          confidence: item.confidence,
        },
      ];
    });
}

/**
 * Resolve the final destination path for a file or folder action.
 *
 * @param item - Execution item.
 * @param source - Source abstract file.
 * @returns Final destination path.
 */
function resolveFinalDestinationPath(item: CleanupExecutionItem, source: TAbstractFile): string {
  const rawDestination = normalizePath(item.destinationPath ?? "");
  if (!rawDestination) {
    return "";
  }

  const sourceName = source.name;
  const destinationLeaf = rawDestination.split("/").pop() ?? rawDestination;
  const looksLikeExactFilePath =
    source instanceof TFile &&
    (destinationLeaf === source.name ||
      destinationLeaf.toLowerCase().endsWith(`.${source.extension}`));
  const looksLikeExactFolderPath = source instanceof TFolder && destinationLeaf === source.name;

  if (looksLikeExactFilePath || looksLikeExactFolderPath) {
    return rawDestination;
  }

  return normalizePath(`${rawDestination}/${sourceName}`);
}

/**
 * Build an absolute move map for a folder move, including descendant items.
 *
 * @param sourceFolder - Folder being moved.
 * @param destinationPath - Final destination folder path.
 * @returns Move map for the folder subtree.
 */
function expandFolderMoveMap(
  sourceFolder: TFolder,
  destinationPath: string
): Record<string, string> {
  const map: Record<string, string> = {
    [sourceFolder.path]: destinationPath,
  };

  /**
   * Walk descendants and preserve relative suffix under the destination folder.
   *
   * @param folder - Current folder.
   */
  const walk = (folder: TFolder): void => {
    folder.children.forEach((child) => {
      const suffix = child.path.slice(sourceFolder.path.length).replace(/^\/+/, "");
      const childDestination = normalizePath(`${destinationPath}/${suffix}`);
      map[child.path] = childDestination;
      if (child instanceof TFolder) {
        walk(child);
      }
    });
  };

  walk(sourceFolder);
  return map;
}

/**
 * Resolve a relative markdown link against a note path.
 *
 * @param filePath - Markdown file path containing the link.
 * @param rawLink - Raw link path from markdown syntax.
 * @returns Normalized absolute vault path candidate.
 */
function resolveRelativeLink(filePath: string, rawLink: string): string {
  const fileDir = filePath.split("/").slice(0, -1).join("/");
  const joined = rawLink.startsWith("/") ? rawLink.replace(/^\/+/, "") : `${fileDir}/${rawLink}`;
  const normalized = normalizePath(joined);
  const stack: string[] = [];

  normalized.split("/").forEach((segment) => {
    if (!segment || segment === ".") {
      return;
    }
    if (segment === "..") {
      stack.pop();
      return;
    }
    stack.push(segment);
  });

  return normalizePath(stack.join("/"));
}

/**
 * Compute a relative vault path from one file path to another.
 *
 * @param fromFilePath - Source file path.
 * @param toPath - Target vault path.
 * @returns Relative path string.
 */
function relativePathFromFile(fromFilePath: string, toPath: string): string {
  const fromParts = fromFilePath.split("/").slice(0, -1);
  const toParts = toPath.split("/");
  let sharedIndex = 0;

  while (sharedIndex < fromParts.length && sharedIndex < toParts.length) {
    if (fromParts[sharedIndex] !== toParts[sharedIndex]) {
      break;
    }
    sharedIndex += 1;
  }

  const upSegments = new Array(fromParts.length - sharedIndex).fill("..");
  const downSegments = toParts.slice(sharedIndex);
  return normalizePath([...upSegments, ...downSegments].join("/"));
}

/**
 * Precompute safe markdown relative-link rewrites based on the final move map.
 *
 * @param moveMap - Final source-to-destination map for files and assets.
 * @returns Planned link rewrites and warning messages.
 */
async function planMarkdownLinkRewrites(
  moveMap: Record<string, string>
): Promise<{
  rewrites: Record<string, string>;
  warnings: string[];
  changes: CleanupLinkRewrite[];
}> {
  const warnings: string[] = [];
  const rewrites: Record<string, string> = {};
  const changes: CleanupLinkRewrite[] = [];
  const markdownFiles = app.vault.getMarkdownFiles();

  for (const markdownFile of markdownFiles) {
    const originalContent = await app.vault.cachedRead(markdownFile);
    const futureFilePath = moveMap[markdownFile.path] ?? markdownFile.path;
    let touched = false;

    const nextContent = originalContent.replace(
      MARKDOWN_LINK_PATTERN,
      (fullMatch: string, prefix: string, rawLink: string, suffix: string) => {
        if (/^(https?:|mailto:|#)/i.test(rawLink)) {
          return fullMatch;
        }

        const oldTargetPath = resolveRelativeLink(markdownFile.path, rawLink);
        const targetExists =
          !!app.vault.getAbstractFileByPath(oldTargetPath) ||
          Object.prototype.hasOwnProperty.call(moveMap, oldTargetPath);
        if (!targetExists) {
          warnings.push(
            `Left markdown link unchanged in ${markdownFile.path}: could not resolve ${rawLink}.`
          );
          return fullMatch;
        }

        const futureTargetPath = moveMap[oldTargetPath] ?? oldTargetPath;
        const nextRelativePath = relativePathFromFile(futureFilePath, futureTargetPath);
        if (nextRelativePath === rawLink) {
          return fullMatch;
        }

        touched = true;
        changes.push({
          filePath: futureFilePath,
          from: rawLink,
          to: nextRelativePath,
        });
        return `${prefix}${nextRelativePath}${suffix}`;
      }
    );

    if (touched) {
      rewrites[futureFilePath] = nextContent;
    }
  }

  return { rewrites, warnings, changes };
}

/**
 * Remove empty folders under the inbox root after cleanup finished.
 *
 * @param inboxRoot - Configured inbox root path.
 */
async function cleanupEmptyInboxFolders(inboxRoot: string): Promise<void> {
  const root = app.vault.getAbstractFileByPath(inboxRoot);
  if (!(root instanceof TFolder)) {
    return;
  }

  /**
   * Recursively delete empty folders, excluding the inbox Assets folder itself.
   *
   * @param folder - Candidate folder.
   */
  const prune = async (folder: TFolder): Promise<void> => {
    for (const child of [...folder.children]) {
      if (child instanceof TFolder) {
        await prune(child);
      }
    }

    if (folder.path === normalizePath(`${inboxRoot}/Assets`)) {
      return;
    }

    const current = app.vault.getAbstractFileByPath(folder.path);
    if (current instanceof TFolder && current.children.length === 0) {
      await app.vault.delete(current, true);
    }
  };

  await prune(root);
}

/**
 * Ensure a trash destination path is unique by appending an incrementing suffix on collision.
 *
 * @param basePath - Candidate trash destination path.
 * @returns Unique trash path.
 */
async function ensureUniqueTrashPath(basePath: string): Promise<string> {
  if (!(await app.vault.adapter.exists(basePath))) {
    return basePath;
  }

  const extensionIndex = basePath.lastIndexOf(".");
  const hasExtension = extensionIndex > basePath.lastIndexOf("/");
  const baseName = hasExtension ? basePath.slice(0, extensionIndex) : basePath;
  const extension = hasExtension ? basePath.slice(extensionIndex) : "";

  let counter = 1;
  while (await app.vault.adapter.exists(`${baseName}-${counter}${extension}`)) {
    counter += 1;
  }

  return `${baseName}-${counter}${extension}`;
}

/**
 * Plan exclusive asset moves for markdown files moved out of the inbox.
 *
 * @param executionItems - Final execution items.
 * @param scanResult - Raw scan result with asset ownership.
 * @param finalMoveMap - Final source-to-destination path map.
 * @returns Planned asset moves and warnings for shared assets.
 */
async function planAssetMoves(
  executionItems: CleanupExecutionItem[],
  scanResult: CleanupScanResult,
  finalMoveMap: Record<string, string>
): Promise<{ assetMoves: CleanupAssetMove[]; warnings: string[] }> {
  const warnings: string[] = [];
  const assetMoves: CleanupAssetMove[] = [];
  const movedFileTargets = new Map<string, string>();

  executionItems.forEach((item) => {
    if (item.sourceKind !== "file") {
      return;
    }
    const destinationPath = finalMoveMap[item.sourcePath];
    if (destinationPath) {
      movedFileTargets.set(item.sourcePath, destinationPath);
    }
  });

  for (const ownership of scanResult.assetOwnership) {
    const destinations = ownership.referencedBy
      .map((notePath) => movedFileTargets.get(notePath))
      .filter((value): value is string => typeof value === "string");

    if (destinations.length === 0) {
      continue;
    }

    const uniqueDestinationFolders = Array.from(
      new Set(destinations.map((path) => path.split("/").slice(0, -1).join("/")))
    );

    if (ownership.referencedBy.length > 1 && uniqueDestinationFolders.length > 1) {
      warnings.push(
        `Left shared asset ${ownership.assetPath} in place because referencing notes move to different destinations.`
      );
      continue;
    }

    const destinationFolder = uniqueDestinationFolders[0];
    const assetName = ownership.assetPath.split("/").pop() ?? ownership.assetPath;
    const targetFolder = normalizePath(`${destinationFolder}/Assets`);
    const destinationPath = normalizePath(`${targetFolder}/${assetName}`);
    if (await app.vault.adapter.exists(destinationPath)) {
      warnings.push(
        `Skipped asset move for ${ownership.assetPath}: ${destinationPath} already exists.`
      );
      continue;
    }

    assetMoves.push({
      sourcePath: ownership.assetPath,
      destinationPath,
      referencedBy: ownership.referencedBy,
    });
  }

  return { assetMoves, warnings };
}

/**
 * Execute a cleanup proposal after approval or dry-run.
 *
 * @param proposal - Original proposal.
 * @param decision - User decision from the proposal modal.
 * @param scanResult - Raw scan result.
 * @param folderConfig - Effective cleanup folder config.
 * @returns Execution result including log path.
 */
export async function executeCleanupProposal(
  proposal: CleanupProposal,
  decision: CleanupProposalDecision,
  scanResult: CleanupScanResult,
  folderConfig: CleanupFolderConfig
): Promise<CleanupExecutionResult> {
  const executionItems = buildCleanupExecutionItems(proposal, decision);
  const plannedMoveMap: Record<string, string> = {};
  const warnings: string[] = [];
  const dateStamp = getCleanupDateStamp();

  for (const item of executionItems) {
    const source = app.vault.getAbstractFileByPath(item.sourcePath);
    if (!source) {
      warnings.push(`Skipped missing cleanup source: ${item.sourcePath}`);
      continue;
    }

    if (item.action === "move" || item.action === "archive") {
      const finalDestinationPath = resolveFinalDestinationPath(item, source);
      if (!finalDestinationPath) {
        warnings.push(`Skipped ${item.sourcePath}: no destination path was provided.`);
        continue;
      }
      if (await app.vault.adapter.exists(finalDestinationPath)) {
        warnings.push(
          `Skipped ${item.sourcePath}: destination already exists at ${finalDestinationPath}.`
        );
        continue;
      }

      if (source instanceof TFolder) {
        Object.assign(plannedMoveMap, expandFolderMoveMap(source, finalDestinationPath));
      } else {
        plannedMoveMap[item.sourcePath] = finalDestinationPath;
      }
      item.destinationPath = finalDestinationPath;
      continue;
    }

    if (item.action === "trash") {
      const sourceName = source.name;
      const trashFolder = normalizePath(`${folderConfig.trash}/${dateStamp}`);
      const desiredPath = normalizePath(`${trashFolder}/${sourceName}`);
      item.destinationPath = await ensureUniqueTrashPath(desiredPath);

      if (source instanceof TFolder) {
        Object.assign(plannedMoveMap, expandFolderMoveMap(source, item.destinationPath));
      } else {
        plannedMoveMap[item.sourcePath] = item.destinationPath;
      }
    }
  }

  const { assetMoves, warnings: assetWarnings } = await planAssetMoves(
    executionItems,
    scanResult,
    plannedMoveMap
  );
  assetWarnings.forEach((warning) => warnings.push(warning));
  assetMoves.forEach((assetMove) => {
    plannedMoveMap[assetMove.sourcePath] = assetMove.destinationPath;
  });

  const { rewrites, warnings: linkRepairWarnings } = await planMarkdownLinkRewrites(plannedMoveMap);
  linkRepairWarnings.forEach((warning) => warnings.push(warning));

  const result: CleanupExecutionResult = {
    dryRun: decision.outcome === "dry-run",
    moved: [],
    archived: [],
    trashed: [],
    deleted: [],
    skipped: [],
    warnings,
    assetsMoved: assetMoves,
    sharedAssetWarnings: assetWarnings,
    linkRepairWarnings,
    logPath: "",
    moveMap: plannedMoveMap,
  };

  if (decision.outcome === "cancel") {
    result.logPath = await writeCleanupLog(proposal, decision, executionItems, result);
    return result;
  }

  if (decision.outcome === "dry-run") {
    result.logPath = await writeCleanupLog(proposal, decision, executionItems, result);
    return result;
  }

  const orderedItems = [...executionItems].sort(
    (left, right) => right.sourcePath.split("/").length - left.sourcePath.split("/").length
  );

  for (const item of orderedItems) {
    const source = app.vault.getAbstractFileByPath(item.sourcePath);
    if (!source) {
      result.skipped.push({
        kind: "skip",
        sourcePath: item.sourcePath,
        reason: "Source no longer exists at execution time.",
      });
      continue;
    }

    if (
      (item.action === "move" || item.action === "archive" || item.action === "trash") &&
      item.destinationPath
    ) {
      await ensureFolderExists(item.destinationPath.split("/").slice(0, -1).join("/"));
      await app.vault.rename(source, item.destinationPath);
      const actionEntry = {
        kind: item.action === "archive" ? "archive" : item.action === "trash" ? "trash" : "move",
        sourcePath: item.sourcePath,
        destinationPath: item.destinationPath,
        reason: item.reason,
      } as const;
      if (item.action === "archive") {
        result.archived.push(actionEntry);
      } else if (item.action === "trash") {
        result.trashed.push(actionEntry);
      } else {
        result.moved.push(actionEntry);
      }
      continue;
    }

    if (item.action === "delete") {
      await app.vault.delete(source, true);
      result.deleted.push({
        kind: "delete",
        sourcePath: item.sourcePath,
        reason: item.reason,
      });
    }
  }

  for (const assetMove of assetMoves) {
    const source = app.vault.getAbstractFileByPath(assetMove.sourcePath);
    if (!source) {
      continue;
    }
    await ensureFolderExists(assetMove.destinationPath.split("/").slice(0, -1).join("/"));
    await app.vault.rename(source, assetMove.destinationPath);
  }

  for (const [futurePath, rewrittenContent] of Object.entries(rewrites)) {
    const abstractFile = app.vault.getAbstractFileByPath(futurePath);
    if (abstractFile instanceof TFile) {
      await app.vault.modify(abstractFile, rewrittenContent);
    }
  }

  await cleanupEmptyInboxFolders(folderConfig.inbox);
  result.logPath = await writeCleanupLog(proposal, decision, executionItems, result);
  return result;
}
