import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KOSWorkflowId } from "@/kos/workflows";
import { cn } from "@/lib/utils";
import {
  getVisibleChatModels,
  getVisibleEmbeddingModels,
  useSettingsValue,
} from "@/settings/model";
import { ArrowRight, PlusCircle, TriangleAlert } from "lucide-react";
import { App, MarkdownView } from "obsidian";
import React, { useMemo } from "react";

interface StarterPath {
  workflowId: KOSWorkflowId;
  title: string;
  summary: string;
}

const STARTER_PATHS: StarterPath[] = [
  {
    workflowId: "organise",
    title: "Organise",
    summary: "Sort a note into PARA.",
  },
  {
    workflowId: "next-steps",
    title: "Next steps",
    summary: "Extract actions and blockers.",
  },
  {
    workflowId: "decision",
    title: "Decision",
    summary: "Draft a decision from evidence.",
  },
  {
    workflowId: "review",
    title: "Review",
    summary: "Close the loop on outcomes.",
  },
];

const PRIMARY_STARTER_PATH = STARTER_PATHS[0]!;
const SECONDARY_STARTER_PATHS = STARTER_PATHS.slice(1);

/**
 * Check whether the current workspace state can support deterministic KOS workflows.
 *
 * @param app - Obsidian app instance
 * @returns True when an active markdown note is available
 */
function hasRunnableWorkflowNote(app: App): boolean {
  const activeView = app.workspace.getActiveViewOfType(MarkdownView);
  const activeFile = activeView?.file ?? app.workspace.getActiveFile();
  return typeof activeFile?.extension === "string" && activeFile.extension === "md";
}

function ReadinessBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "tw-flex tw-items-center tw-gap-1 tw-rounded-full tw-px-2 tw-py-1 tw-text-[11px]",
        tone === "good" && "tw-text-success",
        tone === "warn" && "tw-text-warning"
      )}
    >
      <span className="tw-font-medium">{label}:</span>
      <span>{value}</span>
    </Badge>
  );
}

