import { buildCleanupExecutionItems } from "@/kos/cleanup/execute";
import { CleanupProposal } from "@/kos/cleanup/types";

const proposal: CleanupProposal = {
  createdAt: "2026-04-16T00:00:00.000Z",
  scannedItemCount: 2,
  scannedFileCount: 2,
  scannedFolderCount: 0,
  assetCount: 0,
  duplicateGroups: [],
  clusters: [],
  newFolders: [],
  availableDestinations: ["30 Resources", "40 Archive"],
  items: [
    {
      id: "a",
      sourcePath: "01 Inbox/Alpha.md",
      sourceKind: "file",
      title: "Alpha",
      action: "move",
      presentationGroup: "move",
      destinationPath: "30 Resources",
      deleteMode: "trash",
      reason: "Reference material.",
      confidence: 0.8,
      warnings: [],
      details: {
        ageDays: 1,
        size: 10,
        extension: "md",
        relatedPaths: [],
      },
    },
    {
      id: "b",
      sourcePath: "01 Inbox/Beta.md",
      sourceKind: "file",
      title: "Beta",
      action: "ambiguous",
      presentationGroup: "ambiguous",
      deleteMode: "trash",
      reason: "Needs routing.",
      confidence: 0.4,
      warnings: [],
      needsUserDecision: true,
      details: {
        ageDays: 1,
        size: 10,
        extension: "md",
        relatedPaths: [],
      },
    },
  ],
};

describe("buildCleanupExecutionItems", () => {
  it("applies skip state and destination overrides", () => {
    const items = buildCleanupExecutionItems(proposal, {
      outcome: "approve",
      skippedItemIds: ["a"],
      destinationOverrides: {
        b: "40 Archive",
      },
      deleteModeOverrides: {},
    });

    expect(items).toEqual([
      expect.objectContaining({
        proposalItemId: "b",
        action: "move",
        destinationPath: "40 Archive",
      }),
    ]);
  });

  it("applies delete mode overrides", () => {
    const deleteProposal: CleanupProposal = {
      ...proposal,
      items: [
        {
          ...proposal.items[0],
          id: "c",
          action: "trash",
          presentationGroup: "trash",
          sourcePath: "01 Inbox/Delete.md",
        },
      ],
    };

    const items = buildCleanupExecutionItems(deleteProposal, {
      outcome: "approve",
      skippedItemIds: [],
      destinationOverrides: {},
      deleteModeOverrides: {
        c: "hard",
      },
    });

    expect(items[0].deleteMode).toBe("hard");
  });
});
