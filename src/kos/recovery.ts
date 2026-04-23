import { VAULT_VECTOR_STORE_STRATEGY } from "@/constants";
import { CopilotSettings } from "@/settings/model";

/**
 * Build the setup-state reset patch without touching credentials or model inventory.
 *
 * @returns Partial settings patch for first-run readiness state.
 */
export function buildResetSetupStatePatch(): Partial<CopilotSettings> {
  return {
    hasSeenOllamaOnboarding: false,
    lastKOSSetupCheckAt: null,
    lastKOSSetupCheckStatus: null,
  };
}

/**
 * Build the advanced-feature disable patch while preserving local models and credentials.
 *
 * @param settings - Current settings snapshot.
 * @returns Partial settings patch for safe-mode recovery.
 */
export function buildDisableAdvancedFeaturesPatch(
  settings: Readonly<CopilotSettings>
): Partial<CopilotSettings> {
  return {
    enableAutonomousAgent: false,
    enableSemanticSearchV3: false,
    enableSelfHostMode: false,
    enableMiyo: false,
    indexVaultToVectorStore: VAULT_VECTOR_STORE_STRATEGY.NEVER,
    autonomousAgentEnabledToolIds: settings.autonomousAgentEnabledToolIds.filter(
      (toolId) => toolId !== "webSearch"
    ),
  };
}
