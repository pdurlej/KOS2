import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  CleanupDeleteMode,
  CleanupProposal,
  CleanupProposalDecision,
  CleanupProposalGroup,
} from "@/kos/cleanup/types";
import { cn } from "@/lib/utils";
import { App, Modal } from "obsidian";
import React, { useMemo, useState } from "react";
import { createRoot, Root } from "react-dom/client";

const GROUP_LABELS: Record<CleanupProposalGroup, string> = {
  move: "Move",
  archive: "Archive",
  trash: "Trash",
  delete: "Delete (hard)",
  duplicates: "Duplicates",
  ambiguous: "Ambiguous",
};

interface CleanupProposalContentProps {
  proposal: CleanupProposal;
  onResolve: (decision: CleanupProposalDecision) => void;
}

/**
 * Render the interactive cleanup proposal review surface.
 *
 * @param proposal - Cleanup proposal to render.
 * @param onResolve - Callback fired when the modal is approved, dry-run, or cancelled.
 * @returns Proposal content JSX.
 */
function CleanupProposalContent({
  proposal,
  onResolve,
}: CleanupProposalContentProps): React.ReactElement {
  const [filterGroup, setFilterGroup] = useState<CleanupProposalGroup | "all">("all");
  const [showDetails, setShowDetails] = useState(false);
  const [skippedItemIds, setSkippedItemIds] = useState<string[]>([]);
  const [destinationOverrides, setDestinationOverrides] = useState<Record<string, string>>({});
  const [deleteModeOverrides, setDeleteModeOverrides] = useState<Record<string, CleanupDeleteMode>>(
    {}
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<CleanupProposalGroup, typeof proposal.items>();
    proposal.items.forEach((item) => {
      if (filterGroup !== "all" && item.presentationGroup !== filterGroup) {
        return;
      }
      const existing = groups.get(item.presentationGroup) ?? [];
      existing.push(item);
      groups.set(item.presentationGroup, existing);
    });
    return groups;
  }, [filterGroup, proposal]);

  /**
   * Toggle whether an item is skipped from execution.
   *
   * @param itemId - Proposal item id.
   * @param checked - Checkbox state.
   */
  const toggleSkipped = (itemId: string, checked: boolean): void => {
    setSkippedItemIds((current) =>
      checked ? current.filter((value) => value !== itemId) : [...current, itemId]
    );
  };

  /**
   * Toggle skip state for all items in a presentation group.
   *
   * @param group - Group to mutate.
   */
  const toggleGroupSkipped = (group: CleanupProposalGroup): void => {
    const itemIds = (groupedItems.get(group) ?? []).map((item) => item.id);
    const everySkipped = itemIds.every((itemId) => skippedItemIds.includes(itemId));

    setSkippedItemIds((current) => {
      if (everySkipped) {
        return current.filter((itemId) => !itemIds.includes(itemId));
      }
      return Array.from(new Set([...current, ...itemIds]));
    });
  };

  /**
   * Resolve the current modal state into a cleanup decision payload.
   *
   * @param outcome - Decision outcome to emit.
   */
  const resolve = (outcome: CleanupProposalDecision["outcome"]): void => {
    onResolve({
      outcome,
      skippedItemIds,
      destinationOverrides,
      deleteModeOverrides,
    });
  };

  return (
    <div className="tw-flex tw-max-h-[78vh] tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <Badge variant="outline">Scanned: {proposal.scannedItemCount}</Badge>
          <Badge variant="outline">Files: {proposal.scannedFileCount}</Badge>
          <Badge variant="outline">Folders: {proposal.scannedFolderCount}</Badge>
          <Badge variant="outline">Assets: {proposal.assetCount}</Badge>
        </div>
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <select
            value={filterGroup}
            onChange={(event) => setFilterGroup(event.target.value as CleanupProposalGroup | "all")}
            className="tw-flex tw-h-9 tw-rounded-md tw-border tw-border-border tw-bg-dropdown tw-px-3 tw-text-sm"
          >
            <option value="all">All groups</option>
            {Object.entries(GROUP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-muted">
            <Checkbox
              checked={showDetails}
              onCheckedChange={(checked) => setShowDetails(Boolean(checked))}
            />
            Show details
          </label>
        </div>
      </div>

      {proposal.newFolders.length > 0 && (
        <div className="tw-rounded-lg tw-border tw-border-border tw-p-3 tw-bg-secondary/20">
          <div className="tw-text-sm tw-font-semibold tw-text-normal">New folders proposed</div>
          <ul className="tw-mt-2 tw-space-y-1 tw-text-sm tw-text-muted">
            {proposal.newFolders.map((folderPath) => (
              <li key={folderPath}>{folderPath}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="tw-flex-1 tw-space-y-4 tw-overflow-y-auto tw-pr-1">
        {Array.from(groupedItems.entries()).map(([group, items]) => {
          const groupSkipped = items.every((item) => skippedItemIds.includes(item.id));

          return (
            <section key={group} className="tw-space-y-3">
              <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
                <div className="tw-flex tw-items-center tw-gap-2">
                  <div className="tw-text-lg tw-font-semibold tw-text-normal">
                    {GROUP_LABELS[group]}
                  </div>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <Button variant="secondary" onClick={() => toggleGroupSkipped(group)}>
                  {groupSkipped ? "Unskip section" : "Skip section"}
                </Button>
              </div>

              <div className="tw-space-y-3">
                {items.map((item) => {
                  const skipped = skippedItemIds.includes(item.id);
                  const currentDestination =
                    destinationOverrides[item.id] ?? item.destinationPath ?? "";
                  const currentDeleteMode = deleteModeOverrides[item.id] ?? item.deleteMode;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "tw-rounded-xl tw-border tw-border-border tw-p-4 tw-bg-secondary/20",
                        skipped && "tw-opacity-50"
                      )}
                    >
                      <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
                        <div className="tw-flex tw-flex-col tw-gap-1">
                          <div className="tw-text-base tw-font-semibold tw-text-normal">
                            {item.title}
                          </div>
                          <div className="tw-break-all tw-text-xs tw-text-muted">
                            {item.sourcePath}
                          </div>
                        </div>
                        <label className="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-muted">
                          <Checkbox
                            checked={!skipped}
                            onCheckedChange={(checked) => toggleSkipped(item.id, Boolean(checked))}
                          />
                          Run
                        </label>
                      </div>

                      <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
                        <Badge variant="outline">{Math.round(item.confidence * 100)}%</Badge>
                        {item.clusterId && <Badge variant="outline">Clustered import</Badge>}
                        {item.duplicateGroupId && <Badge variant="outline">Duplicate group</Badge>}
                        {item.needsUserDecision && (
                          <Badge variant="outline" className="tw-text-warning">
                            Needs review
                          </Badge>
                        )}
                      </div>

                      <p className="tw-mt-3 tw-text-sm tw-leading-relaxed tw-text-muted">
                        {item.reason}
                      </p>

                      {(item.action === "move" ||
                        item.action === "archive" ||
                        item.action === "trash" ||
                        item.action === "ambiguous") && (
                        <div className="tw-mt-3 tw-space-y-2">
                          <div className="tw-text-xs tw-font-medium tw-text-muted">Destination</div>
                          <Input
                            list={`cleanup-destinations-${item.id}`}
                            value={currentDestination}
                            onChange={(event) =>
                              setDestinationOverrides((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder={
                              item.action === "ambiguous"
                                ? "Set a destination to route this item"
                                : "Destination folder or final path"
                            }
                          />
                          <datalist id={`cleanup-destinations-${item.id}`}>
                            {proposal.availableDestinations.map((destination) => (
                              <option key={destination} value={destination} />
                            ))}
                          </datalist>
                        </div>
                      )}

                      {(item.action === "trash" ||
                        item.action === "delete" ||
                        item.duplicateGroupId) && (
                        <div className="tw-mt-3 tw-space-y-2">
                          <div className="tw-text-xs tw-font-medium tw-text-muted">Delete mode</div>
                          <select
                            value={currentDeleteMode}
                            onChange={(event) =>
                              setDeleteModeOverrides((current) => ({
                                ...current,
                                [item.id]: event.target.value as CleanupDeleteMode,
                              }))
                            }
                            className="tw-flex tw-h-9 tw-w-full tw-rounded-md tw-border tw-border-border tw-bg-dropdown tw-px-3 tw-text-sm"
                          >
                            <option value="trash">Staged trash</option>
                            <option value="hard">Hard delete</option>
                          </select>
                        </div>
                      )}

                      {(showDetails || item.warnings.length > 0) && (
                        <div className="tw-mt-3 tw-space-y-2 tw-rounded-lg tw-border tw-p-3 tw-bg-secondary/10 tw-border-border/70">
                          <div className="tw-grid tw-gap-2 md:tw-grid-cols-3">
                            <div className="tw-text-xs tw-text-muted">
                              Age: <span className="tw-text-normal">{item.details.ageDays}d</span>
                            </div>
                            <div className="tw-text-xs tw-text-muted">
                              Size:{" "}
                              <span className="tw-text-normal">{item.details.size} bytes</span>
                            </div>
                            <div className="tw-text-xs tw-text-muted">
                              Extension:{" "}
                              <span className="tw-text-normal">
                                {item.details.extension || "folder"}
                              </span>
                            </div>
                          </div>
                          {item.details.relatedPaths.length > 0 && (
                            <div className="tw-text-xs tw-text-muted">
                              Signals: {item.details.relatedPaths.join(" • ")}
                            </div>
                          )}
                          {item.warnings.length > 0 && (
                            <ul className="tw-list-disc tw-space-y-1 tw-pl-5 tw-text-xs tw-text-warning">
                              {item.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="tw-flex tw-justify-end tw-gap-2">
        <Button variant="ghost" onClick={() => resolve("cancel")}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => resolve("dry-run")}>
          Dry run
        </Button>
        <Button variant="default" onClick={() => resolve("approve")}>
          Approve
        </Button>
      </div>
    </div>
  );
}

/**
 * Modal used to review and approve inbox cleanup proposals before execution.
 */
export class KOSCleanupProposalModal extends Modal {
  private root: Root | null = null;
  private resolved = false;

  constructor(
    app: App,
    private readonly proposal: CleanupProposal,
    private readonly onResolve: (decision: CleanupProposalDecision) => void
  ) {
    super(app);
    // @ts-ignore Obsidian injects setTitle at runtime.
    this.setTitle("Cleanup Inbox Proposal");
  }

  /**
   * Mount the React proposal content when the modal opens.
   */
  onOpen(): void {
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(
      <CleanupProposalContent
        proposal={this.proposal}
        onResolve={(decision) => {
          this.resolved = true;
          this.onResolve(decision);
          this.close();
        }}
      />
    );
  }

  /**
   * Emit a cancel decision when the modal is dismissed without an explicit action.
   */
  onClose(): void {
    if (!this.resolved) {
      this.onResolve({
        outcome: "cancel",
        skippedItemIds: [],
        destinationOverrides: {},
        deleteModeOverrides: {},
      });
    }
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
