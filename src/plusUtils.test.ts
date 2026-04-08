jest.mock("@/aiParams", () => ({
  setChainType: jest.fn(),
  setModelKey: jest.fn(),
}));

jest.mock("@/chainFactory", () => ({
  ChainType: {
    LLM_CHAIN: "llm_chain",
    VAULT_QA_CHAIN: "vault_qa",
    COPILOT_PLUS_CHAIN: "copilot_plus",
    PROJECT_CHAIN: "project",
  },
}));

jest.mock("@/logger", () => ({
  logInfo: jest.fn(),
}));

import { setChainType, setModelKey } from "@/aiParams";
import { ChainType } from "@/chainFactory";
import { ChatModelProviders, EmbeddingModelProviders } from "@/constants";
import {
  DEFAULT_COPILOT_PLUS_CHAT_MODEL_KEY,
  DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL_KEY,
  applyPlusSettings,
  getLocalTranscriptSetup,
  getOllamaCatalogRecommendations,
  hasTranscriptApiKeyConfigured,
  refreshSelfHostModeValidation,
  validateSelfHostMode,
} from "@/plusUtils";
import { getSettings, resetSettings, updateSetting } from "@/settings/model";

describe("plusUtils compatibility shim", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSettings();
    updateSetting("activeModels", [
      {
        name: DEFAULT_COPILOT_PLUS_CHAT_MODEL_KEY.split("|")[0],
        provider: ChatModelProviders.OLLAMA,
        enabled: true,
        projectEnabled: true,
      },
    ]);
    updateSetting("activeEmbeddingModels", [
      {
        name: DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL_KEY.split("|")[0],
        provider: EmbeddingModelProviders.OLLAMA,
        enabled: true,
        isEmbeddingModel: true,
      },
    ]);
  });

  it("applies the KOS2 Ollama defaults for the agent runtime", () => {
    applyPlusSettings();

    expect(setModelKey).toHaveBeenCalledWith(DEFAULT_COPILOT_PLUS_CHAT_MODEL_KEY);
    expect(setChainType).toHaveBeenCalledWith(ChainType.COPILOT_PLUS_CHAIN);
    expect(getSettings().defaultModelKey).toBe(DEFAULT_COPILOT_PLUS_CHAT_MODEL_KEY);
    expect(getSettings().embeddingModelKey).toBe(DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL_KEY);
    expect(getSettings().defaultChainType).toBe(ChainType.COPILOT_PLUS_CHAIN);
    expect(getSettings().isPlusUser).toBe(true);
  });

  it("marks self-host mode as validated", async () => {
    await validateSelfHostMode();

    expect(getSettings().selfHostValidationCount).toBeGreaterThanOrEqual(1);
    expect(getSettings().selfHostModeValidatedAt).not.toBeNull();
  });

  it("does not mutate validation metadata when self-host mode is disabled", async () => {
    updateSetting("selfHostValidationCount", 0);
    updateSetting("selfHostModeValidatedAt", null);

    await refreshSelfHostModeValidation();

    expect(getSettings().selfHostValidationCount).toBe(0);
    expect(getSettings().selfHostModeValidatedAt).toBeNull();
  });

  it("backfills validation metadata when self-host mode is enabled", async () => {
    updateSetting("enableSelfHostMode", true);
    updateSetting("selfHostValidationCount", 0);
    updateSetting("selfHostModeValidatedAt", null);

    await refreshSelfHostModeValidation();

    expect(getSettings().selfHostValidationCount).toBe(1);
    expect(getSettings().selfHostModeValidatedAt).not.toBeNull();
  });

  it("returns a curated Ollama catalog with profile-aware recommendations", () => {
    const balancedCatalog = getOllamaCatalogRecommendations("balanced");

    expect(balancedCatalog.find((entry) => entry.id === "chat-balanced")?.recommended).toBe(true);
    expect(balancedCatalog.find((entry) => entry.id === "chat-fast")?.recommended).toBe(false);
    expect(balancedCatalog.find((entry) => entry.id === "embed-standard")?.command).toBe(
      "ollama pull bge-m3"
    );
    expect(balancedCatalog.find((entry) => entry.id === "embed-light")?.recommended).toBe(false);
  });

  it("reports transcript capability only when a transcript API key is configured", () => {
    expect(hasTranscriptApiKeyConfigured()).toBe(false);

    updateSetting("supadataApiKey", "test-transcript-key");

    expect(hasTranscriptApiKeyConfigured()).toBe(true);
  });

  it("returns copy-ready local transcript setup commands", () => {
    const setup = getLocalTranscriptSetup();

    expect(setup.installCommand).toContain("yt-dlp");
    expect(setup.installCommand).toContain("openai-whisper");
    expect(setup.exampleCommand).toContain("whisper --model medium");
  });
});