interface SuggestedPromptsProps {
  app: App;
  onRunWorkflow: (workflowId: KOSWorkflowId) => void;
  onRunSetupCheck?: () => void;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  app,
  onRunWorkflow,
  onRunSetupCheck,
}) => {
  const settings = useSettingsValue();
  const chatModels = getVisibleChatModels(settings);
  const embeddingModels = getVisibleEmbeddingModels(settings);
  const hasActiveMarkdownNote = hasRunnableWorkflowNote(app);

  const readiness = useMemo(
    () => ({
      runtime: chatModels.length > 0 ? "Synced" : "Needs models",
      knowledge: settings.enableSemanticSearchV3
        ? embeddingModels.length > 0
          ? "Embeddings ready"
          : "Needs embedding model"
        : "Off",
      chatCount: chatModels.length,
      embeddingCount: embeddingModels.length,
      privacy: settings.privacyLocalMode ? "Local" : "Hybrid",
      activeNote: hasActiveMarkdownNote ? "Ready" : "Needed",
    }),
    [
      chatModels.length,
      embeddingModels.length,
      hasActiveMarkdownNote,
      settings.enableSemanticSearchV3,
      settings.privacyLocalMode,
    ]
  );

  return (
    <section className="tw-flex tw-flex-col tw-gap-4">
      <Card className="tw-border tw-bg-transparent tw-shadow-none tw-border-border/70">
        <CardContent className="tw-flex tw-flex-col tw-gap-4 tw-p-4">
          <div className="tw-flex tw-flex-col tw-gap-2">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.18em] tw-text-muted">
                  KOS starter
                </div>
                <div className="tw-text-xl tw-font-semibold tw-text-normal">
                  Organise this note first
                </div>
              </div>
              <div className="tw-flex tw-flex-wrap tw-justify-end tw-gap-2">
                <ReadinessBadge
                  label="Local Ollama"
                  value={readiness.runtime}
                  tone={readiness.runtime === "Synced" ? "good" : "warn"}
                />
                <ReadinessBadge
                  label="Semantic search"
                  value={readiness.knowledge}
                  tone={
                    readiness.knowledge === "Embeddings ready"
                      ? "good"
                      : readiness.knowledge === "Off"
                        ? undefined
                        : "warn"
                  }
                />
              </div>
            </div>
            <p className="tw-max-w-2xl tw-text-sm tw-leading-relaxed tw-text-muted">
              Start with one deterministic action on the active note. Add next steps, decisions,
              reviews, and semantic search after the local path is proven.
            </p>
          </div>

          <button
            type="button"
            disabled={!hasActiveMarkdownNote}
            onClick={() => onRunWorkflow(PRIMARY_STARTER_PATH.workflowId)}
            className={cn(
              "tw-group tw-flex tw-min-h-[116px] tw-flex-col tw-justify-between tw-gap-4 tw-rounded-xl tw-border tw-border-interactive-accent tw-p-4 tw-text-left tw-transition-colors tw-bg-accent/10 hover:tw-bg-accent/10",
              !hasActiveMarkdownNote && "tw-cursor-not-allowed tw-opacity-60 hover:tw-bg-accent/10"
            )}
          >
            <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-text-lg tw-font-semibold tw-text-normal">
                  {PRIMARY_STARTER_PATH.title}
                </div>
                <div className="tw-text-sm tw-leading-snug tw-text-muted">
                  {PRIMARY_STARTER_PATH.summary}
                </div>
              </div>
              <PlusCircle className="tw-size-5 tw-shrink-0 tw-text-accent" />
            </div>
            <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-medium tw-text-accent">
              <span>{hasActiveMarkdownNote ? "Run Organise" : "Open a note to run"}</span>
              <ArrowRight className="tw-size-4" />
            </div>
          </button>

          <div className="tw-grid tw-gap-3 md:tw-grid-cols-3">
            {SECONDARY_STARTER_PATHS.map((path) => (
              <button
                key={path.title}
                type="button"
                disabled={!hasActiveMarkdownNote}
                onClick={() => onRunWorkflow(path.workflowId)}
                className={cn(
                  "tw-group tw-flex tw-min-h-[96px] tw-flex-col tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-border tw-p-4 tw-text-left tw-transition-colors tw-bg-secondary/20 hover:tw-border-interactive-accent hover:tw-bg-accent/10",
                  !hasActiveMarkdownNote &&
                    "tw-cursor-not-allowed tw-opacity-60 hover:tw-border-border hover:tw-bg-secondary/20"
                )}
              >
                <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
                  <div className="tw-flex tw-flex-col tw-gap-1">
                    <div className="tw-text-base tw-font-semibold tw-text-normal">{path.title}</div>
                    <div className="tw-text-sm tw-leading-snug tw-text-muted">{path.summary}</div>
                  </div>
                  <PlusCircle className="tw-size-4 tw-shrink-0 tw-text-muted group-hover:tw-text-accent" />
                </div>
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-medium tw-text-accent">
                  <span>{hasActiveMarkdownNote ? "Run workflow" : "Open a note to run"}</span>
                  <ArrowRight className="tw-size-3.5" />
                </div>
              </button>
            ))}
          </div>

          <div className="tw-flex tw-flex-wrap tw-gap-2 tw-border-t tw-pt-4 tw-border-border/70">
            <ReadinessBadge
              label="Chat models"
              value={`${readiness.chatCount}`}
              tone={readiness.chatCount > 0 ? "good" : "warn"}
            />
            <ReadinessBadge
              label="Embedding models"
              value={`${readiness.embeddingCount}`}
              tone={readiness.embeddingCount > 0 ? "good" : "warn"}
            />
            <ReadinessBadge
              label="Active note"
              value={readiness.activeNote}
              tone={hasActiveMarkdownNote ? "good" : "warn"}
            />
            <ReadinessBadge label="Privacy" value={readiness.privacy} />
            <Badge variant="outline" className="tw-rounded-full tw-px-2 tw-py-1 tw-text-[11px]">
              PARA + SI ready path
            </Badge>
          </div>

          {readiness.runtime !== "Synced" && (
            <div className="tw-flex tw-flex-col tw-gap-3 tw-rounded-lg tw-border tw-p-3 tw-text-sm tw-text-warning tw-bg-warning/10 tw-border-warning/50 sm:tw-flex-row sm:tw-items-start sm:tw-justify-between">
              <div className="tw-flex tw-items-start tw-gap-2">
                <TriangleAlert className="tw-mt-0.5 tw-size-4 tw-shrink-0" />
                <span>
                  Run the setup check before relying on chat. KOS2 can still help you map the vault
                  structure and prepare the workflow.
                </span>
              </div>
              {onRunSetupCheck && (
                <Button variant="secondary" size="sm" onClick={onRunSetupCheck}>
                  Run setup check
                </Button>
              )}
            </div>
          )}

          {!hasActiveMarkdownNote && (
            <div className="tw-flex tw-items-start tw-gap-2 tw-rounded-lg tw-border tw-p-3 tw-text-sm tw-text-warning tw-bg-warning/10 tw-border-warning/50">
              <TriangleAlert className="tw-mt-0.5 tw-size-4 tw-shrink-0" />
              <span>Open a markdown note first. KOS workflows run on the active note context.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {settings.enableSemanticSearchV3 && readiness.knowledge !== "Embeddings ready" && (
        <div className="tw-rounded-lg tw-border tw-p-3 tw-text-sm tw-text-warning tw-bg-warning/10 tw-border-warning/40">
          Semantic search is enabled but no embedding model is ready yet. Pick a local embedding
          model and rebuild the index when you are ready.
        </div>
      )}

      {!settings.enableSemanticSearchV3 && (
        <div className="tw-rounded-lg tw-border tw-border-border tw-bg-transparent tw-p-3 tw-text-sm tw-text-muted">
          Knowledge search is off for now. You can still use KOS2 to organise notes and draft
          decisions without building an index.
        </div>
      )}
    </section>
  );
};
