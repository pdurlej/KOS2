import {
  KOSArtifactKind,
  KOSWorkflowContext,
  KOSWorkflowId,
  KOSWorkflowNoteRecord,
  KOSWorkflowPendingItem,
  KOSWorkflowResult,
  KOSWorkflowResultStatus,
  KOSWorkflowSource,
} from "@/kos/workflows/types";

const NON_TERMINAL_STATUSES = new Set(["active", "draft", "pending", "in-progress", "unprocessed"]);
const TITLE_PREFIX_PATTERN =
  /^(analysis|decision|review|outcome|project|area|resource|raw intake)\s*(?::|-)?\s*/i;

type KOSOrganiseDraftKind = "project" | "area" | "resource" | "analysis";

interface KOSOrganiseRouteCandidate {
  kind: KOSOrganiseDraftKind;
  score: number;
  reasons: string[];
}

interface KOSOrganiseSignal {
  text: string;
  source: KOSWorkflowSource;
}

/**
 * Convert a vault path into an Obsidian wikilink target.
 *
 * @param path - Note path including the file extension
 * @returns Obsidian wikilink target without the `.md` suffix
 */
export function toWorkflowLinkTarget(path: string): string {
  return path.replace(/\.md$/i, "");
}

/**
 * Create a stable topic label from the target note title.
 *
 * @param title - Raw note title
 * @returns Human-readable topic label
 */
export function getWorkflowTopic(title: string): string {
  const normalized = title.replace(TITLE_PREFIX_PATTERN, "").trim();
  return normalized || title.trim();
}

/**
 * Shorten long excerpts so traceability stays readable inside markdown output.
 *
 * @param text - Raw excerpt text
 * @param maxLength - Maximum output length
 * @returns Shortened excerpt
 */
export function shortenWorkflowText(text: string, maxLength = 160): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

/**
 * Convert a source reference into a single markdown bullet line.
 *
 * @param source - Source reference to format
 * @returns Markdown bullet with traceability details
 */
export function formatWorkflowSource(source: KOSWorkflowSource): string {
  const parts = [`[[${toWorkflowLinkTarget(source.path)}]]`];

  if (source.section) {
    parts.push(`section: ${source.section}`);
  }
  if (source.reason) {
    parts.push(`reason: ${source.reason}`);
  }
  if (source.excerpt) {
    parts.push(`excerpt: "${shortenWorkflowText(source.excerpt)}"`);
  }

  return `- ${parts.join(" | ")}`;
}

/**
 * Deduplicate source references while preserving their original order.
 *
 * @param sources - Source list to deduplicate
 * @returns Deduplicated source list
 */
