import { ChatModelProviders, DEFAULT_SETTINGS, EmbeddingModelProviders } from "@/constants";
import { runKOSDoctor, summarizeKOSDoctorChecks } from "@/kos/doctor/service";

describe("runKOSDoctor", () => {
  it("returns fail for unreachable Ollama without throwing", async () => {
    const report = await runKOSDoctor({
      settings: DEFAULT_SETTINGS,
      fetchModelNames: async () => {
        throw new Error("connection refused");
      },
    });

    expect(report.summaryStatus).toBe("fail");
    expect(report.checks.find((check) => check.id === "ollama-reachable")?.status).toBe("fail");
  });

  it("distinguishes missing chat model from available embedding model", async () => {
    const report = await runKOSDoctor({
      settings: {
        ...DEFAULT_SETTINGS,
        activeEmbeddingModels: [
          {
            name: "bge-m3:latest",
            provider: EmbeddingModelProviders.OLLAMA,
            enabled: true,
            isEmbeddingModel: true,
          },
        ],
      },
      fetchModelNames: async () => ["bge-m3:latest"],
    });

    expect(report.checks.find((check) => check.id === "local-chat-model")?.status).toBe("fail");
    expect(report.checks.find((check) => check.id === "local-embedding-model")?.status).toBe(
      "pass"
    );
  });

  it("keeps chat ready when embedding model is missing", async () => {
    const report = await runKOSDoctor({
      settings: {
        ...DEFAULT_SETTINGS,
        activeModels: [
          {
            name: "qwen3:8b",
            provider: ChatModelProviders.OLLAMA,
            enabled: true,
            isEmbeddingModel: false,
          },
        ],
      },
      fetchModelNames: async () => ["qwen3:8b"],
    });

    expect(report.checks.find((check) => check.id === "local-chat-model")?.status).toBe("pass");
    expect(report.checks.find((check) => check.id === "local-embedding-model")?.status).toBe(
      "warn"
    );
    expect(summarizeKOSDoctorChecks(report.checks)).toBe("warn");
  });

  it("fails chat readiness when a saved chat model is no longer installed locally", async () => {
    const report = await runKOSDoctor({
      settings: {
        ...DEFAULT_SETTINGS,
        activeModels: [
          {
            name: "qwen3:8b",
            provider: ChatModelProviders.OLLAMA,
            enabled: true,
            isEmbeddingModel: false,
          },
        ],
      },
      fetchModelNames: async () => ["bge-m3:latest"],
    });

    const chatCheck = report.checks.find((check) => check.id === "local-chat-model");

    expect(chatCheck?.status).toBe("fail");
    expect(chatCheck?.action.type).toBe("sync-models");
    expect(chatCheck?.message).toContain("not installed");
  });

  it("warns when a saved embedding model is no longer installed locally", async () => {
    const report = await runKOSDoctor({
      settings: {
        ...DEFAULT_SETTINGS,
        activeModels: [
          {
            name: "qwen3:8b",
            provider: ChatModelProviders.OLLAMA,
            enabled: true,
            isEmbeddingModel: false,
          },
        ],
        activeEmbeddingModels: [
          {
            name: "bge-m3:latest",
            provider: EmbeddingModelProviders.OLLAMA,
            enabled: true,
            isEmbeddingModel: true,
          },
        ],
      },
      fetchModelNames: async () => ["qwen3:8b"],
    });

    const embeddingCheck = report.checks.find((check) => check.id === "local-embedding-model");

    expect(embeddingCheck?.status).toBe("warn");
    expect(embeddingCheck?.action.type).toBe("sync-models");
    expect(embeddingCheck?.message).toContain("not installed");
  });

  it("does not report saved chat models as ready when local Ollama is unreachable", async () => {
    const report = await runKOSDoctor({
      settings: {
        ...DEFAULT_SETTINGS,
        activeModels: [
          {
            name: "qwen3:8b",
            provider: ChatModelProviders.OLLAMA,
            enabled: true,
            isEmbeddingModel: false,
          },
        ],
      },
      fetchModelNames: async () => {
        throw new Error("connection refused");
      },
    });

    const chatCheck = report.checks.find((check) => check.id === "local-chat-model");

    expect(chatCheck?.status).toBe("fail");
    expect(chatCheck?.action.type).toBe("retry");
    expect(chatCheck?.message).toContain("unreachable");
  });

  it("accepts omitted latest tag when Ollama reports the explicit latest tag", async () => {
    const report = await runKOSDoctor({
      settings: {
        ...DEFAULT_SETTINGS,
        activeModels: [
          {
            name: "qwen3",
            provider: ChatModelProviders.OLLAMA,
            enabled: true,
            isEmbeddingModel: false,
          },
        ],
      },
      fetchModelNames: async () => ["qwen3:latest"],
    });

    expect(report.checks.find((check) => check.id === "local-chat-model")?.status).toBe("pass");
  });
});
