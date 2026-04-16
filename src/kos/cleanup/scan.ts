import {
  CleanupFolderConfig,
  CleanupDestinationFolder,
  CleanupScannedItem,
} from "@/kos/cleanup/types";
import { logWarn } from "@/logger";
import { normalizePath, TAbstractFile, TFile, TFolder, Vault } from "obsidian";

/**
 * Build a normalized scanned item from a vault abstract file.
 *
 * @param vault - Active Obsidian vault.
 * @param file - File or folder to normalize.
 * @param depth - Depth relative to the cleanup root.
 * @returns Normalized scanned item.
 */
async function createScannedItem(
  vault: Vault,
  file: TAbstractFile,
  depth: number
): Promise<CleanupScannedItem> {
  const stat =
    file instanceof TFile
      ? file.stat
      : ((await vault.adapter.stat(file.path)) ?? {
          ctime: Date.now(),
          mtime: Date.now(),
          size: 0,
        });
  const normalizedPath = normalizePath(file.path);
  const extension = file instanceof TFile ? file.extension.toLowerCase() : "";
  const name =
    file instanceof TFile
      ? file.name
      : (normalizedPath.split("/").filter(Boolean).pop() ?? normalizedPath);

  return {
    id: normalizedPath,
    kind: file instanceof TFolder ? "folder" : "file",
    path: normalizedPath,
    name,
    extension,
    ctime: stat.ctime,
    mtime: stat.mtime,
    size: stat.size,
    depth,
    parentPath: normalizePath(file.parent?.path ?? ""),
    file,
  };
}

/**
 * Recursively walk a folder and collect normalized items.
 *
 * @param vault - Active Obsidian vault.
 * @param folder - Folder to walk.
 * @param currentDepth - Current recursion depth.
 * @param skipPathPrefixes - Folder prefixes that should be excluded from the scan.
 * @returns Collected scanned items.
 */
async function walkFolder(
  vault: Vault,
  folder: TFolder,
  currentDepth: number,
  skipPathPrefixes: string[]
): Promise<CleanupScannedItem[]> {
  const results: CleanupScannedItem[] = [];

  for (const child of folder.children) {
    const childPath = normalizePath(child.path);
    if (
      skipPathPrefixes.some((prefix) => childPath === prefix || childPath.startsWith(`${prefix}/`))
    ) {
      continue;
    }

    results.push(await createScannedItem(vault, child, currentDepth));
    if (child instanceof TFolder) {
      results.push(...(await walkFolder(vault, child, currentDepth + 1, skipPathPrefixes)));
    }
  }

  return results;
}

/**
 * Resolve a required root folder from the vault.
 *
 * @param vault - Active Obsidian vault.
 * @param folderPath - Folder path to resolve.
 * @returns Resolved folder or null when missing.
 */
function resolveFolder(vault: Vault, folderPath: string): TFolder | null {
  const file = vault.getAbstractFileByPath(normalizePath(folderPath));
  return file instanceof TFolder ? file : null;
}

/**
 * Scan the inbox recursively while excluding the inbox assets subtree from primary items.
 *
 * @param vault - Active Obsidian vault.
 * @param config - Cleanup folder configuration.
 * @returns Scanned inbox items and inbox assets.
 */
export async function scanInboxItems(
  vault: Vault,
  config: CleanupFolderConfig
): Promise<{ inboxItems: CleanupScannedItem[]; assetItems: CleanupScannedItem[] }> {
  const inboxFolder = resolveFolder(vault, config.inbox);
  const assetsFolder = resolveFolder(vault, `${config.inbox}/Assets`);

  if (!inboxFolder) {
    return {
      inboxItems: [],
      assetItems: [],
    };
  }

  const assetPrefix = assetsFolder ? [normalizePath(assetsFolder.path)] : [];
  const inboxItems = await walkFolder(vault, inboxFolder, 1, assetPrefix);
  const assetItems = assetsFolder ? await walkFolder(vault, assetsFolder, 1, []) : [];

  return {
    inboxItems,
    assetItems,
  };
}

/**
 * Scan destination folders up to two levels deep so cleanup can reuse existing PARA destinations.
 *
 * @param vault - Active Obsidian vault.
 * @param config - Cleanup folder configuration.
 * @returns Existing destination folders.
 */
export async function scanDestinationFolders(
  vault: Vault,
  config: CleanupFolderConfig
): Promise<CleanupDestinationFolder[]> {
  const roots: Array<{ rootType: CleanupDestinationFolder["rootType"]; path: string }> = [
    { rootType: "projects", path: config.projects },
    { rootType: "areas", path: config.areas },
    { rootType: "resources", path: config.resources },
    { rootType: "archive", path: config.archive },
  ];
  const results: CleanupDestinationFolder[] = [];

  for (const root of roots) {
    const folder = resolveFolder(vault, root.path);
    if (!folder) {
      logWarn(`Cleanup destination root is missing: ${root.path}`);
      continue;
    }

    results.push({
      id: normalizePath(folder.path),
      rootType: root.rootType,
      path: normalizePath(folder.path),
      name: folder.name,
      depth: 0,
      folder,
    });

    for (const child of folder.children) {
      if (!(child instanceof TFolder)) {
        continue;
      }

      results.push({
        id: normalizePath(child.path),
        rootType: root.rootType,
        path: normalizePath(child.path),
        name: child.name,
        depth: 1,
        folder: child,
      });

      for (const grandchild of child.children) {
        if (!(grandchild instanceof TFolder)) {
          continue;
        }

        results.push({
          id: normalizePath(grandchild.path),
          rootType: root.rootType,
          path: normalizePath(grandchild.path),
          name: grandchild.name,
          depth: 2,
          folder: grandchild,
        });
      }
    }
  }

  return results;
}
