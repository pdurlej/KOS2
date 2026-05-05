import { buildCleanupExecutionItems, executeCleanupProposal } from "@/kos/cleanup/execute";
import { CleanupFolderConfig, CleanupProposal, CleanupScanResult } from "@/kos/cleanup/types";
import { TAbstractFile, TFile, TFolder } from "obsidian";

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

  it("converts delete actions to staged trash when delete mode is trash", () => {
    const deleteProposal: CleanupProposal = {
      ...proposal,
      items: [
        {
          ...proposal.items[0],
          id: "c",
          action: "delete",
          presentationGroup: "delete",
          sourcePath: "01 Inbox/Delete.md",
          deleteMode: "hard",
        },
      ],
    };

    const items = buildCleanupExecutionItems(deleteProposal, {
      outcome: "approve",
      skippedItemIds: [],
      destinationOverrides: {},
      deleteModeOverrides: {
        c: "trash",
      },
    });

    expect(items[0]).toEqual(
      expect.objectContaining({
        action: "trash",
        deleteMode: "trash",
      })
    );
  });
});

const folderConfig: CleanupFolderConfig = {
  inbox: "01 Inbox",
  projects: "10 Projects",
  areas: "20 Areas",
  resources: "30 Resources",
  archive: "40 Archive",
  trash: "40 Archive/_trash",
};

const emptyScanResult: CleanupScanResult = {
  inboxItems: [],
  assetItems: [],
  destinationFolders: [],
  assetOwnership: [],
};

/**
 * Create an Obsidian TFile mock with the minimum fields cleanup execution uses.
 *
 * @param path - Vault path for the file.
 * @returns Mock TFile instance.
 */
function makeFile(path: string): TFile {
  const file = new (TFile as unknown as new (path: string) => TFile)(path);
  file.stat = { ctime: 0, mtime: 0, size: 10 };
  return file;
}

/**
 * Create an Obsidian TFolder mock with children.
 *
 * @param path - Vault path for the folder.
 * @param children - Folder children.
 * @returns Mock TFolder instance.
 */
function makeFolder(path: string, children: TAbstractFile[] = []): TFolder {
  const folder = new (TFolder as unknown as new (path: string) => TFolder)(path);
  folder.children = children;
  return folder;
}

/**
 * Install a minimal global Obsidian app fixture for cleanup execution tests.
 *
 * @param initialFiles - Initial vault file map.
 * @returns Mutable file map and mocked vault methods.
 */
function installCleanupApp(initialFiles: Record<string, TAbstractFile>): {
  files: Map<string, TAbstractFile>;
  rename: jest.Mock;
  deleteFile: jest.Mock;
} {
  const files = new Map<string, TAbstractFile>(Object.entries(initialFiles));
  const rename = jest.fn(async (source: TAbstractFile, destinationPath: string) => {
    files.delete(source.path);
    source.path = destinationPath;
    source.name = destinationPath.split("/").pop() ?? destinationPath;
    files.set(destinationPath, source);
  });
  const deleteFile = jest.fn(async (source: TAbstractFile) => {
    files.delete(source.path);
  });

  (global as { app: unknown }).app = {
    vault: {
      getAbstractFileByPath: jest.fn((path: string) => files.get(path) ?? null),
      getMarkdownFiles: jest.fn(() => []),
      cachedRead: jest.fn(async () => ""),
      modify: jest.fn(async () => undefined),
      rename,
      delete: deleteFile,
      create: jest.fn(async (path: string) => {
        const file = makeFile(path);
        files.set(path, file);
        return file;
      }),
      adapter: {
        exists: jest.fn(async (path: string) => files.has(path)),
        mkdir: jest.fn(async (path: string) => {
          files.set(path, makeFolder(path));
        }),
      },
    },
  };

  return { files, rename, deleteFile };
}

describe("executeCleanupProposal", () => {
  it("stages delete items in trash when user flips delete mode to trash", async () => {
    const source = makeFile("01 Inbox/Delete.md");
    const inbox = makeFolder("01 Inbox", [source]);
    const { rename, deleteFile } = installCleanupApp({
      "01 Inbox": inbox,
      "01 Inbox/Delete.md": source,
      "40 Archive": makeFolder("40 Archive"),
    });
    const deleteProposal: CleanupProposal = {
      ...proposal,
      scannedItemCount: 1,
      scannedFileCount: 1,
      items: [
        {
          ...proposal.items[0],
          id: "delete-me",
          sourcePath: "01 Inbox/Delete.md",
          title: "Delete",
          action: "delete",
          presentationGroup: "delete",
          deleteMode: "hard",
        },
      ],
    };

    const result = await executeCleanupProposal(
      deleteProposal,
      {
        outcome: "approve",
        skippedItemIds: [],
        destinationOverrides: {},
        deleteModeOverrides: {
          "delete-me": "trash",
        },
      },
      emptyScanResult,
      folderConfig
    );

    expect(rename).toHaveBeenCalledWith(
      source,
      expect.stringMatching(/^40 Archive\/_trash\/\d{4}-\d{2}-\d{2}\/Delete\.md$/)
    );
    expect(deleteFile).not.toHaveBeenCalledWith(source, true);
    expect(result.trashed).toHaveLength(1);
    expect(result.deleted).toHaveLength(0);
  });

  it("does not delete the configured inbox root during empty folder cleanup", async () => {
    const inbox = makeFolder("01 Inbox");
    const { deleteFile } = installCleanupApp({
      "01 Inbox": inbox,
    });
    const emptyProposal: CleanupProposal = {
      ...proposal,
      scannedItemCount: 0,
      scannedFileCount: 0,
      items: [],
    };

    await executeCleanupProposal(
      emptyProposal,
      {
        outcome: "approve",
        skippedItemIds: [],
        destinationOverrides: {},
        deleteModeOverrides: {},
      },
      emptyScanResult,
      folderConfig
    );

    expect(deleteFile).not.toHaveBeenCalledWith(inbox, true);
  });
});
