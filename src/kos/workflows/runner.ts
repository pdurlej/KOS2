import { KOSCleanupProposalModal } from "@/components/modals/KOSCleanupProposalModal";
import { KOSWorkflowResultModal } from "@/components/modals/KOSWorkflowResultModal";
import { logError } from "@/logger";
import { applyCleanupDecision, prepareCleanupProposal } from "@/kos/cleanup/service";
import { resolveWorkflowContext } from "@/kos/workflows/context";
import { runKOSWorkflow } from "@/kos/workflows/engine";
import { getKOSWorkflowDefinition } from "@/kos/workflows/registry";
import { KOSWorkflowId } from "@/kos/workflows/types";
import { CustomError } from "@/error";
import { Notice } from "obsidian";
import type CopilotPlugin from "@/main";

/**
 * Resolve context, run a deterministic KOS workflow, and open the result modal.
 *
 * @param plugin - Active plugin instance
 * @param workflowId - Workflow identifier to execute
 */
export async function launchKOSWorkflow(
  plugin: CopilotPlugin,
  workflowId: KOSWorkflowId
): Promise<void> {
  const workflow = getKOSWorkflowDefinition(workflowId);

  try {
    if (workflowId === "cleanup") {
      const { proposal, scanResult } = await prepareCleanupProposal(plugin);
      if (proposal.scannedItemCount === 0) {
        new Notice("01 Inbox is empty or does not exist in this vault.");
        return;
      }

      await new Promise<void>((resolve) => {
        new KOSCleanupProposalModal(plugin.app, proposal, (decision) => {
          void (async () => {
            try {
              if (decision.outcome === "cancel") {
                resolve();
                return;
              }

              const executionResult = await applyCleanupDecision(proposal, decision, scanResult);
              const noticePrefix = executionResult.dryRun
                ? "Cleanup dry run finished"
                : "Cleanup finished";
              new Notice(`${noticePrefix}. Log: ${executionResult.logPath}`);
            } catch (error) {
              logError(`Failed to run KOS workflow ${workflow.id}`, error);
              new Notice(
                `Failed to run the ${workflow.label} workflow. Check the log for details.`
              );
            }
            resolve();
          })();
        }).open();
      });
      return;
    }

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
  await launchKOSWorkflow(plugin, workflowId);
}
