import { KOSWorkflowResult } from "@/kos/workflows/types";
import { preprocessAIResponse } from "@/utils/markdownPreprocess";
import { logError } from "@/logger";
import { App, Component, MarkdownRenderer, Modal, Notice } from "obsidian";

/**
 * Modal used to preview deterministic KOS workflow results without writing files silently.
 */
export class KOSWorkflowResultModal extends Modal {
  private component: Component | null = null;

  constructor(
    app: App,
    private readonly result: KOSWorkflowResult
  ) {
    super(app);
    // @ts-ignore Obsidian injects setTitle at runtime.
    this.setTitle(this.result.title);
  }

  /**
   * Render the workflow summary, action buttons, and markdown preview.
   */
  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("copilot-modal");

    this.component = new Component();
    this.component.load();

    const summaryEl = contentEl.createDiv({ cls: "tw-flex tw-flex-col tw-gap-2" });
    summaryEl.createEl("p", { text: this.result.summary });
    summaryEl.createEl("p", {
      text: `Status: ${this.result.status}. Recommended next step: ${this.result.recommendedNextStep}`,
      cls: "setting-item-description",
    });

    const actionRow = contentEl.createDiv({ cls: "tw-mb-4 tw-flex tw-gap-2" });
    const copyButton = actionRow.createEl("button", {
      text: "Copy Result",
      cls: "mod-cta",
    });
    copyButton.addEventListener("click", () => {
      void this.copyResultToClipboard();
    });

    if (this.result.draftArtifactMarkdown) {
      const copyDraftButton = actionRow.createEl("button", {
        text: "Copy Draft Artifact",
      });
      copyDraftButton.addEventListener("click", () => {
        void this.copyDraftArtifactToClipboard();
      });
    }

    const previewEl = contentEl.createDiv({
      cls: "markdown-rendered",
    });
    previewEl.style.maxHeight = "60vh";
    previewEl.style.overflowY = "auto";
    previewEl.style.padding = "0.5rem 0";

    await MarkdownRenderer.renderMarkdown(
      preprocessAIResponse(this.result.markdown),
      previewEl,
      "",
      this.component
    );
  }

  /**
   * Clean up the markdown rendering component on close.
   */
  onClose(): void {
    this.component?.unload();
    this.component = null;
    this.contentEl.empty();
  }

  /**
   * Copy the rendered markdown result to the clipboard.
   */
  private async copyResultToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.result.markdown);
      new Notice("KOS workflow result copied to clipboard.");
    } catch (error) {
      logError("Failed to copy KOS workflow result", error);
      new Notice("Failed to copy the workflow result.");
    }
  }

  /**
   * Copy only the draft artifact preview to the clipboard.
   */
  private async copyDraftArtifactToClipboard(): Promise<void> {
    if (!this.result.draftArtifactMarkdown) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.result.draftArtifactMarkdown);
      new Notice("KOS draft artifact copied to clipboard.");
    } catch (error) {
      logError("Failed to copy KOS draft artifact", error);
      new Notice("Failed to copy the draft artifact.");
    }
  }
}
