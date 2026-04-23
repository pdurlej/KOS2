import { ChatModelProviders, DEFAULT_SETTINGS, VAULT_VECTOR_STORE_STRATEGY } from "@/constants";
import { buildDisableAdvancedFeaturesPatch, buildResetSetupStatePatch } from "@/kos/recovery";

describe("KOS2 recovery patches", () => {
  it("resets setup state without touching keys", () => {
    const patch = buildResetSetupStatePatch();

    expect(patch).toEqual({
      hasSeenOllamaOnboarding: false,
      lastKOSSetupCheckAt: null,
      lastKOSSetupCheckStatus: null,
    });
    expect(patch).not.toHaveProperty("ollamaCloudApiKey");
  });

  it("disables advanced features without changing local models", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      ollamaCloudApiKey: "secret-key",
      enableAutonomousAgent: true,
      enableSemanticSearchV3: true,
      enableSelfHostMode: true,
      enableMiyo: true,
      autonomousAgentEnabledToolIds: ["localSearch", "webSearch", "readNote"],
      activeModels: [
        {
          name: "qwen3:8b",
          provider: ChatModelProviders.OLLAMA,
          enabled: true,
        },
      ],
    };

    const patch = buildDisableAdvancedFeaturesPatch(settings as any);

    expect(patch).toMatchObject({
      enableAutonomousAgent: false,
      enableSemanticSearchV3: false,
      enableSelfHostMode: false,
      enableMiyo: false,
      indexVaultToVectorStore: VAULT_VECTOR_STORE_STRATEGY.NEVER,
      autonomousAgentEnabledToolIds: ["localSearch", "readNote"],
    });
    expect(patch).not.toHaveProperty("ollamaCloudApiKey");
    expect(patch).not.toHaveProperty("activeModels");
  });
});
