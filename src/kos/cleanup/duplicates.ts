import { CleanupDuplicateGroup, CleanupScannedFile } from "@/kos/cleanup/types";

const DUPLICATE_SUFFIX_PATTERN = /(?:[- ]\d+|\(\d+\)|[- ]copy)$/i;

/**
 * Normalize a filename so duplicate suffixes do not affect grouping.
 *
 * @param name - File basename without path.
 * @returns Normalized duplicate key.
 */
function normalizeDuplicateName(name: string): string {
  return name.replace(DUPLICATE_SUFFIX_PATTERN, "").trim().toLowerCase();
}

/**
 * Compute a stable overlap score between two markdown documents.
 *
 * @param firstContent - First note content.
 * @param secondContent - Second note content.
 * @returns Value in range 0..1.
 */
function computeLineOverlap(firstContent: string, secondContent: string): number {
  const firstLines = new Set(
    firstContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );
  const secondLines = new Set(
    secondContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );

  if (firstLines.size === 0 || secondLines.size === 0) {
    return 0;
  }

  let shared = 0;
  firstLines.forEach((line) => {
    if (secondLines.has(line)) {
      shared += 1;
    }
  });

  return shared / Math.max(firstLines.size, secondLines.size);
}

/**
 * Find likely duplicate groups among scanned inbox files.
 *
 * @param files - Candidate files.
 * @param contentByPath - Optional markdown content lookup.
 * @returns Duplicate groups keyed by the newest kept file.
 */
export function detectDuplicateGroups(
  files: CleanupScannedFile[],
  contentByPath: Record<string, string>
): CleanupDuplicateGroup[] {
  const groupedByName = new Map<string, CleanupScannedFile[]>();

  files.forEach((file) => {
    const key = `${normalizeDuplicateName(file.name.replace(/\.[^.]+$/, ""))}.${file.extension}`;
    const group = groupedByName.get(key) ?? [];
    group.push(file);
    groupedByName.set(key, group);
  });

  const duplicateGroups: CleanupDuplicateGroup[] = [];

  groupedByName.forEach((group, key) => {
    if (group.length < 2) {
      return;
    }

    const sortedGroup = [...group].sort((left, right) => right.mtime - left.mtime);
    const keep = sortedGroup[0];
    const duplicates = sortedGroup.slice(1);
    let exact = true;

    if (keep.extension === "md") {
      exact = duplicates.every((candidate) => {
        const maxSize = Math.max(keep.size, candidate.size, 1);
        const sizeDelta = Math.abs(keep.size - candidate.size) / maxSize;
        if (sizeDelta > 0.2) {
          return false;
        }

        const overlap = computeLineOverlap(
          contentByPath[keep.path] ?? "",
          contentByPath[candidate.path] ?? ""
        );
        return overlap >= 0.8;
      });
    } else {
      exact = duplicates.every((candidate) => candidate.size === keep.size);
    }

    duplicateGroups.push({
      id: `dup:${key}`,
      keepItemId: keep.id,
      keepPath: keep.path,
      duplicateItemIds: duplicates.map((item) => item.id),
      duplicatePaths: duplicates.map((item) => item.path),
      exact,
      reason: exact
        ? "Looks like an explicit duplicate group. Keep the newest copy."
        : "Looks like a near-duplicate group by suffix and content overlap.",
    });
  });

  return duplicateGroups.sort((left, right) => left.keepPath.localeCompare(right.keepPath));
}
