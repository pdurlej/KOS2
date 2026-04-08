import {
  KOSArtifactKind,
  KOSWorkflowBullet,
  KOSWorkflowNoteRecord,
  KOSWorkflowNoteSeed,
  KOSWorkflowSection,
  KOSWorkflowTask,
} from "@/kos/workflows/types";

const CHECKBOX_TASK_PATTERN = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;
const BULLET_PATTERN = /^\s*[-*]\s+(?!\[[ xX]\]\s+)(.*)$/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/**
 * Strip YAML frontmatter from markdown content.
 *
 * @param content - Raw note content
 * @returns Content without the leading frontmatter block
 */
export function stripWorkflowFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_PATTERN, "");
}

/**
 * Normalize a tag value for stable workflow matching.
 *
 * @param tag - Raw tag value
 * @returns Lowercase tag without the leading hash
 */
export function normalizeWorkflowTag(tag: string): string {
  return tag.replace(/^#/, "").trim().toLowerCase();
}

/**
 * Normalize a status value for stable workflow matching.
 *
 * @param status - Raw status value
 * @returns Lowercase status or undefined when empty
 */
export function normalizeWorkflowStatus(status?: string): string | undefined {
  const normalized = status?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

/**
 * Parse markdown sections while preserving heading order and section bodies.
 *
 * @param content - Markdown content without frontmatter
 * @returns Parsed heading sections
 */
export function parseWorkflowSections(content: string): KOSWorkflowSection[] {
  const lines = content.split(/\r?\n/);
  const sections: KOSWorkflowSection[] = [];
  let currentSection: KOSWorkflowSection | null = null;
  let currentBody: string[] = [];

  /**
   * Finalize the currently buffered section, if any.
   */
  const flushSection = (): void => {
    if (!currentSection) {
      return;
    }

    sections.push({
      ...currentSection,
      body: currentBody.join("\n").trim(),
    });
  };

  for (const line of lines) {
    const headingMatch = line.match(HEADING_PATTERN);

    if (!headingMatch) {
      currentBody.push(line);
      continue;
    }

    flushSection();
    currentSection = {
      heading: headingMatch[2].trim(),
      level: headingMatch[1].length,
      body: "",
    };
    currentBody = [];
  }

  flushSection();
  return sections;
}

/**
 * Parse markdown checkbox tasks and keep their source section and line number.
 *
 * @param content - Markdown content without frontmatter
 * @returns Parsed task items
 */
export function parseWorkflowTasks(content: string): KOSWorkflowTask[] {
  const lines = content.split(/\r?\n/);
  const tasks: KOSWorkflowTask[] = [];
  let currentSection: string | undefined;

  lines.forEach((line, index) => {
    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      currentSection = headingMatch[2].trim();
      return;
    }

    const taskMatch = line.match(CHECKBOX_TASK_PATTERN);
    if (!taskMatch) {
      return;
    }

    const taskText = taskMatch[2].trim();
    if (!taskText) {
      return;
    }

    tasks.push({
      text: taskText,
      completed: taskMatch[1].toLowerCase() === "x",
      line: index + 1,
      section: currentSection,
    });
  });

  return tasks;
}

/**
 * Parse markdown bullet points and keep their source section and line number.
 *
 * @param content - Markdown content without frontmatter
 * @returns Parsed bullet items
 */
export function parseWorkflowBullets(content: string): KOSWorkflowBullet[] {
  const lines = content.split(/\r?\n/);
  const bullets: KOSWorkflowBullet[] = [];
  let currentSection: string | undefined;

  lines.forEach((line, index) => {
    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      currentSection = headingMatch[2].trim();
      return;
    }

    const bulletMatch = line.match(BULLET_PATTERN);
    if (!bulletMatch) {
      return;
    }

    const bulletText = bulletMatch[1].trim();
    if (!bulletText) {
      return;
    }

    bullets.push({
      text: bulletText,
      line: index + 1,
      section: currentSection,
    });
  });

  return bullets;
}

/**
 * Infer the KOS artifact kind from normalized tags and status.
 *
 * @param tags - Normalized tags
 * @param status - Normalized status
 * @returns Inferred artifact kind
 */
export function inferWorkflowArtifactKind(tags: string[], status?: string): KOSArtifactKind {
  if (tags.includes("analysis")) {
    return "analysis";
  }
  if (tags.includes("decision")) {
    return "decision";
  }
  if (tags.includes("review")) {
    return "review";
  }
  if (tags.includes("outcome")) {
    return "outcome";
  }
  if (tags.includes("project")) {
    return "project";
  }
  if (tags.includes("area")) {
    return "area";
  }
  if (tags.includes("resource")) {
    return "resource";
  }
  if (tags.includes("inbox") || tags.includes("raw") || status === "unprocessed") {
    return "inbox";
  }

  return "unknown";
}

/**
 * Build a normalized note record consumed by the KOS workflow engine.
 *
 * @param seed - Raw note seed data
 * @returns Normalized workflow note record
 */
export function createWorkflowNoteRecord(seed: KOSWorkflowNoteSeed): KOSWorkflowNoteRecord {
  const content = stripWorkflowFrontmatter(seed.content);
  const tags = Array.from(
    new Set((seed.tags ?? []).map(normalizeWorkflowTag).filter((tag) => tag.length > 0))
  );
  const status = normalizeWorkflowStatus(seed.status);

  return {
    path: seed.path,
    title: seed.title.trim(),
    content,
    status,
    tags,
    linkedPaths: Array.from(new Set((seed.linkedPaths ?? []).filter((path) => path.length > 0))),
    artifactKind: inferWorkflowArtifactKind(tags, status),
    headings: parseWorkflowSections(content),
    tasks: parseWorkflowTasks(content),
    bullets: parseWorkflowBullets(content),
  };
}
