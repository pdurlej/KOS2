jest.mock("obsidian", () => {
  const actual = jest.requireActual("obsidian");
  return {
    ...actual,
    requestUrl: jest.fn(),
    Notice: jest.fn(),
  };
});

jest.mock("@/logger", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

import { ChatModelProviders, EmbeddingModelProviders } from "@/constants";
import { getSettings, resetSettings } from "@/settings/model";
import {
  discoverOllamaModels,
  looksLikeOllamaEmbeddingModelName,
  mergeDiscoveredOllamaModels,
  parseOllamaTagsResponse,
  syncDiscoveredOllamaModels,
} from "@/services/ollama/ollamaModelDiscovery";
import { requestUrl } from "obsidian";

describe("ollamaModelDiscovery", () => {
  const mockedRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSettings();
  });

  it("parses unique model names from /api/tags", () => {
    expect(
      parseOllamaTagsResponse({
        models: [{ name: "qwen3:latest" }, { name: "qwen3:latest" }, { name: "bge-m3:latest" }],
      })
    ).toEqual(["qwen3:latest", "bge-m3:latest"]);
  });

  it("recognizes common local embedding model families by name", () => {
    expect(looksLikeOllamaEmbeddingModelName("bge-m3:latest")).toBe(true);
    expect(looksLikeOllamaEmbeddingModelName("mxbai-embed-large:latest")).toBe(true);
    expect(looksLikeOllamaEmbeddingModelName("qwen2.5:7b")).toBe(false);
  });

  it("classifies discovered Ollama models by chat and embedding probe success", async () => {
    mockedRequestUrl.mockResolvedValue({
      json: {
        models: [{ name: "chat-only" }, { name: "embed-only" }, { name: "both" }],
      },
    } as Awaited<ReturnType<typeof requestUrl>>);

    const chatPing = jest.fn(async (model) => {
      if (model.name === "embed-only") {
        throw new Error("chat probe failed");
      }
      return true;
    });
    const embeddingPing = jest.fn(async (model) => {
      if (model.name === "chat-only") {
        throw new Error("embed probe failed");
      }
      return true;
    });

    const result = await discoverOllamaModels({
      baseUrl: "http://127.0.0.1:11434",
      chatPing,
      embeddingPing,
    });

    expect(result.discoveredNames).toEqual(["chat-only", "embed-only", "both"]);
    expect(result.chatModels.map((model) => model.name)).toEqual(["chat-only", "both"]);
    expect(result.embeddingModels.map((model) => model.name)).toEqual(["embed-only", "both"]);
    expect(result.failedModels).toEqual([
      {
        name: "chat-only",
        embeddingError: "embed probe failed",
      },
      {
        name: "embed-only",
        chatError: "chat probe failed",
      },
    ]);
  });

  it("keeps likely embedding families when the embedding probe fails but the name is clearly embedding-oriented", async () => {
    mockedRequestUrl.mockResolvedValue({
      json: {
        models: [{ name: "mxbai-embed-large:latest" }],
      },
    } as Awaited<ReturnType<typeof requestUrl>>);

    const result = await discoverOllamaModels({
      baseUrl: "http://127.0.0.1:11434",
      chatPing: jest.fn(async () => {
        throw new Error("not chat-capable");
      }),
      embeddingPing: jest.fn(async () => {
        throw new Error("embedding probe timed out");
      }),
    });

    expect(result.chatModels).toEqual([]);
    expect(result.embeddingModels.map((model) => model.name)).toEqual(["mxbai-embed-large:latest"]);
    expect(result.failedModels).toEqual([
      {
        name: "mxbai-embed-large:latest",
        chatError: "not chat-capable",
        embeddingError:
          "embedding probe timed out Included as a likely embedding model based on its name.",
      },
    ]);
  });

  it("replaces only the discovery-managed Ollama subset while preserving other model order", () => {
    const merged = mergeDiscoveredOllamaModels(
      [
        { name: "openai-model", provider: "openai", enabled: true },
        { name: "b", provider: ChatModelProviders.OLLAMA, enabled: true },
        { name: "anthropic-model", provider: "anthropic", enabled: true },
        { name: "a", provider: ChatModelProviders.OLLAMA, enabled: true },
      ],
      [
        {
          name: "a",
          provider: ChatModelProviders.OLLAMA,
          enabled: true,
          baseUrl: "http://127.0.0.1:11434",
        },
        {
          name: "b",
          provider: ChatModelProviders.OLLAMA,
          enabled: true,
          baseUrl: "http://127.0.0.1:11434",
        },
        {
          name: "c",
          provider: ChatModelProviders.OLLAMA,
          enabled: true,
          baseUrl: "http://127.0.0.1:11434",
        },
      ]
    );

    expect(merged.map((model) => `${model.name}|${model.provider}`)).toEqual([
      "openai-model|openai",
      "b|ollama",
      "anthropic-model|anthropic",
      "a|ollama",
      "c|ollama",
    ]);
  });

  it("auto-switches stale defaults to the first verified Ollama models during sync", async () => {
    mockedRequestUrl.mockResolvedValue({
      json: {
        models: [{ name: "current-chat" }, { name: "current-embed" }],
      },
    } as Awaited<ReturnType<typeof requestUrl>>);

    const notify = jest.fn();

    await syncDiscoveredOllamaModels({
      settings: {
        ...getSettings(),
        defaultModelKey: "missing-chat|ollama",
        embeddingModelKey: "missing-embed|ollama",
        activeModels: [
          {
            name: "current-chat",
            provider: ChatModelProviders.OLLAMA,
            enabled: true,
            projectEnabled: true,
          },
        ],
        activeEmbeddingModels: [
          {
            name: "current-embed",
            provider: EmbeddingModelProviders.OLLAMA,
            enabled: true,
            isEmbeddingModel: true,
          },
        ],
      },
      chatPing: jest.fn(async (model) => {
        if (model.name !== "current-chat") {
          throw new Error("not chat-capable");
        }
        return true;
      }),
      embeddingPing: jest.fn(async (model) => {
        if (model.name !== "current-embed") {
          throw new Error("not embedding-capable");
        }
        return true;
      }),
      notify,
    });

    expect(getSettings().defaultModelKey).toBe("current-chat|ollama");
    expect(getSettings().embeddingModelKey).toBe("current-embed|ollama");
    expect(notify).toHaveBeenCalledWith(
      "Default chat model 'missing-chat|ollama' is no longer available in local Ollama. Switched to 'current-chat|ollama'."
    );
    expect(notify).toHaveBeenCalledWith(
      "Embedding model 'missing-embed|ollama' is no longer available in local Ollama. Switched to 'current-embed|ollama'."
    );
  });
});
