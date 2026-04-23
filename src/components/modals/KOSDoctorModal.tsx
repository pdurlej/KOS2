import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logError } from "@/logger";
import { logFileManager } from "@/logFileManager";
import { flushRecordedPromptPayloadToLog } from "@/LLMProviders/chainRunner/utils/promptPayloadRecorder";
import {
  formatKOSDoctorReport,
  runKOSDoctor,
  summarizeKOSDoctorChecks,
} from "@/kos/doctor/service";
import { KOSDoctorCheck, KOSDoctorReport, KOSDoctorStatus } from "@/kos/doctor/types";
import { updateSetting } from "@/settings/model";
import { AlertTriangle, CheckCircle2, CircleSlash, Loader2, XCircle } from "lucide-react";
import { App, Modal, Notice } from "obsidian";
import React, { useCallback, useEffect, useState } from "react";
import { createRoot, Root } from "react-dom/client";

interface KOSDoctorContentProps {
  app: App;
}

interface ObsidianSettingApi {
  open?: () => void;
  openTabById?: (id: string) => { display?: () => void } | undefined;
}

const STATUS_LABELS: Record<KOSDoctorStatus, string> = {
  pass: "OK",
  warn: "Needs attention",
  fail: "Fix required",
  skipped: "Optional",
};

const STATUS_CLASS_NAMES: Record<KOSDoctorStatus, string> = {
  pass: "tw-text-success",
  warn: "tw-text-warning",
  fail: "tw-text-error",
  skipped: "tw-text-muted",
};

/**
 * Open the KOS2 settings tab without assuming the historical plugin id.
 *
 * @param app - Obsidian app instance.
 */
function openKOSSettings(app: App): void {
  const setting = (app as unknown as { setting?: ObsidianSettingApi }).setting;
  setting?.open?.();
  try {
    const tab = setting?.openTabById?.("kos2") ?? setting?.openTabById?.("copilot");
    tab?.display?.();
  } catch {
    setting?.openTabById?.("copilot")?.display?.();
  }
}

/**
 * Render the icon for a doctor status.
 *
 * @param status - Doctor status.
 * @returns Status icon.
 */
function StatusIcon({ status }: { status: KOSDoctorStatus }): React.ReactElement {
  if (status === "pass") {
    return <CheckCircle2 className="tw-size-4 tw-text-success" />;
  }
  if (status === "warn") {
    return <AlertTriangle className="tw-size-4 tw-text-warning" />;
  }
  if (status === "fail") {
    return <XCircle className="tw-size-4 tw-text-error" />;
  }
  return <CircleSlash className="tw-size-4 tw-text-muted" />;
}

/**
 * Copy doctor diagnostics to the clipboard.
 *
 * @param report - Report to copy.
 */
async function copyDiagnostics(report: KOSDoctorReport): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    new Notice("Clipboard is not available in this environment.", 4000);
    return;
  }

  await navigator.clipboard.writeText(formatKOSDoctorReport(report));
  new Notice("Copied KOS2 diagnostics.", 4000);
}

/**
 * Open the sanitized KOS2 diagnostics log.
 */
async function openDiagnosticsLog(): Promise<void> {
  await flushRecordedPromptPayloadToLog();
  await logFileManager.flush();
  await logFileManager.openLogFile();
}

/**
 * Render a single doctor check row.
 *
 * @param props - Check row props.
 * @returns Doctor check row.
 */
function DoctorCheckRow({
  check,
  app,
  onRetry,
}: {
  check: KOSDoctorCheck;
  app: App;
  onRetry: () => void;
}): React.ReactElement {
  const handleAction = () => {
    if (check.action.type === "retry") {
      onRetry();
      return;
    }

    if (check.action.type === "open-log") {
      void openDiagnosticsLog();
      return;
    }

    if (check.action.type !== "none") {
      openKOSSettings(app);
    }
  };

  return (
    <div className="tw-rounded-lg tw-border tw-border-border tw-p-3 tw-bg-secondary/20">
      <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
        <div className="tw-flex tw-min-w-0 tw-items-start tw-gap-3">
          <StatusIcon status={check.status} />
          <div className="tw-min-w-0 tw-flex-1">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
              <span className="tw-font-medium tw-text-normal">{check.label}</span>
              <Badge variant="outline" className={STATUS_CLASS_NAMES[check.status]}>
                {STATUS_LABELS[check.status]}
              </Badge>
              <Badge variant="secondary">{check.severity}</Badge>
            </div>
            <div className="tw-mt-1 tw-text-sm tw-leading-relaxed tw-text-muted">
              {check.message}
            </div>
          </div>
        </div>
        {check.action.type !== "none" && (
          <Button variant="secondary" size="sm" onClick={handleAction}>
            {check.action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Render the setup doctor modal content.
 *
 * @param props - Content props.
 * @returns Doctor content.
 */
function KOSDoctorContent({ app }: KOSDoctorContentProps): React.ReactElement {
  const [report, setReport] = useState<KOSDoctorReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const nextReport = await runKOSDoctor();
      setReport(nextReport);
      updateSetting("lastKOSSetupCheckAt", nextReport.generatedAt);
      updateSetting("lastKOSSetupCheckStatus", summarizeKOSDoctorChecks(nextReport.checks));
    } catch (error) {
      logError("Unexpected KOS2 doctor failure.", error);
      new Notice("KOS2 setup check failed unexpectedly. Open diagnostics log for details.", 6000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  return (
    <div className="tw-flex tw-max-h-[78vh] tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <div className="tw-text-sm tw-leading-relaxed tw-text-muted">
          This check is manual on purpose. KOS2 does not probe Ollama or rebuild indexes during
          Obsidian startup.
        </div>
        {report && (
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            <Badge variant="outline" className={STATUS_CLASS_NAMES[report.summaryStatus]}>
              Summary: {STATUS_LABELS[report.summaryStatus]}
            </Badge>
            <Badge variant="outline">Models installed: {report.installedModelCount}</Badge>
            <Badge variant="outline">{report.baseUrl}</Badge>
          </div>
        )}
      </div>

      <div className="tw-flex-1 tw-space-y-3 tw-overflow-y-auto tw-pr-1">
        {loading && !report ? (
          <div className="tw-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-border tw-p-4 tw-text-sm tw-text-muted">
            <Loader2 className="tw-size-4 tw-animate-spin" />
            Running setup check...
          </div>
        ) : (
          report?.checks.map((check) => (
            <DoctorCheckRow key={check.id} check={check} app={app} onRetry={runCheck} />
          ))
        )}
      </div>

      <div className="tw-flex tw-flex-wrap tw-justify-end tw-gap-2">
        <Button variant="secondary" onClick={runCheck} disabled={loading}>
          {loading ? <Loader2 className="tw-size-4 tw-animate-spin" /> : "Retry"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => report && void copyDiagnostics(report)}
          disabled={!report}
        >
          Copy diagnostics
        </Button>
        <Button variant="secondary" onClick={() => void openDiagnosticsLog()}>
          Open log file
        </Button>
        <Button variant="default" onClick={() => openKOSSettings(app)}>
          Open settings
        </Button>
      </div>
    </div>
  );
}

export class KOSDoctorModal extends Modal {
  private root: Root | null = null;

  constructor(app: App) {
    super(app);
    // @ts-ignore Obsidian injects setTitle at runtime.
    this.setTitle("KOS2 Doctor");
  }

  /**
   * Mount the doctor content when the modal opens.
   */
  onOpen(): void {
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(<KOSDoctorContent app={this.app} />);
  }

  /**
   * Unmount the doctor content when the modal closes.
   */
  onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
