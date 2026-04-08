/**
 * Supported KOS workflow identifiers.
 */
export type KOSWorkflowId = "organise" | "next-steps" | "decision" | "review";

/**
 * Known KOS artifact kinds inferred from note metadata and structure.
 */
export type KOSArtifactKind =
  | "inbox"
  | "project"
  | "area"
  | "analysis"
  | "decision"
  | "review"
  | "outcome"
  | "unknown";

/**
 * Normalized task item extracted from a markdown note.
 */
export interface KOSWorkflowTask {
  text: string;
  completed: boolean;
  line: number;
  section?: string;
}

/**
 * Normalized bullet item extracted from a markdown note.
 */
export interface KOSWorkflowBullet {
  text: string;
  line: number;
  section?: string;
}

/**
 * Normalized heading section extracted from a markdown note.
 */
export interface KOSWorkflowSection {
  heading: string;
  level: number;
  body: string;
}

/**
 * Structured note representation used by KOS workflow engines.
 */
export interface KOSWorkflowNoteRecord {
  path: string;
  title: string;
  content: string;
  status?: string;
  tags: string[];
  linkedPaths: string[];
  artifactKind: KOSArtifactKind;
  headings: KOSWorkflowSection[];
  tasks: KOSWorkflowTask[];
  bullets: KOSWorkflowBullet[];
}

/**
 * Source reference attached to workflow output for traceability.
 */
export interface KOSWorkflowSource {
  path: string;
  section?: string;
  excerpt?: string;
  reason?: string;
}

/**
 * User input origin resolved before running a workflow.
 */
export type KOSWorkflowInputType =
  | "active-note"
  | "active-note-selection"
  | "linked-note-reference";

/**
 * Resolved workflow context passed to the engine.
 */
export interface KOSWorkflowContext {
  targetNote: KOSWorkflowNoteRecord;
  relatedNotes: KOSWorkflowNoteRecord[];
  inputType: KOSWorkflowInputType;
  selectedText?: string;
}

/**
 * Workflow result lifecycle states.
 */
export type KOSWorkflowResultStatus = "ready" | "capability-gap" | "refusal";

/**
 * Normalized pending item returned by the `next-steps` workflow.
 */
export interface KOSWorkflowPendingItem {
  title: string;
  kind: "task" | "follow-up" | "review";
  source: KOSWorkflowSource;
}

/**
 * Structured workflow result rendered in a modal preview.
 */
export interface KOSWorkflowResult {
  workflowId: KOSWorkflowId;
  status: KOSWorkflowResultStatus;
  title: string;
  summary: string;
  markdown: string;
  recommendedNextStep: string;
  sources: KOSWorkflowSource[];
  pendingItems?: KOSWorkflowPendingItem[];
  capabilityGap?: string;
}

/**
 * Metadata describing an exposed KOS workflow surface.
 */
export interface KOSWorkflowDefinition {
  id: KOSWorkflowId;
  label: string;
  summary: string;
  commandId: string;
}

/**
 * Seed data used to build a normalized note record.
 */
export interface KOSWorkflowNoteSeed {
  path: string;
  title: string;
  content: string;
  status?: string;
  tags?: string[];
  linkedPaths?: string[];
}
