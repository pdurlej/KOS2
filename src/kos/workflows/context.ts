import { createWorkflowNoteRecord } from "@/kos/workflows/parser";
import {
  KOSWorkflowContext,
  KOSWorkflowInputType,
  KOSWorkflowNoteRecord,
} from "@/kos/workflows/types";
import { CustomError } from "@/error";
import { getTagsFromNote } from "@/utils";
import { App, MarkdownView, TFile } from "obsidian";

const WIKILINK_PATTERN = /^\[\[([^[\]]+)\]\]$/;
const MAX_RELATED_NOTES = 8;

/**
 * Resolve a wikilink selection into a markdown file, if possible.
 *
 * @param app - Obsidian app instance
 * @param selectedText - Current editor selection
 * @param sourcePath - Source path used for relative link resolution
 * @returns Resolved file or null when the selection is not a wikilink
 */
export function resolveSelectedWorkflowFile(
  app: App,
  selectedText: string,
  sourcePath?: string
): TFile | null {
  const match = selectedText.trim().match(WIKILINK_PATTERN);
  if (!match) {
    return null;
  }

  const rawTarget = match[1].split("|")[0].trim();
  if (!rawTarget) {
    return null;
  }

  const resolved = app.metadataCache.getFirstLinkpathDest(rawTarget, sourcePath ?? "");
  return resolved instanceof TFile ? resolved : null;
}

/**
 * Build a normalized workflow note record from an Obsidian file.
 *
 * @param app - Obsidian app instance
 * @param file - File to normalize
 * @returns Normalized workflow note record
 */
export async function readWorkflowNoteRecord(
  app: App,
  file: TFile
): Promise<KOSWorkflowNoteRecord> {
  const rawContent = await app.vault.cachedRead(file);
  const cache = app.metadataCache.getFileCache(file);
  const linkedPaths =
    cache?.links
      ?.map((link) => app.metadataCache.getFirstLinkpathDest(link.link, file.path))
      .filter((linkedFile): linkedFile is TFile => linkedFile instanceof TFile)
      .map((linkedFile) => linkedFile.path) ?? [];

  return createWorkflowNoteRecord({
    path: file.path,
    title: file.basename,
    content: rawContent,
    status: typeof cache?.frontmatter?.status === "string" ? cache.frontmatter.status : undefined,
    tags: getTagsFromNote(file, false),
    linkedPaths,
  });
}

/**
 * Resolve the current KOS workflow input from the active Obsidian view.
 *
 * @param app - Obsidian app instance
 * @returns Workflow context grounded in the active note and its linked notes
 */
export async function resolveWorkflowContext(app: App): Promise<KOSWorkflowContext> {
  const activeView = app.workspace.getActiveViewOfType(MarkdownView);
  const activeFile = activeView?.file ?? app.workspace.getActiveFile();

  if (!(activeFile instanceof TFile) || activeFile.extension !== "md") {
    throw new CustomError("Open a markdown note before running a KOS workflow.");
  }

  const selectedText = activeView?.editor?.getSelection().trim() ?? "";
  const selectedFile = resolveSelectedWorkflowFile(app, selectedText, activeFile.path);
  const inputType: KOSWorkflowInputType = selectedFile
    ? "linked-note-reference"
    : selectedText
      ? "active-note-selection"
      : "active-note";
  const targetFile = selectedFile ?? activeFile;
  const targetNote = await readWorkflowNoteRecord(app, targetFile);

  const relatedPaths = targetNote.linkedPaths
    .filter((path) => path !== targetNote.path)
    .slice(0, MAX_RELATED_NOTES);
  const relatedNotes = await Promise.all(
    relatedPaths.map(async (path) => {
      const file = app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || file.extension !== "md") {
        return null;
      }

      return readWorkflowNoteRecord(app, file);
    })
  );

  return {
    targetNote,
    relatedNotes: relatedNotes.filter((note): note is KOSWorkflowNoteRecord => note !== null),
    inputType,
    selectedText: inputType === "active-note-selection" ? selectedText : undefined,
  };
}
