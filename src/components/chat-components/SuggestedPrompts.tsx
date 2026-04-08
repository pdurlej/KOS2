import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getVisibleChatModels,
  getVisibleEmbeddingModels,
  useSettingsValue,
} from "@/settings/model";
import { ArrowRight, PlusCircle, TriangleAlert } from "lucide-react";
import React, { useMemo } from "react";

interface StarterPath {
  title: string;
  summary: string;
  prompt: string;
}

const STARTER_PATHS: StarterPath[] = [
  {
    title: "Organise",
    summary: "Sort a note into PARA.",
    prompt:
      "Organise this note using PARA and tell me what belongs in Inbox, Project, Area, or Resource.",
  },
  {
    title: "Next steps",
    summary: "Extract actions and blockers.",
    prompt:
      "Read this note and extract the real next steps, blockers, and open questions with traceability.",
  },
  {
    title: "Decision",
    summary: "Draft a decision from evidence.",
    prompt:
      "Draft a decision artifact from this analysis with explicit evidence, rationale, and source traceability.",
  },
  {
    title: "Review",
    summary: "Close the loop on outcomes.",
    prompt:
      "Review this outcome and capture unresolved follow-ups, risks, and the next action to close the loop.",
  },
];

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
  onClick: (text: string) => void;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ onClick }) => {
  const settings = useSettingsValue();
  const chatModels = getVisibleChatModels(settings);
  const embeddingModels = getVisibleEmbeddingModels(settings);

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
    }),
    [chatModels.length, embeddingModels.length, settings.enableSemanticSearchV3]
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
                  Pick a workflow path
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
              Choose a path that matches the work. KOS2 is most useful when you ask it to organise
              notes, extract next steps, draft decisions, or close review loops.
            </p>
          </div>

          <div className="tw-grid tw-gap-3 md:tw-grid-cols-2">
            {STARTER_PATHS.map((path) => (
              <button
                key={path.title}
                type="button"
                onClick={() => onClick(path.prompt)}
                className="hover:tw-border-accent tw-group tw-flex tw-min-h-[104px] tw-flex-col tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-border tw-p-4 tw-text-left tw-transition-colors tw-bg-secondary/20 hover:tw-bg-accent/10"
              >
                <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
                  <div className="tw-flex tw-flex-col tw-gap-1">
                    <div className="tw-text-base tw-font-semibold tw-text-normal">{path.title}</div>
                    <div className="tw-text-sm tw-leading-snug tw-text-muted">{path.summary}</div>
                  </div>
                  <PlusCircle className="tw-size-4 tw-shrink-0 tw-text-muted group-hover:tw-text-accent" />
                </div>
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-medium tw-text-accent">
                  <span>Use path</span>
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
            <Badge variant="outline" className="tw-rounded-full tw-px-2 tw-py-1 tw-text-[11px]">
              PARA + SI ready path
            </Badge>
          </div>

          {readiness.runtime !== "Synced" && (
            <div className="tw-flex tw-items-start tw-gap-2 tw-rounded-lg tw-border tw-p-3 tw-text-sm tw-text-warning tw-bg-warning/10 tw-border-warning/50">
              <TriangleAlert className="tw-mt-0.5 tw-size-4 tw-shrink-0" />
              <span>
                Sync local Ollama models in Settings before relying on chat. KOS2 can still help you
                map the vault structure and prepare the workflow.
              </span>
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
