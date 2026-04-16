import { detectDuplicateGroups } from "@/kos/cleanup/duplicates";
import { createWorkflowNoteRecord } from "@/kos/workflows/parser";
import {
  CleanupAction,
  CleanupCluster,
  CleanupDeleteMode,
  CleanupDestinationFolder,
  CleanupDuplicateGroup,
  CleanupFolderConfig,
  CleanupLearnedRule,
  CleanupProposal,
  CleanupProposalGroup,
  CleanupProposalItem,
  CleanupScanResult,
  CleanupScannedFile,
  CleanupScannedItem,
} from "@/kos/cleanup/types";
import { getSettings } from "@/settings/model";
import { normalizePath, TFile, TFolder } from "obsidian";

const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "aac", "ogg"]);
const PROJECT_MARKER_FILES = new Set(["readme.md", "package.json", "index.html"]);

/**
 * Compute age in whole days from a millisecond timestamp.
 *
 * @param timestamp - File creation or modification time.
 * @returns Rounded-down age in days.
 */
function getAgeDays(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

/**
 * Normalize a string for fuzzy destination matching.
 *
 * @param value - Raw string value.
 * @returns Lowercase alphanumeric tokens joined by spaces.
 */
function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

/**
 * Create a safe folder name candidate from a filename or title.
 *
 * @param value - Raw title-like string.
 * @returns Sanitized folder name.
 */
function sanitizeFolderName(value: string): string {
  return (
    value
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Unsorted"
  );
}

/**
 * Convert action type to modal presentation group.
 *
 * @param action - Cleanup action.
 * @param hasDuplicateGroup - Whether the item belongs to a duplicate group.
 * @returns Presentation group string.
 */
function toPresentationGroup(
  action: CleanupAction,
  hasDuplicateGroup: boolean
): CleanupProposalGroup {
  if (hasDuplicateGroup) {
    return "duplicates";
  }
  return action;
}

/**
 * Match a learned cleanup rule against a scanned item.
 *
 * @param item - Candidate cleanup item.
 * @param rules - Learned rules from settings.
 * @returns Matching rule or undefined.
 */
function matchLearnedRule(
  item: CleanupScannedItem,
  rules: CleanupLearnedRule[]
): CleanupLearnedRule | undefined {
  const filename = item.kind === "file" ? item.name : (item.path.split("/").pop() ?? item.path);
  const haystacks: Record<CleanupLearnedRule["matcherType"], string> = {
    filename: filename,
    path: item.path,
    extension: item.extension,
  };

  return rules.find((rule) => {
    const haystack = haystacks[rule.matcherType] ?? "";
    switch (rule.matchMode) {
      case "contains":
        return haystack.includes(rule.pattern);
      case "prefix":
        return haystack.startsWith(rule.pattern);
      case "suffix":
        return haystack.endsWith(rule.pattern);
      case "equals":
        return haystack === rule.pattern;
      case "regex":
        try {
          return new RegExp(rule.pattern, "i").test(haystack);
        } catch {
          return false;
        }
    }
  });
}

/**
 * Choose the best existing destination folder for a route.
 *
 * @param destinations - Existing destination folders.
 * @param rootType - PARA root type.
 * @param hints - Fuzzy matching hints from content.
 * @returns Best destination folder path.
 */
function chooseDestinationPath(
  destinations: CleanupDestinationFolder[],
  rootType: CleanupDestinationFolder["rootType"],
  hints: string[]
): string {
  const candidates = destinations.filter((destination) => destination.rootType === rootType);
  if (candidates.length === 0) {
    return "";
  }

  const normalizedHints = hints.map(normalizeMatchText).filter(Boolean);
  let bestCandidate = candidates[0];
  let bestScore = -1;

  candidates.forEach((candidate) => {
    const candidateText = normalizeMatchText(candidate.path);
    const depthBonus = candidate.depth > 0 ? 0.2 : 0;
    const score =
      normalizedHints.reduce((currentScore, hint) => {
        if (!hint) {
          return currentScore;
        }
        return currentScore + (candidateText.includes(hint) ? 1 : 0);
      }, 0) + depthBonus;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  });

  return bestCandidate.path;
}

/**
 * Read a converted markdown sidecar for a PDF if KOS2 already created one.
 *
 * @param file - PDF file under classification.
 * @returns Converted markdown preview or an empty string.
 */
async function readConvertedPdfPreview(file: CleanupScannedFile): Promise<string> {
  const settings = getSettings();
  const outputFolder = settings.convertedDocOutputFolder?.trim();
  if (!outputFolder) {
    return "";
  }

  const safePath = file.path.replace(/\.[^.]+$/, "").replace(/[/\\]/g, "__");
  const candidates = [
    normalizePath(`${outputFolder}/${file.name.replace(/\.pdf$/i, "")}.md`),
    normalizePath(`${outputFolder}/${safePath}.md`),
  ];

  for (const candidate of candidates) {
    if (!(await app.vault.adapter.exists(candidate))) {
      continue;
    }

    const content = await app.vault.adapter.read(candidate);
    if (content.startsWith(`<!-- source: ${file.path} -->`)) {
      return content.replace(/^<!--[\s\S]*?-->\n?/, "");
    }
  }

  return "";
}

/**
 * Build same-day clusters used for grouped proposal hints.
 *
 * @param items - Candidate inbox items.
 * @returns Same-day clusters for three or more items.
 */
function buildClusters(items: CleanupScannedItem[]): CleanupCluster[] {
  const bucket = new Map<string, CleanupScannedItem[]>();

  items.forEach((item) => {
    const date = new Date(item.ctime);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const group = bucket.get(key) ?? [];
    group.push(item);
    bucket.set(key, group);
  });

  return Array.from(bucket.entries())
    .filter(([, group]) => group.length >= 3)
    .map(([key, group]) => ({
      id: `cluster:${key}`,
      label: `Import cluster from ${key}`,
      itemIds: group.map((item) => item.id),
    }));
}

/**
 * Read simple content signals from a markdown note.
 *
 * @param file - Markdown note being classified.
 * @param content - Raw markdown content.
 * @returns Draft route hints for PARA classification.
 */
function classifyMarkdownContent(
  file: CleanupScannedFile,
  content: string
): {
  action: CleanupAction;
  rootType: CleanupDestinationFolder["rootType"];
  confidence: number;
  reason: string;
  hints: string[];
} {
  const cache = app.metadataCache.getFileCache(file.file);
  const rawTags = new Set<string>();
  (cache?.tags ?? []).forEach((tag) => rawTags.add(tag.tag));
  const frontmatterTags = cache?.frontmatter?.tags;
  if (Array.isArray(frontmatterTags)) {
    frontmatterTags.forEach((tag) => rawTags.add(String(tag)));
  } else if (typeof frontmatterTags === "string") {
    rawTags.add(frontmatterTags);
  }

  const noteRecord = createWorkflowNoteRecord({
    path: file.path,
    title: file.name.replace(/\.md$/i, ""),
    content,
    status:
      typeof cache?.frontmatter?.status === "string" ? String(cache.frontmatter.status) : undefined,
    tags: Array.from(rawTags.values()),
    linkedPaths: (cache?.links ?? []).map((link) => link.link),
  });
  const incompleteTasks = noteRecord.tasks.filter((task) => !task.completed);
  const headings = noteRecord.headings.map((heading) => heading.heading);
  const hints = [noteRecord.title, ...noteRecord.tags, ...headings.slice(0, 3)].filter(Boolean);
  const contentLength = content.trim().length;

  if (
    ["project", "analysis", "decision", "review", "outcome"].includes(noteRecord.artifactKind) ||
    incompleteTasks.length > 0
  ) {
    return {
      action: "move",
      rootType: "projects",
      confidence: incompleteTasks.length > 0 ? 0.92 : 0.88,
      reason:
        incompleteTasks.length > 0
          ? "Looks like active work with open tasks or follow-ups."
          : "Looks like a project-bound artifact rather than a passive reference.",
      hints,
    };
  }

  if (noteRecord.artifactKind === "area") {
    return {
      action: "move",
      rootType: "areas",
      confidence: 0.88,
      reason: "Looks like an ongoing responsibility or operating area.",
      hints,
    };
  }

  if (
    noteRecord.artifactKind === "resource" ||
    (contentLength > 600 && incompleteTasks.length === 0)
  ) {
    return {
      action: "move",
      rootType: "resources",
      confidence: noteRecord.artifactKind === "resource" ? 0.9 : 0.74,
      reason: "Looks like reference material rather than active work.",
      hints,
    };
  }

  return {
    action: "ambiguous",
    rootType: "resources",
    confidence: 0.5,
    reason:
      "Needs a user decision because the note structure does not clearly map to one PARA lane.",
    hints,
  };
}

/**
 * Determine whether a folder should be treated as one atomic unit.
 *
 * @param folder - Folder candidate.
 * @returns True when the folder contains project-marker files.
 */
function isAtomicProjectFolder(folder: TFolder): boolean {
  return folder.children.some(
    (child) => child instanceof TFile && PROJECT_MARKER_FILES.has(child.name.toLowerCase())
  );
}

/**
 * Create a proposal item with default shape.
 *
 * @param item - Source scanned item.
 * @param action - Proposed action.
 * @param rootType - Proposed destination root.
 * @param destinationPath - Proposed destination path.
 * @param reason - Human-readable reasoning.
 * @param confidence - Confidence score.
 * @param hints - Related path hints used for detail display.
 * @param duplicateGroupId - Optional duplicate group id.
 * @param deleteMode - Delete mode to use.
 * @returns Proposal item.
 */
function buildProposalItem(
  item: CleanupScannedItem,
  action: CleanupAction,
  rootType: CleanupDestinationFolder["rootType"] | null,
  destinationPath: string | undefined,
  reason: string,
  confidence: number,
  hints: string[],
  duplicateGroupId?: string,
  deleteMode: CleanupDeleteMode = action === "delete" ? "hard" : "trash"
): CleanupProposalItem {
  const ageDays = getAgeDays(item.ctime);
  const title = item.kind === "folder" ? item.name : item.name.replace(/\.[^.]+$/, "");

  return {
    id: item.id,
    sourcePath: item.path,
    sourceKind: item.kind,
    title,
    action,
    presentationGroup: toPresentationGroup(action, !!duplicateGroupId),
    destinationPath,
    deleteMode,
    reason,
    confidence,
    warnings: [],
    duplicateGroupId,
    needsUserDecision: action === "ambiguous" || confidence < 0.6,
    details: {
      ageDays,
      size: item.size,
      extension: item.extension,
      relatedPaths: rootType ? [rootType, ...hints] : hints,
    },
  };
}

/**
 * Classify scanned inbox items into a grouped cleanup proposal.
 *
 * @param scanResult - Raw scan results for inbox, assets, and destinations.
 * @param contentByPath - Markdown content lookup keyed by path.
 * @param folderConfig - Effective cleanup folder configuration.
 * @param learnedRules - Learned rules from settings.
 * @returns Cleanup proposal ready for modal review.
 */
export async function classifyCleanupProposal(
  scanResult: CleanupScanResult,
  contentByPath: Record<string, string>,
  folderConfig: CleanupFolderConfig,
  learnedRules: CleanupLearnedRule[]
): Promise<CleanupProposal> {
  const duplicateGroups = detectDuplicateGroups(
    scanResult.inboxItems.filter(
      (item): item is CleanupScannedFile => item.kind === "file" && item.file instanceof TFile
    ),
    contentByPath
  );
  const duplicateItemToGroup = new Map<string, CleanupDuplicateGroup>();
  duplicateGroups.forEach((group) => {
    group.duplicateItemIds.forEach((itemId) => {
      duplicateItemToGroup.set(itemId, group);
    });
  });

  const clusters = buildClusters(scanResult.inboxItems);
  const clusterByItemId = new Map<string, CleanupCluster>();
  clusters.forEach((cluster) => {
    cluster.itemIds.forEach((itemId) => clusterByItemId.set(itemId, cluster));
  });

  const proposalItems: CleanupProposalItem[] = [];
  const newFolders = new Set<string>();
  const claimedFolderPrefixes = new Set<string>();

  for (const item of scanResult.inboxItems) {
    if (
      Array.from(claimedFolderPrefixes.values()).some((prefix) =>
        item.path.startsWith(`${prefix}/`)
      )
    ) {
      continue;
    }

    const duplicateGroup = duplicateItemToGroup.get(item.id);
    const cluster = clusterByItemId.get(item.id);

    if (
      item.kind === "folder" &&
      item.file instanceof TFolder &&
      isAtomicProjectFolder(item.file)
    ) {
      const destinationPath = normalizePath(
        `${folderConfig.projects}/${sanitizeFolderName(item.name)}`
      );
      claimedFolderPrefixes.add(item.path);
      if (!scanResult.destinationFolders.some((folder) => folder.path === destinationPath)) {
        newFolders.add(destinationPath);
      }
      const proposal = buildProposalItem(
        item,
        "move",
        "projects",
        destinationPath,
        "Folder contains project markers and should be treated as one project unit.",
        0.92,
        [item.name]
      );
      if (cluster) {
        proposal.clusterId = cluster.id;
      }
      proposalItems.push(proposal);
      continue;
    }

    if (duplicateGroup) {
      const proposal = buildProposalItem(
        item,
        duplicateGroup.exact ? "delete" : "trash",
        null,
        undefined,
        `${duplicateGroup.reason} Keep ${duplicateGroup.keepPath}.`,
        duplicateGroup.exact ? 1 : 0.9,
        [duplicateGroup.keepPath],
        duplicateGroup.id,
        duplicateGroup.exact ? "hard" : "trash"
      );
      if (cluster) {
        proposal.clusterId = cluster.id;
      }
      proposalItems.push(proposal);
      continue;
    }

    if (item.kind === "file" && item.size === 0) {
      const proposal = buildProposalItem(
        item,
        "delete",
        null,
        undefined,
        "Empty file with no durable value.",
        1,
        [],
        undefined,
        "hard"
      );
      if (cluster) {
        proposal.clusterId = cluster.id;
      }
      proposalItems.push(proposal);
      continue;
    }

    const ageDays = getAgeDays(item.ctime);
    const untouchedForLongTime = ageDays > 90 && Math.abs(item.mtime - item.ctime) < 60_000;
    const matchedRule = matchLearnedRule(item, learnedRules);

    if (matchedRule) {
      const rootType =
        matchedRule.action === "move" &&
        matchedRule.destinationPath?.startsWith(folderConfig.projects)
          ? "projects"
          : matchedRule.action === "move" &&
              matchedRule.destinationPath?.startsWith(folderConfig.areas)
            ? "areas"
            : matchedRule.action === "move" &&
                matchedRule.destinationPath?.startsWith(folderConfig.resources)
              ? "resources"
              : "archive";
      const proposal = buildProposalItem(
        item,
        matchedRule.action,
        rootType,
        matchedRule.destinationPath ||
          chooseDestinationPath(scanResult.destinationFolders, rootType, [item.name]),
        "Matched a learned cleanup rule from settings.",
        0.95,
        [matchedRule.pattern]
      );
      proposal.matchedRuleId = matchedRule.id;
      if (matchedRule.neverHardDelete) {
        proposal.deleteMode = "trash";
      }
      if (cluster) {
        proposal.clusterId = cluster.id;
      }
      proposalItems.push(proposal);
      continue;
    }

    if (item.kind === "file" && item.file instanceof TFile) {
      const fileItem = item as CleanupScannedFile;

      if (item.extension === "md") {
        const markdownClassification = classifyMarkdownContent(
          fileItem,
          contentByPath[item.path] ?? ""
        );
        const destinationPath =
          markdownClassification.action === "ambiguous"
            ? ""
            : chooseDestinationPath(
                scanResult.destinationFolders,
                markdownClassification.rootType,
                markdownClassification.hints
              );
        const proposal = buildProposalItem(
          item,
          markdownClassification.action,
          markdownClassification.rootType,
          destinationPath || undefined,
          untouchedForLongTime && markdownClassification.action === "ambiguous"
            ? "Old untouched note with weak routing signal. Lean archive unless you still need it."
            : markdownClassification.reason,
          untouchedForLongTime && markdownClassification.action === "ambiguous"
            ? 0.58
            : markdownClassification.confidence,
          markdownClassification.hints
        );
        if (untouchedForLongTime && markdownClassification.action === "ambiguous") {
          proposal.action = "archive";
          proposal.presentationGroup = "archive";
          proposal.destinationPath = chooseDestinationPath(
            scanResult.destinationFolders,
            "archive",
            [item.name]
          );
          proposal.needsUserDecision = false;
        }
        if (cluster) {
          proposal.clusterId = cluster.id;
        }
        proposalItems.push(proposal);
        continue;
      }

      if (item.extension === "html" || item.extension === "htm") {
        const rawHtml = await app.vault.adapter.read(item.path);
        const isWebClip =
          /<article/i.test(rawHtml) ||
          /<meta[^>]+property=["']og:/i.test(rawHtml) ||
          /<meta[^>]+name=["']description/i.test(rawHtml);
        const destinationPath = isWebClip
          ? chooseDestinationPath(scanResult.destinationFolders, "archive", ["web clippings"])
          : chooseDestinationPath(scanResult.destinationFolders, "resources", [item.name]);
        const proposal = buildProposalItem(
          item,
          isWebClip ? "archive" : "move",
          isWebClip ? "archive" : "resources",
          destinationPath || undefined,
          isWebClip
            ? "Looks like a web clipping or saved article page."
            : "Looks like saved reference material.",
          isWebClip ? 0.9 : 0.7,
          [item.name]
        );
        if (cluster) {
          proposal.clusterId = cluster.id;
        }
        proposalItems.push(proposal);
        continue;
      }

      if (item.extension === "pdf") {
        const preview = await readConvertedPdfPreview(fileItem);
        if (preview.trim()) {
          const syntheticMarkdownClassification = classifyMarkdownContent(fileItem, preview);
          const destinationPath = chooseDestinationPath(
            scanResult.destinationFolders,
            syntheticMarkdownClassification.rootType,
            syntheticMarkdownClassification.hints
          );
          const proposal = buildProposalItem(
            item,
            syntheticMarkdownClassification.action === "ambiguous"
              ? untouchedForLongTime
                ? "archive"
                : "ambiguous"
              : syntheticMarkdownClassification.action,
            syntheticMarkdownClassification.rootType,
            destinationPath || undefined,
            syntheticMarkdownClassification.action === "ambiguous"
              ? "PDF has only a weak topic signal. Review before moving."
              : "Classified using previously converted PDF text preview.",
            syntheticMarkdownClassification.action === "ambiguous" ? 0.56 : 0.74,
            syntheticMarkdownClassification.hints
          );
          if (cluster) {
            proposal.clusterId = cluster.id;
          }
          proposalItems.push(proposal);
          continue;
        }

        const proposal = buildProposalItem(
          item,
          untouchedForLongTime ? "archive" : "ambiguous",
          untouchedForLongTime ? "archive" : "resources",
          untouchedForLongTime
            ? chooseDestinationPath(scanResult.destinationFolders, "archive", [item.name])
            : undefined,
          untouchedForLongTime
            ? "Older untouched PDF with no stronger topic signal. Lean archive."
            : "PDF needs either a known topic or a converted markdown preview before routing confidently.",
          untouchedForLongTime ? 0.64 : 0.45,
          [item.name]
        );
        proposal.warnings.push("No converted markdown preview was found for this PDF.");
        if (cluster) {
          proposal.clusterId = cluster.id;
        }
        proposalItems.push(proposal);
        continue;
      }

      if (AUDIO_EXTENSIONS.has(item.extension)) {
        const proposal = buildProposalItem(
          item,
          "ambiguous",
          "areas",
          undefined,
          "Audio files need sender or transcript context before KOS2 can route them safely.",
          0.35,
          [item.name]
        );
        proposal.warnings.push("Consider transcribing first before deciding a destination.");
        if (cluster) {
          proposal.clusterId = cluster.id;
        }
        proposalItems.push(proposal);
        continue;
      }
    }

    const fallbackAction: CleanupAction = untouchedForLongTime ? "archive" : "ambiguous";
    const fallbackProposal = buildProposalItem(
      item,
      fallbackAction,
      untouchedForLongTime ? "archive" : "resources",
      untouchedForLongTime
        ? chooseDestinationPath(scanResult.destinationFolders, "archive", [item.name])
        : undefined,
      untouchedForLongTime
        ? "Older untouched item with no strong routing signal."
        : "Needs a user decision because the file type is not strongly classified yet.",
      untouchedForLongTime ? 0.62 : 0.4,
      [item.name]
    );
    if (cluster) {
      fallbackProposal.clusterId = cluster.id;
    }
    proposalItems.push(fallbackProposal);
  }

  const availableDestinations = Array.from(
    new Set(
      [
        folderConfig.projects,
        folderConfig.areas,
        folderConfig.resources,
        folderConfig.archive,
        folderConfig.trash,
        ...scanResult.destinationFolders.map((folder) => folder.path),
      ].map((path) => normalizePath(path))
    )
  ).sort((left, right) => left.localeCompare(right));

  return {
    createdAt: new Date().toISOString(),
    scannedItemCount: scanResult.inboxItems.length,
    scannedFileCount: scanResult.inboxItems.filter((item) => item.kind === "file").length,
    scannedFolderCount: scanResult.inboxItems.filter((item) => item.kind === "folder").length,
    assetCount: scanResult.assetItems.length,
    items: proposalItems.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)),
    duplicateGroups,
    clusters,
    newFolders: Array.from(newFolders.values()).sort((left, right) => left.localeCompare(right)),
    availableDestinations,
  };
}
