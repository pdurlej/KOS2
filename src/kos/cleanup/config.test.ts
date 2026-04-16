import { DEFAULT_CLEANUP_FOLDER_CONFIG, normalizeCleanupFolderConfig } from "@/kos/cleanup/config";

describe("normalizeCleanupFolderConfig", () => {
  it("fills missing values from KOS defaults", () => {
    expect(normalizeCleanupFolderConfig()).toEqual(DEFAULT_CLEANUP_FOLDER_CONFIG);
  });

  it("normalizes custom folder overrides", () => {
    expect(
      normalizeCleanupFolderConfig({
        inbox: "01 Inbox/",
        projects: "10 Projects//Work",
        trash: "40 Archive/_trash/",
      })
    ).toEqual({
      ...DEFAULT_CLEANUP_FOLDER_CONFIG,
      inbox: "01 Inbox",
      projects: "10 Projects/Work",
      trash: "40 Archive/_trash",
    });
  });
});