export function dedupeWorkflowSources(sources: KOSWorkflowSource[]): KOSWorkflowSource[] {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = `${source.path}|${source.section ?? ""}|${source.excerpt ?? ""}|${source.reason ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Check whether a workflow note status is still open and should produce follow-up work.
 *
 * @param status - Note status
 * @returns True when the note is still active
 */
export function isWorkflowStatusOpen(status?: string): boolean {
  return status ? NON_TERMINAL_STATUSES.has(status) : false;
}

/**
 * Create a normalized source reference for a note.
 *
 * @param note - Note record
 * @param reason - Optional traceability reason
 * @param section - Optional section name
 * @param excerpt - Optional excerpt text
 * @returns Workflow source
 */
export function createWorkflowSource(
  note: KOSWorkflowNoteRecord,
  reason?: string,
  section?: string,
  excerpt?: string
): KOSWorkflowSource {
  return {
    path: note.path,
    reason,
    section,
    excerpt,
  };
}

/**
 * Inspect a note and derive pending items that preserve path-level traceability.
 *
 * @param note - Note record to inspect
 * @returns Pending items extracted from the note
 */
export function collectPendingItemsFromNote(note: KOSWorkflowNoteRecord): KOSWorkflowPendingItem[] {
  const items: KOSWorkflowPendingItem[] = [];

  note.tasks
    .filter((task) => !task.completed)
    .forEach((task) => {
      items.push({
        title: task.text,
        kind: "task",
        source: createWorkflowSource(note, "open task", task.section, task.text),
      });
    });

  if (note.tags.includes("needs-review")) {
    items.push({
      title: `Close the review loop for ${note.title}`,
      kind: "review",
      source: createWorkflowSource(note, "needs-review tag"),
    });
  }

  if (note.artifactKind === "outcome" && isWorkflowStatusOpen(note.status)) {
    items.push({
      title: `Update the outcome state for ${note.title}`,
      kind: "follow-up",
      source: createWorkflowSource(note, "open outcome state"),
    });
  }

  if (note.artifactKind === "analysis" && isWorkflowStatusOpen(note.status)) {
    items.push({
      title: `Promote ${note.title} into a decision or capture the missing evidence`,
      kind: "follow-up",
      source: createWorkflowSource(note, "draft analysis state"),
    });
  }

  if (note.artifactKind === "inbox" && isWorkflowStatusOpen(note.status)) {
    items.push({
      title: `Route ${note.title} into a stable KOS artifact`,
      kind: "follow-up",
      source: createWorkflowSource(note, "unprocessed intake"),
    });
  }

  return items;
}

/**
 * Merge and deduplicate pending items collected across multiple notes.
 *
 * @param notes - Notes to inspect
 * @returns Stable, deduplicated pending item list
 */
export function collectPendingItems(notes: KOSWorkflowNoteRecord[]): KOSWorkflowPendingItem[] {
  const seen = new Set<string>();
  const items: KOSWorkflowPendingItem[] = [];

  notes.forEach((note) => {
    collectPendingItemsFromNote(note).forEach((item) => {
      const key = `${item.title}|${item.source.path}|${item.source.reason ?? ""}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      items.push(item);
    });
  });

  return items;
}

/**
 * Collect evidence bullets from the target note and related notes.
 *
 * @param notes - Notes to inspect
 * @param limit - Maximum bullet count
 * @returns Evidence lines with traceability
 */
export function collectEvidenceLines(
  notes: KOSWorkflowNoteRecord[],
  limit = 6
): Array<{ text: string; source: KOSWorkflowSource }> {
  const evidence: Array<{ text: string; source: KOSWorkflowSource }> = [];

  notes.forEach((note) => {
    note.bullets.forEach((bullet) => {
      if (evidence.length >= limit) {
        return;
      }

      evidence.push({
        text: bullet.text,
        source: createWorkflowSource(note, "evidence", bullet.section, bullet.text),
      });
    });
  });

  return evidence;
}

/**
 * Collect follow-up lines used inside decision and review drafts.
 *
 * @param notes - Notes to inspect
 * @param limit - Maximum follow-up count
 * @returns Follow-up lines with traceability
 */
export function collectFollowUpLines(
  notes: KOSWorkflowNoteRecord[],
  limit = 5
): Array<{ text: string; source: KOSWorkflowSource }> {
  return collectPendingItems(notes)
    .slice(0, limit)
    .map((item) => ({
      text: item.title,
      source: item.source,
    }));
}

/**
 * Format the common traceability section.
 *
 * @param sources - Sources to format
 * @returns Markdown traceability block
 */
export function formatTraceabilitySection(sources: KOSWorkflowSource[]): string {
  const lines = dedupeWorkflowSources(sources);

  if (lines.length === 0) {
    return "## Traceability\n- No traceability sources were collected.";
  }

  return ["## Traceability", ...lines.map(formatWorkflowSource)].join("\n");
}

/**
 * Format a single intake signal with source context.
 *
 * @param signal - Intake signal to render
 * @returns Markdown bullet line
 */
export function formatOrganiseSignal(signal: KOSOrganiseSignal): string {
  return `- ${signal.text} | source: [[${toWorkflowLinkTarget(signal.source.path)}]]${
    signal.source.section ? ` | section: ${signal.source.section}` : ""
  }`;
}

