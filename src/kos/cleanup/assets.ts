import {
  CleanupAssetOwnership,
  CleanupAssetReference,
  CleanupScannedFile,
  CleanupScannedItem,
} from "@/kos/cleanup/types";

const WIKILINK_IMAGE_PATTERN = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\(([^)]+)\)/g;

/**
 * Normalize a vault path without relying on runtime-only Obsidian helpers.
 *
 * @param value - Raw path.
 * @returns Normalized path.
 */
function normalizeVaultPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Resolve a potentially relative reference path against a note path.
 *
 * @param notePath - Absolute vault path of the note.
 * @param reference - Raw markdown or wikilink reference.
 * @returns Normalized vault path candidate.
 */
function resolveReferencePath(notePath: string, reference: string): string {
  if (/^(https?:)?\/\//i.test(reference)) {
    return "";
  }

  if (reference.startsWith("/")) {
    return normalizeVaultPath(reference.replace(/^\/+/, ""));
  }

  const noteFolder = notePath.split("/").slice(0, -1).join("/");
  const combined = noteFolder ? `${noteFolder}/${reference}` : reference;
  const normalized = normalizeVaultPath(combined);
  const segments = normalized.split("/");
  const stack: string[] = [];

  segments.forEach((segment) => {
    if (segment === "." || segment === "") {
      return;
    }
    if (segment === "..") {
      stack.pop();
      return;
    }
    stack.push(segment);
  });

  return normalizeVaultPath(stack.join("/"));
}

/**
 * Build a lookup from asset basename to absolute inbox asset path.
 *
 * @param assetItems - Asset inventory discovered in the inbox assets subtree.
 * @returns Basename lookup map.
 */
function buildAssetBasenameMap(assetItems: CleanupScannedItem[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  assetItems
    .filter((item) => item.kind === "file")
    .forEach((item) => {
      const basename = item.path.split("/").pop() ?? item.path;
      const existing = map.get(basename) ?? [];
      existing.push(item.path);
      map.set(basename, existing);
    });

  return map;
}

/**
 * Extract image-like asset references from markdown note content.
 *
 * @param note - Markdown note scanned from the inbox.
 * @param content - Raw markdown content.
 * @param assetItems - Asset inventory from the inbox assets subtree.
 * @returns Resolved asset references.
 */
export function extractAssetReferences(
  note: CleanupScannedFile,
  content: string,
  assetItems: CleanupScannedItem[]
): CleanupAssetReference[] {
  const references = new Map<string, CleanupAssetReference>();
  const assetBasenameMap = buildAssetBasenameMap(assetItems);

  /**
   * Add a resolved asset reference if it points to an inbox asset.
   *
   * @param rawReference - Raw reference captured from markdown.
   */
  const addReference = (rawReference: string): void => {
    const cleanedReference = rawReference.trim().replace(/^<|>$/g, "");
    if (!cleanedReference) {
      return;
    }

    const directPath = resolveReferencePath(note.path, cleanedReference);
    let resolvedPath = directPath;

    if (!assetItems.some((item) => item.path === directPath)) {
      const basename = cleanedReference.split("/").pop() ?? cleanedReference;
      const assetCandidates = assetBasenameMap.get(basename) ?? [];
      if (assetCandidates.length === 1) {
        resolvedPath = assetCandidates[0];
      } else {
        resolvedPath = "";
      }
    }

    if (!resolvedPath) {
      return;
    }

    references.set(resolvedPath, {
      rawReference: cleanedReference,
      resolvedPath,
    });
  };

  for (const match of content.matchAll(WIKILINK_IMAGE_PATTERN)) {
    addReference(match[1]);
  }

  for (const match of content.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    addReference(match[1]);
  }

  return Array.from(references.values());
}

/**
 * Compute ownership of inbox assets across scanned markdown notes.
 *
 * @param markdownNotes - Markdown notes in the inbox scan.
 * @param noteContents - Content lookup keyed by note path.
 * @param assetItems - Inbox asset inventory.
 * @returns Asset ownership map.
 */
export function computeAssetOwnership(
  markdownNotes: CleanupScannedFile[],
  noteContents: Record<string, string>,
  assetItems: CleanupScannedItem[]
): CleanupAssetOwnership[] {
  const ownershipMap = new Map<string, Set<string>>();

  markdownNotes.forEach((note) => {
    const content = noteContents[note.path] ?? "";
    const references = extractAssetReferences(note, content, assetItems);
    references.forEach((reference) => {
      const owners = ownershipMap.get(reference.resolvedPath) ?? new Set<string>();
      owners.add(note.path);
      ownershipMap.set(reference.resolvedPath, owners);
    });
  });

  return Array.from(ownershipMap.entries()).map(([assetPath, owners]) => ({
    assetPath,
    referencedBy: Array.from(owners.values()).sort(),
  }));
}
