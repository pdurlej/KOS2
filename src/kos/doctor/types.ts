export type KOSDoctorStatus = "pass" | "warn" | "fail" | "skipped";

export type KOSDoctorSeverity = "required" | "recommended" | "optional";

export type KOSDoctorActionType =
  | "retry"
  | "open-settings"
  | "sync-models"
  | "build-index"
  | "open-log"
  | "none";

export interface KOSDoctorAction {
  label: string;
  type: KOSDoctorActionType;
  targetTab?: "setup" | "knowledge" | "workflows" | "labs";
}

export interface KOSDoctorCheck {
  id: string;
  label: string;
  status: KOSDoctorStatus;
  severity: KOSDoctorSeverity;
  message: string;
  action: KOSDoctorAction;
}

export interface KOSDoctorReport {
  generatedAt: number;
  baseUrl: string;
  installedModelCount: number;
  summaryStatus: Exclude<KOSDoctorStatus, "skipped">;
  checks: KOSDoctorCheck[];
}