/**
 * Collect a stable list of intake signals from the target note.
 *
 * @param note - Note being organized
 * @param selectedText - Optional selected excerpt
 * @param limit - Maximum signal count
 * @returns Intake signals with traceability
 */
export function collectOrganiseSignals(
  note: KOSWorkflowNoteRecord,
  selectedText?: string,
  limit = 6
): KOSOrganiseSignal[] {
  const signals: KOSOrganiseSignal[] = [];

  if (selectedText) {
    signals.push({
      text: shortenWorkflowText(selectedText, 120),
      source: createWorkflowSource(note, "selected excerpt", undefined, selectedText),
    });
  }

  note.tasks
    .filter((task) => !task.completed)
    .slice(0, limit)
    .forEach((task) => {
      signals.push({
        text: task.text,
        source: createWorkflowSource(note, "open task", task.section, task.text),
      });
    });

  if (signals.length < limit) {
    note.bullets.slice(0, limit - signals.length).forEach((bullet) => {
      signals.push({
        text: bullet.text,
        source: createWorkflowSource(note, "signal", bullet.section, bullet.text),
      });
    });
  }

  return signals.slice(0, limit);
}

/**
 * Build ranked route candidates for raw intake based on stable structural signals.
 *
 * @param note - Note being organized
 * @param selectedText - Optional selected excerpt
 * @returns Ranked route candidates
 */
export function inferOrganiseRouteCandidates(
  note: KOSWorkflowNoteRecord,
  selectedText?: string
): KOSOrganiseRouteCandidate[] {
  const openTaskCount = note.tasks.filter((task) => !task.completed).length;
  const bulletCount = note.bullets.length;
  const linkedCount = note.linkedPaths.length;
  const sectionCount = note.headings.length;

  const candidates: KOSOrganiseRouteCandidate[] = [];

  const projectReasons: string[] = [];
  let projectScore = 0;
  if (openTaskCount > 0) {
    projectScore += 6 + Math.min(openTaskCount, 3);
    projectReasons.push(`contains ${openTaskCount} open task(s)`);
  }
  if (linkedCount > 0) {
    projectScore += 1;
    projectReasons.push(`already links to ${linkedCount} note(s)`);
  }
  if (sectionCount > 1) {
    projectScore += 1;
    projectReasons.push(`has ${sectionCount} structured section(s)`);
  }
  if (projectScore > 0) {
    candidates.push({ kind: "project", score: projectScore, reasons: projectReasons });
  }

  const analysisReasons: string[] = [];
  let analysisScore = 0;
  if (bulletCount > 0) {
    analysisScore += 3 + Math.min(bulletCount, 3);
    analysisReasons.push(`captures ${bulletCount} bullet signal(s)`);
  }
  if (sectionCount > 1) {
    analysisScore += 1;
    analysisReasons.push(`has ${sectionCount} structured section(s)`);
  }
  if (selectedText) {
    analysisScore += 1;
    analysisReasons.push("includes a selected excerpt worth preserving");
  }
  if (analysisScore > 0) {
    candidates.push({ kind: "analysis", score: analysisScore, reasons: analysisReasons });
  }

  const resourceReasons: string[] = [];
  let resourceScore = 0;
  if (openTaskCount === 0) {
    resourceScore += 2;
    resourceReasons.push("does not expose explicit open tasks");
  }
  if (bulletCount > 0) {
    resourceScore += 2;
    resourceReasons.push(`contains ${bulletCount} reusable reference signal(s)`);
  }
  if (linkedCount === 0) {
    resourceScore += 1;
    resourceReasons.push("is not already anchored to another artifact");
  }
  if (resourceScore > 0) {
    candidates.push({ kind: "resource", score: resourceScore, reasons: resourceReasons });
  }

  const areaReasons: string[] = [];
  let areaScore = 0;
  if (openTaskCount > 0 && linkedCount === 0) {
    areaScore += 2;
    areaReasons.push("contains open maintenance work without a linked project context");
  }
  if (sectionCount > 1 && openTaskCount > 0) {
    areaScore += 1;
    areaReasons.push(`has ${sectionCount} sections that may indicate an ongoing responsibility`);
  }
  if (areaScore > 0) {
    candidates.push({ kind: "area", score: areaScore, reasons: areaReasons });
  }

  if (candidates.length === 0) {
    return [
      {
        kind: "resource",
        score: 1,
        reasons: ["preserve the intake in a stable note before promoting it further"],
      },
    ];
  }

  return candidates.sort((left, right) => right.score - left.score);
}

