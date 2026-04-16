import { TAbstractFile, TFile, TFolder } from "obsidian";

/**
 * Cleanup folder configuration used by the inbox cleanup workflow.
 */
export interface CleanupFolderConfig {
  inbox: string;
  projects: string;
  areas: string;
  resources: string;
  archive: string;
  trash: string;
}

/**
 * Supported cleanup action types.
 */
export type CleanupAction = "move" | "archive" | "trash" | "delete" | "ambiguous";

/**
 * Presentation groups used by the proposal modal.
 */
export type CleanupProposalGroup =
  | "move"
  | "archive"
  | "trash"
  | "delete"
  | "duplicates"
  | "ambiguous";

/**
 * Execution mode for removal actions.
 */
export type CleanupDeleteMode = "trash" | "hard";

/**
 * Supported matcher types for learned cleanup rules.
 */
export type CleanupRuleMatcherType = "filename" | "path" | "extension";

/**
 * Matching semantics for learned cleanup rules.
 */
export type CleanupRuleMatchMode = "contains" | "prefix" | "suffix" | "equals" | "regex";

/**
 * Recurrent cleanup rule stored in plugin settings.
 */
export interface CleanupLearnedRule {
  id: string;
  matcherType: CleanupRuleMatcherType;
  matchMode: CleanupRuleMatchMode;
  pattern: string;
  action: Exclude<CleanupAction, "delete" | "ambiguous">;
  destinationPath?: string;
  neverHardDelete?: boolean;
  notes?: string;
}

/**
 * Normalized scanned item kind.
 */
export type CleanupScannedItemKind = "file" | "folder";

/**
 * Normalized scanned item in the inbox or destination tree.
 */
export interface CleanupScannedItem {
  id: string;
  kind: CleanupScannedItemKind;
  path: string;
  name: string;
  extension: string;
  ctime: number;
  mtime: number;
  size: number;
  depth: number;
  parentPath: string;
  file: TAbstractFile;
}

/**
 * Destination folder discovered during depth-limited PARA scan.
 */
export interface CleanupDestinationFolder {
  id: string;
  rootType: "projects" | "areas" | "resources" | "archive";
  path: string;
  name: string;
  depth: number;
  folder: TFolder;
}

/**
 * Asset reference extracted from a markdown note.
 */
export interface CleanupAssetReference {
  rawReference: string;
  resolvedPath: string;
}

/**
 * Indexed asset usage for a single inbox asset.
 */
export interface CleanupAssetOwnership {
  assetPath: string;
  referencedBy: string[];
}

/**
 * Group of likely duplicate items.
 */
export interface CleanupDuplicateGroup {
  id: string;
  keepItemId: string;
  keepPath: string;
  duplicateItemIds: string[];
  duplicatePaths: string[];
  exact: boolean;
  reason: string;
}

/**
 * Same-day cluster used for grouped proposal hints.
 */
export interface CleanupCluster {
  id: string;
  label: string;
  itemIds: string[];
}

/**
 * Proposal item shown in the cleanup modal.
 */
export interface CleanupProposalItem {
  id: string;
  sourcePath: string;
  sourceKind: CleanupScannedItemKind;
  title: string;
  action: CleanupAction;
  presentationGroup: CleanupProposalGroup;
  destinationPath?: string;
  deleteMode: CleanupDeleteMode;
  reason: string;
  confidence: number;
  warnings: string[];
  duplicateGroupId?: string;
  clusterId?: string;
  needsUserDecision?: boolean;
  newFolderPath?: string;
  matchedRuleId?: string;
  details: {
    ageDays: number;
    size: number;
    extension: string;
    relatedPaths: string[];
  };
}

/**
 * Aggregated cleanup proposal.
 */
export interface CleanupProposal {
  createdAt: string;
  scannedItemCount: number;
  scannedFileCount: number;
  scannedFolderCount: number;
  assetCount: number;
  items: CleanupProposalItem[];
  duplicateGroups: CleanupDuplicateGroup[];
  clusters: CleanupCluster[];
  newFolders: string[];
  availableDestinations: string[];
}

/**
 * User decision returned by the cleanup proposal modal.
 */
export interface CleanupProposalDecision {
  outcome: "approve" | "dry-run" | "cancel";
  skippedItemIds: string[];
  destinationOverrides: Record<string, string>;
  deleteModeOverrides: Record<string, CleanupDeleteMode>;
}

/**
 * Planned move for an inbox asset.
 */
export interface CleanupAssetMove {
  sourcePath: string;
  destinationPath: string;
  referencedBy: string[];
}

/**
 * Final execution item after UI overrides are applied.
 */
export interface CleanupExecutionItem {
  proposalItemId: string;
  sourcePath: string;
  sourceKind: CleanupScannedItemKind;
  action: CleanupAction;
  destinationPath?: string;
  deleteMode: CleanupDeleteMode;
  reason: string;
  confidence: number;
}

/**
 * Mutation result for a single cleanup action.
 */
export interface CleanupExecutedAction {
  kind: "move" | "archive" | "trash" | "delete" | "skip" | "warning";
  sourcePath: string;
  destinationPath?: string;
  reason: string;
}

/**
 * Result of the cleanup execution phase.
 */
export interface CleanupExecutionResult {
  dryRun: boolean;
  moved: CleanupExecutedAction[];
  archived: CleanupExecutedAction[];
  trashed: CleanupExecutedAction[];
  deleted: CleanupExecutedAction[];
  skipped: CleanupExecutedAction[];
  warnings: string[];
  assetsMoved: CleanupAssetMove[];
  sharedAssetWarnings: string[];
  linkRepairWarnings: string[];
  logPath: string;
  moveMap: Record<string, string>;
}

/**
 * Summary of a markdown relative-link rewrite performed after moves.
 */
export interface CleanupLinkRewrite {
  filePath: string;
  from: string;
  to: string;
}

/**
 * Intermediate scan result used by classifier and executor.
 */
export interface CleanupScanResult {
  inboxItems: CleanupScannedItem[];
  assetItems: CleanupScannedItem[];
  destinationFolders: CleanupDestinationFolder[];
  assetOwnership: CleanupAssetOwnership[];
}

/**
 * Narrower helper type for scanned files.
 */
export type CleanupScannedFile = CleanupScannedItem & { kind: "file"; file: TFile };

/**
 * Narrower helper type for scanned folders.
 */
export type CleanupScannedFolder = CleanupScannedItem & { kind: "folder"; file: TFolder };
