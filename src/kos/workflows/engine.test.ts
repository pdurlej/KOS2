import {
  createWorkflowNoteRecord,
  runDecisionWorkflow,
  runNextStepsWorkflow,
  runOrganiseWorkflow,
  runReviewWorkflow,
} from "@/kos/workflows";
import { KOSWorkflowContext, KOSWorkflowNoteSeed } from "@/kos/workflows/types";

/**
 * Build a normalized note record from an inline test fixture.
 *
 * @param seed - Raw note seed fixture
 * @returns Normalized note record
 */
function buildNote(seed: KOSWorkflowNoteSeed) {
  return createWorkflowNoteRecord(seed);
}

/**
 * Build a workflow context for tests.
 *
 * @param target - Target note record
 * @param relatedNotes - Related note records
 * @param selectedText - Optional selected text
 * @returns Workflow context
 */
function buildContext(
  target: ReturnType<typeof buildNote>,
  relatedNotes: ReturnType<typeof buildNote>[] = [],
  selectedText?: string
): KOSWorkflowContext {
  return {
    targetNote: target,
    relatedNotes,
    inputType: selectedText ? "active-note-selection" : "active-note",
    selectedText,
  };
}

describe("KOS workflow engine", () => {
  const rawIntake = buildNote({
    path: "01_Inbox/2026-04-01_raw-intake.md",
    title: "Raw intake: alpha launch notes",
    status: "unprocessed",
    tags: ["inbox", "raw"],
    content: `---
tags:
  - inbox
  - raw
status: unprocessed
---

# Raw intake: alpha launch notes

- Need a clear rollout note for the KOS2 alpha.
- Current plugin bootstrap already points to Ollama local plus optional Ollama Cloud web tools.
- Confirm whether we should route remaining work into organise or decision.
`,
  });

  const projectNote = buildNote({
    path: "10_Projects/alpha-launch/project-alpha-launch.md",
    title: "Project Alpha Launch",
    status: "active",
    tags: ["project", "alpha"],
    linkedPaths: [
      "10_Projects/alpha-launch/analysis-alpha-launch.md",
      "10_Projects/alpha-launch/decision-alpha-launch.md",
      "10_Projects/alpha-launch/review-alpha-launch.md",
      "10_Projects/alpha-launch/outcome-alpha-launch.md",
    ],
    content: `---
tags:
  - project
  - alpha
status: active
---

# Project Alpha Launch

## Pending work

- [ ] Finalize readiness artifacts for Milestone 0.
- [ ] Remove runtime-facing Copilot Plus copy from onboarding and settings.
- [ ] Verify npm run smoke:ollama on a local Ollama host.
`,
  });

  const analysisNote = buildNote({
    path: "10_Projects/alpha-launch/analysis-alpha-launch.md",
    title: "Analysis Alpha Launch",
    status: "draft",
    tags: ["analysis", "alpha"],
    content: `---
tags:
  - analysis
status: draft
---

# Analysis Alpha Launch

## Findings

- The bootstrap already defaults to Ollama for chat and embeddings.
- Optional web tooling is routed through Ollama Cloud and should remain optional.
- The plugin still exposes legacy premium copy in a few runtime-facing surfaces.

## Implications

- Milestone 0 should lock contracts, fixtures, and gates first.
- Milestone 1 should focus on runtime hardening and visible product semantics.
`,
  });

  const decisionNote = buildNote({
    path: "10_Projects/alpha-launch/decision-alpha-launch.md",
    title: "Decision Alpha Launch",
    status: "accepted",
    tags: ["decision", "alpha"],
    content: `---
tags:
  - decision
status: accepted
---

# Decision Alpha Launch

## Decision

- local Ollama as the default runtime,
- optional Ollama Cloud only for web tools,
- no custom backend,
- no early ingest or transcript scope.
`,
  });

  const reviewNote = buildNote({
    path: "10_Projects/alpha-launch/review-alpha-launch.md",
    title: "Review Alpha Launch",
    status: "pending",
    tags: ["review", "needs-review"],
    content: `---
tags:
  - review
  - needs-review
status: pending
---

# Review Alpha Launch

## Open review points

- Confirm that local-only usage works without any API key.
- Confirm that cloud configuration is clearly optional.
- Confirm that onboarding no longer implies purchase or renewal.
`,
  });

  const outcomeNote = buildNote({
    path: "10_Projects/alpha-launch/outcome-alpha-launch.md",
    title: "Outcome Alpha Launch",
    status: "in-progress",
    tags: ["outcome", "alpha"],
    content: `---
tags:
  - outcome
status: in-progress
---

# Outcome Alpha Launch

## Current outcome summary

- Bootstrap is in place.
- Readiness artifacts are being finalized.
- Runtime copy cleanup is still required before Alpha.
`,
  });

  it("normalizes tags, sections, tasks, and artifact kind from a markdown note", () => {
    expect(projectNote.artifactKind).toBe("project");
    expect(projectNote.tasks).toHaveLength(3);
    expect(projectNote.headings.map((section) => section.heading)).toEqual([
      "Project Alpha Launch",
      "Pending work",
    ]);
  });

  it("routes organise safely from raw intake without fabricating a decision", () => {
    const result = runOrganiseWorkflow(buildContext(rawIntake, [], "Confirm next routing"));

    expect(result.status).toBe("ready");
    expect(result.markdown).toContain("Recognized artifact: inbox intake");
    expect(result.markdown).toContain("## Intake Signals");
    expect(result.markdown).toContain("## Ranked Routes");
    expect(result.markdown).toContain("## Draft Stabilized Artifact");
    expect(result.draftArtifactMarkdown).toBeDefined();
    expect(result.draftArtifactMarkdown ?? "").toContain("# Analysis: alpha launch notes");
    expect(result.draftArtifactMarkdown ?? "").toContain("## Evidence Signals");
    expect(result.recommendedNextStep).toContain("decision");
    expect(result.sources.some((source) => source.reason === "selected excerpt")).toBe(true);
  });

  it("recognizes resource notes as stable PARA artifacts", () => {
    const resourceNote = buildNote({
      path: "30_Resources/launch-reference.md",
      title: "Launch reference",
      tags: ["resource"],
      content: `---
tags:
  - resource
---

# Launch reference

- Keep this as reference material.
`,
    });

    const result = runOrganiseWorkflow(buildContext(resourceNote));

    expect(resourceNote.artifactKind).toBe("resource");
    expect(result.markdown).toContain("Recognized artifact: resource note");
    expect(result.recommendedNextStep).toContain("next-steps");
  });

  it("collects pending items with traceability across project-linked notes", () => {
    const result = runNextStepsWorkflow(
      buildContext(projectNote, [analysisNote, decisionNote, reviewNote, outcomeNote])
    );

    expect(result.status).toBe("ready");
    expect(result.pendingItems?.length).toBeGreaterThanOrEqual(5);
    expect(result.markdown).toContain("Finalize readiness artifacts for Milestone 0.");
    expect(result.markdown).toContain("Close the review loop for Review Alpha Launch");
    expect(result.markdown).toContain("[[10_Projects/alpha-launch/review-alpha-launch]]");
  });

  it("drafts a decision artifact from analysis evidence", () => {
    const result = runDecisionWorkflow(buildContext(analysisNote, [projectNote]));

    expect(result.status).toBe("ready");
    expect(result.markdown).toContain("tags:");
    expect(result.markdown).toContain("# Decision: Alpha Launch");
    expect(result.markdown).toContain(
      "The bootstrap already defaults to Ollama for chat and embeddings."
    );
    expect(result.markdown).toContain("[[10_Projects/alpha-launch/analysis-alpha-launch]]");
  });

  it("drafts a review artifact from decision and outcome context", () => {
    const result = runReviewWorkflow(
      buildContext(reviewNote, [decisionNote, outcomeNote, projectNote])
    );

    expect(result.status).toBe("ready");
    expect(result.markdown).toContain("# Review: Alpha Launch");
    expect(result.markdown).toContain("Current review state: pending");
    expect(result.markdown).toContain("Update the outcome state for Outcome Alpha Launch");
    expect(result.markdown).toContain("[[10_Projects/alpha-launch/outcome-alpha-launch]]");
  });

  it("refuses to draft a decision when no analysis or evidence exists", () => {
    const result = runDecisionWorkflow(buildContext(rawIntake));

    expect(result.status).toBe("refusal");
    expect(result.summary).toContain("does not provide enough analysis or evidence");
    expect(result.markdown).toContain("Refused to draft a decision");
  });
});