/**
 * Convert a draft kind into a stable title prefix.
 *
 * @param kind - Draft artifact kind
 * @returns Draft title prefix
 */
export function getOrganiseDraftTitlePrefix(kind: KOSOrganiseDraftKind): string {
  switch (kind) {
    case "project":
      return "Project";
    case "area":
      return "Area";
    case "resource":
      return "Resource";
    case "analysis":
      return "Analysis";
  }
}

/**
 * Build the frontmatter `source:` lines for a stabilized draft.
 *
 * @param sources - Sources to serialize
 * @returns Frontmatter source lines
 */
export function buildWorkflowFrontmatterSourceLines(sources: KOSWorkflowSource[]): string[] {
  return dedupeWorkflowSources(sources).map(
    (source) => `  - "[[${toWorkflowLinkTarget(source.path)}]]"`
  );
}

/**
 * Build a stabilized artifact draft from raw intake without writing silently.
 *
 * @param note - Source note
 * @param kind - Draft artifact kind
 * @param signals - Intake signals
 * @param sources - Supporting traceability sources
 * @returns Draft artifact markdown
 */
export function buildOrganiseDraftArtifact(
  note: KOSWorkflowNoteRecord,
  kind: KOSOrganiseDraftKind,
  signals: KOSOrganiseSignal[],
  sources: KOSWorkflowSource[]
): string {
  const topic = getWorkflowTopic(note.title);
  const signalLines =
    signals.length > 0
      ? signals.map((signal) => `- ${signal.text}`)
      : ["- No explicit intake signals were extracted from the current note."];
  const sourceLines = buildWorkflowFrontmatterSourceLines(sources);

  switch (kind) {
    case "project":
      return [
        "---",
        "tags:",
        "  - project",
        "status: active",
        "source:",
        ...sourceLines,
        "---",
        "",
        `# Project: ${topic}`,
        "",
        "## Objective",
        "- Clarify the concrete outcome this project should produce.",
        "",
        "## Intake Signals",
        ...signalLines,
        "",
        "## Open Tasks",
        ...(note.tasks.filter((task) => !task.completed).length > 0
          ? note.tasks
              .filter((task) => !task.completed)
              .slice(0, 5)
              .map((task) => `- [ ] ${task.text}`)
          : ["- [ ] Confirm the next concrete project step."]),
      ].join("\n");
    case "area":
      return [
        "---",
        "tags:",
        "  - area",
        "status: active",
        "source:",
        ...sourceLines,
        "---",
        "",
        `# Area: ${topic}`,
        "",
        "## Responsibility",
        "- Clarify the ongoing responsibility this note should stabilize.",
        "",
        "## Current Signals",
        ...signalLines,
        "",
        "## Standing Follow-Ups",
        "- [ ] Confirm whether any part of this should instead become a project.",
      ].join("\n");
    case "resource":
      return [
        "---",
        "tags:",
        "  - resource",
        "source:",
        ...sourceLines,
        "---",
        "",
        `# Resource: ${topic}`,
        "",
        "## Summary",
        "- Preserve the useful reference material from this intake in a stable note.",
        "",
        "## Key Signals",
        ...signalLines,
        "",
        "## Source",
        `- [[${toWorkflowLinkTarget(note.path)}]]`,
      ].join("\n");
    case "analysis":
      return [
        "---",
        "tags:",
        "  - analysis",
        "  - draft",
        "status: draft",
        "source:",
        ...sourceLines,
        "---",
        "",
        `# Analysis: ${topic}`,
        "",
        "## Intake Summary",
        "- Convert the raw material into explicit findings before making a decision.",
        "",
        "## Evidence Signals",
        ...signalLines,
        "",
        "## Open Questions",
        "- What should be decided, acted on, or escalated next?",
      ].join("\n");
  }
}

