import { KOSWorkflowResultModal } from "@/components/modals/KOSWorkflowResultModal";
import { logError } from "@/logger";
import { resolveWorkflowContext } from "@/kos/workflows/context";
import { runKOSWorkflow } from "@/kos/workflows/engine";
import { getKOSWorkflowDefinition } from "@/kos/workflows/registry";
import { KOSWorkflowId } from "@/kos/workflows/types";
import { CustomError } from "@/error";
import { Notice } from "obsidian";
import type CopilotPlugin from "@/main";

/**
 * Execute a KOS workflow from the command palette surface.
 *
 * @param plugin - Active plugin instance
 * @param workflowId - Workflow identifier to execute
 */
export async function runWorkflowCommand(
  plugin: CopilotPlugin,
  workflowId: KOSWorkflowId
): Promise<void> {
  const workflow = getKOSWorkflowDefinition(workflowId);

  try {
    const context = await resolveWorkflowContext(plugin.app);
    const result = runKOSWorkflow(workflowId, context);
    new KOSWorkflowResultModal(plugin.app, result).open();
  } catch (error) {
    if (error instanceof CustomError) {
      new Notice(error.message);
      return;
    }

    logError(`Failed to run KOS workflow ${workflow.id}`, error);
    new Notice(`Failed to run the ${workflow.label} workflow. Check the log for details.`);
  }
}
