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
});