/**
 * Build a normalized workflow result object.
 *
 * @param workflowId - Workflow identifier
 * @param status - Result status
 * @param title - Result title
 * @param summary - Short result summary
 * @param markdown - Rendered markdown preview
 * @param recommendedNextStep - Recommended follow-up action
 * @param sources - Traceability sources
 * @param capabilityGap - Optional capability gap details
 * @param pendingItems - Optional pending item payload
 * @returns Structured workflow result
 */
export function createWorkflowResult(params: {
  workflowId: KOSWorkflowId;
  status: KOSWorkflowResultStatus;
  title: string;
  summary: string;
  markdown: string;
  recommendedNextStep: string;
  sources: KOSWorkflowSource[];
  draftArtifactMarkdown?: string;
  capabilityGap?: string;
  pendingItems?: KOSWorkflowPendingItem[];
}): KOSWorkflowResult {
  return {
    workflowId: params.workflowId,
    status: params.status,
    title: params.title,
    summary: params.summary,
    markdown: params.markdown,
    recommendedNextStep: params.recommendedNextStep,
    sources: dedupeWorkflowSources(params.sources),
    draftArtifactMarkdown: params.draftArtifactMarkdown,
    capabilityGap: params.capabilityGap,
    pendingItems: params.pendingItems,
  };
}

/**
 * Convert an artifact kind into a readable label.
 *
 * @param artifactKind - Inferred artifact kind
 * @returns Human-readable label
 */
export function getArtifactKindLabel(artifactKind: KOSArtifactKind): string {
  switch (artifactKind) {
    case "inbox":
      return "inbox intake";
    case "project":
      return "project note";
    case "area":
      return "area note";
    case "resource":
      return "resource note";
    case "analysis":
      return "analysis artifact";
    case "decision":
      return "decision artifact";
    case "review":
      return "review artifact";
    case "outcome":
      return "outcome artifact";
    default:
      return "unknown artifact";
  }
}

/**
 * Run the `organise` workflow over the resolved note context.
 *
 * @param context - Resolved workflow context
 * @returns Structured organise result
 */
