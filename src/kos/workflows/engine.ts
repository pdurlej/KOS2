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
  /^(analysis|decision|review|outcome|project|raw intake)\s*(?::|-)?\s*/i;

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

  if (selectedText) {
    sources.push(createWorkflowSource(targetNote, "selected excerpt", undefined, selectedText));
  }

  let proposedRouting = "";
  let recommendedNextStep = "";
  let status: KOSWorkflowResultStatus = "ready";
  let capabilityGap: string | undefined;

  switch (targetNote.artifactKind) {
    case "inbox":
      proposedRouting = "Capture the intake into the correct project, area, or resource artifact.";
      recommendedNextStep =
        "Create or update the destination KOS note, then run `next-steps` on the stabilized artifact.";
      break;
    case "project":
    case "area":
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
    "## Routing",
    `- Proposed routing: ${proposedRouting}`,
    `- Recommended next step: ${recommendedNextStep}`,
  ];

  if (capabilityGap) {
    markdownLines.push("", "## Capability Gap", `- ${capabilityGap}`);
  }

  markdownLines.push("", formatTraceabilitySection(sources));

  return createWorkflowResult({
    workflowId: "organise",
    status,
    title: `Organise: ${targetNote.title}`,
    summary: `Recognized ${getArtifactKindLabel(targetNote.artifactKind)} from the current input and prepared the next safe routing step.`,
    markdown: markdownLines.join("\n"),
    recommendedNextStep,
    sources,
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
