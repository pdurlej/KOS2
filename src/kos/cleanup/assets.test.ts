import { computeAssetOwnership, extractAssetReferences } from "@/kos/cleanup/assets";
import { CleanupScannedFile, CleanupScannedItem } from "@/kos/cleanup/types";

/**
 * Create a markdown scanned file fixture for asset tests.
 *
 * @param path - Note path.
 * @returns Scanned file fixture.
 */
function makeMarkdownNote(path: string): CleanupScannedFile {
  const name = path.split("/").pop() ?? path;
  return {
    id: path,
    kind: "file",
    path,
    name,
    extension: "md",
    ctime: 0,
    mtime: 0,
    size: 0,
    depth: 1,
    parentPath: path.split("/").slice(0, -1).join("/"),
    file: {
      path,
      name,
      basename: name.replace(/\.md$/, ""),
      extension: "md",
      stat: { ctime: 0, mtime: 0, size: 0 },
    } as CleanupScannedFile["file"],
  };
}

/**
 * Create an inbox asset fixture.
 *
 * @param path - Asset path.
 * @returns Scanned item fixture.
 */
function makeAsset(path: string): CleanupScannedItem {
  const name = path.split("/").pop() ?? path;
  return {
    id: path,
    kind: "file",
    path,
    name,
    extension: name.split(".").pop() ?? "",
    ctime: 0,
    mtime: 0,
    size: 10,
    depth: 1,
    parentPath: path.split("/").slice(0, -1).join("/"),
    file: {
      path,
      name,
      basename: name.replace(/\.[^.]+$/, ""),
      extension: name.split(".").pop() ?? "",
      stat: { ctime: 0, mtime: 0, size: 10 },
    } as unknown as CleanupScannedItem["file"],
  };
}

describe("cleanup asset helpers", () => {
  it("extracts markdown image references that point into inbox assets", () => {
    const note = makeMarkdownNote("01 Inbox/Idea.md");
    const assets = [makeAsset("01 Inbox/Assets/diagram.png")];
    const references = extractAssetReferences(
      note,
      "Look ![](Assets/diagram.png) and ![[diagram.png]]",
      assets
    );

    expect(references).toEqual([
      {
        rawReference: "Assets/diagram.png",
        resolvedPath: "01 Inbox/Assets/diagram.png",
      },
    ]);
  });

  it("computes shared ownership across multiple markdown notes", () => {
    const assets = [makeAsset("01 Inbox/Assets/shared.png")];
    const notes = [makeMarkdownNote("01 Inbox/A.md"), makeMarkdownNote("01 Inbox/B.md")];
    const ownership = computeAssetOwnership(
      notes,
      {
        "01 Inbox/A.md": "![[shared.png]]",
        "01 Inbox/B.md": "![](Assets/shared.png)",
      },
      assets
    );

    expect(ownership).toEqual([
      {
        assetPath: "01 Inbox/Assets/shared.png",
        referencedBy: ["01 Inbox/A.md", "01 Inbox/B.md"],
      },
    ]);
  });
});
