import React from "react";
import { App, Modal } from "obsidian";
import { createRoot } from "react-dom/client";
import { Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { navigateToPlusPage } from "@/plusUtils";
import { PLUS_UTM_MEDIUMS } from "@/constants";
import { ExternalLink } from "lucide-react";
import { getSettings } from "@/settings/model";

function CopilotPlusExpiredModalContent({ onCancel }: { onCancel: () => void }) {
  const settings = getSettings();
  const hasLocalRuntime = Boolean(settings.defaultModelKey || settings.embeddingModelKey);

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <div>
          KOS2 now expects a local Ollama runtime. If you still have an older configuration, open
          settings, sync the local inventory, and choose a real model from your machine.
        </div>
        {hasLocalRuntime && (
          <div className="tw-text-sm tw-text-warning">
            Your current model selection should be checked against the local Ollama inventory.
            Refresh the local models in Settings to make sure the runtime matches what is actually
            installed.
          </div>
        )}
      </div>
      <div className="tw-flex tw-w-full tw-justify-end tw-gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Close
        </Button>
        <Button
          variant="default"
          onClick={() => {
            navigateToPlusPage(PLUS_UTM_MEDIUMS.EXPIRED_MODAL);
          }}
        >
          Open Ollama setup <ExternalLink className="tw-size-4" />
        </Button>
      </div>
    </div>
  );
}

export class CopilotPlusExpiredModal extends Modal {
  private root: Root;

  constructor(app: App) {
    super(app);
    // https://docs.obsidian.md/Reference/TypeScript+API/Modal/setTitle
    // @ts-ignore
    this.setTitle("Ollama runtime update");
  }

  onOpen() {
    const { contentEl } = this;
    this.root = createRoot(contentEl);

    const handleCancel = () => {
      this.close();
    };

    this.root.render(<CopilotPlusExpiredModalContent onCancel={handleCancel} />);
  }

  onClose() {
    this.root.unmount();
  }
}