export function runOrganiseWorkflow(context: KOSWorkflowContext): KOSWorkflowResult {
  const { targetNote, inputType, selectedText } = context;
  const sources = [createWorkflowSource(targetNote, "target note")];
  const intakeSignals = collectOrganiseSignals(targetNote, selectedText);
  intakeSignals.forEach((signal) => sources.push(signal.source));

  if (selectedText) {
    sources.push(createWorkflowSource(targetNote, "selected excerpt", undefined, selectedText));
  }

  let proposedRouting = "";
  let recommendedNextStep = "";
  let status: KOSWorkflowResultStatus = "ready";
  let capabilityGap: string | undefined;
  let routeCandidates: KOSOrganiseRouteCandidate[] = [];
  let draftArtifactMarkdown: string | undefined;

  switch (targetNote.artifactKind) {
    case "inbox": {
      routeCandidates = inferOrganiseRouteCandidates(targetNote, selectedText);
      const primaryRoute = routeCandidates[0];
      proposedRouting = `Capture the intake into a stabilized ${getArtifactKindLabel(primaryRoute.kind)}.`;
      recommendedNextStep = `Create or update the draft ${getArtifactKindLabel(primaryRoute.kind)}, then run \`${
        primaryRoute.kind === "analysis" ? "decision" : "next-steps"
      }\` on the stabilized artifact.`;
      draftArtifactMarkdown = buildOrganiseDraftArtifact(
        targetNote,
        primaryRoute.kind,
        intakeSignals,
        sources
      );
      break;
    }
    case "project":
    case "area":
    case "resource":
      proposedRouting = "Route into the `next-steps` workflow.";
      recommendedNextStep =
        "Run `next-steps` to extract real pending work with traceability before editing any artifact.";
      break;
    case "analysis":
      proposedRouting = "Route into the `decision` workflow.";
      recommendedNextStep =
        "Run `decision` to draft a decision artifact backed by the current analysis and linked evidence.";
      break;
    case "decision":
    case "review":
    case "outcome":
      proposedRouting = "Route into the `review` workflow.";
      recommendedNextStep =
        "Run `review` to close the loop, update the outcome state, and confirm any unresolved follow-ups.";
      break;
    default:
      status = "capability-gap";
      proposedRouting = "Unable to determine a reliable KOS route from the available structure.";
      recommendedNextStep =
        "Add an explicit artifact tag or status to the note, or route the material into a tagged KOS artifact first.";
      capabilityGap =
        "The current note does not expose enough KOS metadata to infer whether it is intake, project, analysis, decision, review, or outcome.";
      break;
  }

  const inputLabel =
    inputType === "linked-note-reference"
      ? "linked note reference"
      : inputType === "active-note-selection"
        ? "active note with selected context"
        : "active note";

  const markdownLines = [
    `# Organise: ${getWorkflowTopic(targetNote.title)}`,
    "",
    "## Input",
    `- Input source: ${inputLabel}`,
    `- Recognized artifact: ${getArtifactKindLabel(targetNote.artifactKind)}`,
    `- Current status: ${targetNote.status ?? "not set"}`,
    "",
    "## Intake Signals",
    ...(intakeSignals.length > 0
      ? intakeSignals.map(formatOrganiseSignal)
      : ["- No explicit tasks or bullet signals were extracted from the current note."]),
    "",
    "## Routing",
    `- Proposed routing: ${proposedRouting}`,
    `- Recommended next step: ${recommendedNextStep}`,
  ];

  if (routeCandidates.length > 0) {
    markdownLines.push(
      "",
      "## Ranked Routes",
      ...routeCandidates.map(
        (candidate) =>
          `- ${getArtifactKindLabel(candidate.kind)} | score: ${candidate.score} | reasons: ${candidate.reasons.join("; ")}`
      )
    );
  }

  if (capabilityGap) {
    markdownLines.push("", "## Capability Gap", `- ${capabilityGap}`);
  }

  if (draftArtifactMarkdown) {
    markdownLines.push("", "## Draft Stabilized Artifact", "```md", draftArtifactMarkdown, "```");
  }

  markdownLines.push("", formatTraceabilitySection(sources));

  return createWorkflowResult({
    workflowId: "organise",
    status,
    title: `Organise: ${targetNote.title}`,
    summary: `Recognized ${getArtifactKindLabel(targetNote.artifactKind)} from the current input and prepared the next safe routing step${
      draftArtifactMarkdown ? " with a stabilised draft artifact preview" : ""
    }.`,
    markdown: markdownLines.join("\n"),
    recommendedNextStep,
    sources,
    draftArtifactMarkdown,
    capabilityGap,
  });
}

/**
 * Run the `next-steps` workflow over the resolved note context.
 *
 * @param context - Resolved workflow context
 * @returns Structured next-steps result
 */
