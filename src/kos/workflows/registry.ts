import { KOSWorkflowDefinition, KOSWorkflowId } from "@/kos/workflows/types";
import { COMMAND_IDS } from "@/constants";

/**
 * Static registry for the first KOS workflow surface shipped in Milestone 2.
 */
export const KOS_WORKFLOW_REGISTRY: Record<KOSWorkflowId, KOSWorkflowDefinition> = {
  organise: {
    id: "organise",
    label: "Organise",
    summary: "Classify the current note and recommend the next KOS routing step.",
    commandId: COMMAND_IDS.KOS_ORGANISE,
  },
  "next-steps": {
    id: "next-steps",
    label: "Next Steps",
    summary: "Collect real pending work with explicit note traceability.",
    commandId: COMMAND_IDS.KOS_NEXT_STEPS,
  },
  decision: {
    id: "decision",
    label: "Decision",
    summary: "Draft a decision artifact from analysis and connected evidence.",
    commandId: COMMAND_IDS.KOS_DECISION,
  },
  review: {
    id: "review",
    label: "Review",
    summary: "Draft a review or outcome update from decision context.",
    commandId: COMMAND_IDS.KOS_REVIEW,
  },
  cleanup: {
    id: "cleanup",
    label: "Cleanup Inbox",
    summary: "Scan 01 Inbox, propose PARA routing, and execute only after approval.",
    commandId: COMMAND_IDS.KOS_CLEANUP,
  },
};

/**
 * Resolve workflow metadata from the static registry.
 *
 * @param workflowId - Workflow identifier to resolve
 * @returns Matching workflow definition
 */
export function getKOSWorkflowDefinition(workflowId: KOSWorkflowId): KOSWorkflowDefinition {
  return KOS_WORKFLOW_REGISTRY[workflowId];
}
