import { detectDuplicateGroups } from "@/kos/cleanup/duplicates";
import { CleanupScannedFile } from "@/kos/cleanup/types";

/**
 * Create a scanned file fixture for cleanup duplicate tests.
 *
 * @param path - File path.
 * @param size - File size.
 * @param mtime - Modification timestamp.
 * @returns Cleanup scanned file fixture.
 */
function makeFile(path: string, size: number, mtime: number): CleanupScannedFile {
  const name = path.split("/").pop() ?? path;
  const extension = name.split(".").pop() ?? "";
  return {
    id: path,
    kind: "file",
    path,
    name,
    extension,
    ctime: mtime,
    mtime,
    size,
    depth: 1,
    parentPath: path.split("/").slice(0, -1).join("/"),
    file: {
      path,
      name,
      basename: name.replace(/\.[^.]+$/, ""),
      extension,
      stat: { ctime: mtime, mtime, size },
    } as CleanupScannedFile["file"],
  };
}

describe("detectDuplicateGroups", () => {
  it("groups suffix-based markdown duplicates and keeps the newest file", () => {
    const files = [
      makeFile("01 Inbox/Note.md", 120, 10),
      makeFile("01 Inbox/Note -2.md", 118, 20),
      makeFile("01 Inbox/Note (1).md", 119, 30),
    ];

    const groups = detectDuplicateGroups(files, {
      "01 Inbox/Note.md": "same\ncontent",
      "01 Inbox/Note -2.md": "same\ncontent",
      "01 Inbox/Note (1).md": "same\ncontent",
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].keepPath).toBe("01 Inbox/Note (1).md");
    expect(groups[0].duplicatePaths).toEqual(["01 Inbox/Note -2.md", "01 Inbox/Note.md"]);
    expect(groups[0].exact).toBe(true);
  });

  it("treats low-overlap markdown copies as near-duplicates instead of exact duplicates", () => {
    const files = [
      makeFile("01 Inbox/Report.md", 200, 10),
      makeFile("01 Inbox/Report copy.md", 210, 20),
    ];

    const groups = detectDuplicateGroups(files, {
      "01 Inbox/Report.md": "alpha\nbeta\ngamma",
      "01 Inbox/Report copy.md": "alpha\nother\ndifferent",
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].exact).toBe(false);
  });
});