export function runNextStepsWorkflow(context: KOSWorkflowContext): KOSWorkflowResult {
  const inspectedNotes = [context.targetNote, ...context.relatedNotes];
  const pendingItems = collectPendingItems(inspectedNotes);
  const sources = pendingItems.map((item) => item.source);

  if (pendingItems.length === 0) {
    const refusalSources = [createWorkflowSource(context.targetNote, "target note")];
    const recommendedNextStep =
      "Capture explicit open tasks, review markers, or artifact statuses in the source note before re-running `next-steps`.";

    return createWorkflowResult({
      workflowId: "next-steps",
      status: "refusal",
      title: `Next Steps: ${context.targetNote.title}`,
      summary: "The current context does not expose explicit pending work to extract.",
      markdown: [
        `# Next Steps: ${getWorkflowTopic(context.targetNote.title)}`,
        "",
        "## Status",
        "- No explicit open tasks, review markers, or non-terminal artifact states were found.",
        "",
        "## Recommendation",
        `- ${recommendedNextStep}`,
        "",
        formatTraceabilitySection(refusalSources),
      ].join("\n"),
      recommendedNextStep,
      sources: refusalSources,
    });
  }

  const pendingLines = pendingItems.map(
    (item) =>
      `- ${item.title} | source: [[${toWorkflowLinkTarget(item.source.path)}]]${item.source.section ? ` | section: ${item.source.section}` : ""}`
  );
  const recommendedNextStep =
    "Review the extracted items, then update the highest-leverage project, review, or outcome artifact through preview/apply.";

  return createWorkflowResult({
    workflowId: "next-steps",
    status: "ready",
    title: `Next Steps: ${context.targetNote.title}`,
    summary: `Collected ${pendingItems.length} pending item(s) across ${inspectedNotes.length} traced note(s).`,
    markdown: [
      `# Next Steps: ${getWorkflowTopic(context.targetNote.title)}`,
      "",
      "## Pending Items",
      ...pendingLines,
      "",
      "## Recommendation",
      `- ${recommendedNextStep}`,
      "",
      formatTraceabilitySection(sources),
    ].join("\n"),
    recommendedNextStep,
    sources,
    pendingItems,
  });
}

/**
 * Run the `decision` workflow over the resolved note context.
 *
 * @param context - Resolved workflow context
 * @returns Structured decision result
 */
export function runDecisionWorkflow(context: KOSWorkflowContext): KOSWorkflowResult {
  const decisionNotes = [context.targetNote, ...context.relatedNotes].filter(
    (note) => note.artifactKind === "analysis" || note.artifactKind === "project"
  );
  const evidence = collectEvidenceLines(decisionNotes);
  const followUps = collectFollowUpLines([context.targetNote, ...context.relatedNotes], 4);
  const sources = [...evidence.map((item) => item.source), ...followUps.map((item) => item.source)];

  if (decisionNotes.length === 0 || evidence.length === 0) {
    const recommendedNextStep =
      "Point the workflow at an analysis artifact or capture explicit evidence in the note before drafting a decision.";

    return createWorkflowResult({
      workflowId: "decision",
      status: "refusal",
      title: `Decision: ${context.targetNote.title}`,
      summary:
        "The current context does not provide enough analysis or evidence to draft a decision safely.",
      markdown: [
        `# Decision: ${getWorkflowTopic(context.targetNote.title)}`,
        "",
        "## Status",
        "- Refused to draft a decision because no reliable analysis/evidence context was detected.",
        "",
        "## Recommendation",
        `- ${recommendedNextStep}`,
        "",
        formatTraceabilitySection([createWorkflowSource(context.targetNote, "target note")]),
      ].join("\n"),
      recommendedNextStep,
      sources: [createWorkflowSource(context.targetNote, "target note")],
    });
  }

  const topic = getWorkflowTopic(context.targetNote.title);
  const recommendedNextStep =
    "Validate the proposed verdict and use write preview before saving the decision artifact into the vault.";
  const consequenceLines =
    followUps.length > 0
      ? followUps.map((item) => `- ${item.text}`)
      : ["- No downstream consequences were inferred beyond validating the proposed verdict."];

  return createWorkflowResult({
    workflowId: "decision",
    status: "ready",
    title: `Decision: ${context.targetNote.title}`,
    summary: `Prepared a draft decision artifact from ${evidence.length} evidence line(s) with explicit source traceability.`,
    markdown: [
      "---",
      "tags:",
      "  - decision",
      "  - draft",
      "status: proposed",
      "source:",
      ...dedupeWorkflowSources(sources).map(
        (source) => `  - "[[${toWorkflowLinkTarget(source.path)}]]"`
      ),
      "---",
      "",
      `# Decision: ${topic}`,
      "",
      "## Decision",
      "- Proposed verdict: pending confirmation",
      `- Scope: ${topic}`,
      "",
      "## Evidence",
      ...evidence.map(
        (item) => `- ${item.text} | source: [[${toWorkflowLinkTarget(item.source.path)}]]`
      ),
      "",
      "## Consequences",
      ...consequenceLines,
      "",
      formatTraceabilitySection(sources),
    ].join("\n"),
    recommendedNextStep,
    sources,
  });
}

/**
 * Run the `review` workflow over the resolved note context.
 *
 * @param context - Resolved workflow context
 * @returns Structured review result
 */
export function runReviewWorkflow(context: KOSWorkflowContext): KOSWorkflowResult {
  const reviewNotes = [context.targetNote, ...context.relatedNotes].filter(
    (note) =>
      note.artifactKind === "decision" ||
      note.artifactKind === "review" ||
      note.artifactKind === "outcome"
  );
  const observations = collectEvidenceLines(reviewNotes, 6);
  const followUps = collectFollowUpLines([context.targetNote, ...context.relatedNotes], 5);
  const sources = [
    ...observations.map((item) => item.source),
    ...followUps.map((item) => item.source),
  ];

  if (reviewNotes.length === 0 || observations.length === 0) {
    const recommendedNextStep =
      "Point the workflow at a decision, review, or outcome artifact so the review loop can stay grounded in existing evidence.";

    return createWorkflowResult({
      workflowId: "review",
      status: "refusal",
      title: `Review: ${context.targetNote.title}`,
      summary:
        "The current context does not contain enough decision/outcome material to draft a review safely.",
      markdown: [
        `# Review: ${getWorkflowTopic(context.targetNote.title)}`,
        "",
        "## Status",
        "- Refused to draft a review because no decision, review, or outcome artifact was detected in context.",
        "",
        "## Recommendation",
        `- ${recommendedNextStep}`,
        "",
        formatTraceabilitySection([createWorkflowSource(context.targetNote, "target note")]),
      ].join("\n"),
      recommendedNextStep,
      sources: [createWorkflowSource(context.targetNote, "target note")],
    });
  }

  const topic = getWorkflowTopic(context.targetNote.title);
  const recommendedNextStep =
    "Validate the review summary, confirm the missing follow-ups, and use write preview before updating the underlying artifact.";
  const currentStatus =
    reviewNotes.find((note) => note.status)?.status ?? context.targetNote.status ?? "pending";

  return createWorkflowResult({
    workflowId: "review",
    status: "ready",
    title: `Review: ${context.targetNote.title}`,
    summary: `Prepared a review draft from ${observations.length} observation line(s) and ${followUps.length} follow-up signal(s).`,
    markdown: [
      "---",
      "tags:",
      "  - review",
      "  - draft",
      `status: ${currentStatus}`,
      "source:",
      ...dedupeWorkflowSources(sources).map(
        (source) => `  - "[[${toWorkflowLinkTarget(source.path)}]]"`
      ),
      "---",
      "",
      `# Review: ${topic}`,
      "",
      "## Status",
      `- Current review state: ${currentStatus}`,
      "",
      "## Observations",
      ...observations.map(
        (item) => `- ${item.text} | source: [[${toWorkflowLinkTarget(item.source.path)}]]`
      ),
      "",
      "## Missing Follow-Ups",
      ...(followUps.length > 0
        ? followUps.map(
            (item) => `- ${item.text} | source: [[${toWorkflowLinkTarget(item.source.path)}]]`
          )
        : ["- No additional follow-ups were inferred from the current review context."]),
      "",
      formatTraceabilitySection(sources),
    ].join("\n"),
    recommendedNextStep,
    sources,
  });
}

/**
 * Dispatch the requested workflow against the resolved context.
 *
 * @param workflowId - Workflow identifier
 * @param context - Resolved workflow context
 * @returns Structured workflow result
 */
export function runKOSWorkflow(
  workflowId: KOSWorkflowId,
  context: KOSWorkflowContext
): KOSWorkflowResult {
  switch (workflowId) {
    case "organise":
      return runOrganiseWorkflow(context);
    case "next-steps":
      return runNextStepsWorkflow(context);
    case "decision":
      return runDecisionWorkflow(context);
    case "review":
      return runReviewWorkflow(context);
  }
}
