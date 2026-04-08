import { logInfo } from "@/logger";
import {
  fetchUrlAsMarkdown,
  formatOllamaCloudWebSearchResults,
  ollamaCloudWebSearch,
} from "@/services/ollama/ollamaCloud";
import { htmlToMarkdown } from "@/services/webViewerService/webViewerServiceHelpers";
import { turnOnPlus } from "@/plusUtils";

export interface RerankResponse {
  response: {
    object: string;
    data: Array<{
      relevance_score: number;
      index: number;
    }>;
    model: string;
    usage: {
      total_tokens: number;
    };
  };
  elapsed_time_ms: number;
}

export interface ToolCall {
  tool: any;
  args: any;
}

export interface Url4llmResponse {
  response: string;
  elapsed_time_ms: number;
}

export interface Pdf4llmResponse {
  response: string;
  elapsed_time_ms: number;
}

export interface Docs4llmResponse {
  response: any;
  elapsed_time_ms: number;
}

export interface WebSearchResponse {
  response: {
    choices: [
      {
        message: {
          content: string;
        };
      },
    ];
    citations: string[];
  };
  elapsed_time_ms: number;
}

export interface Youtube4llmResponse {
  response: {
    transcript: string;
  };
  elapsed_time_ms: number;
}

export interface Twitter4llmResponse {
  response: string;
  elapsed_time_ms: number;
}

export interface LicenseResponse {
  is_valid: boolean;
  plan: string;
}

function decodeText(binaryContent: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(binaryContent);
}

function overlapScore(query: string, document: string): number {
  const queryTerms = new Set(
    query
      .toLowerCase()
      .split(/\W+/)
      .map((term) => term.trim())
      .filter(Boolean)
  );
  if (queryTerms.size === 0) {
    return 0;
  }

  const documentTerms = new Set(
    document
      .toLowerCase()
      .split(/\W+/)
      .map((term) => term.trim())
      .filter(Boolean)
  );

  let matches = 0;
  queryTerms.forEach((term) => {
    if (documentTerms.has(term)) {
      matches += 1;
    }
  });

  return matches / queryTerms.size;
}

function normalizeDocumentContent(binaryContent: ArrayBuffer, fileType: string): any {
  const normalizedType = fileType.toLowerCase();
  const text = decodeText(binaryContent);

  if (["txt", "md", "csv", "tsv", "json", "xml", "svg"].includes(normalizedType)) {
    return text;
  }

  if (["html", "htm", "web"].includes(normalizedType)) {
    return htmlToMarkdown(text, "https://localhost/");
  }

  throw new Error(
    `${normalizedType.toUpperCase()} processing is not implemented in the KOS2 bootstrap yet.`
  );
}

export class BrevilabsClient {
  private static instance: BrevilabsClient;
  private pluginVersion: string = "Unknown";

  static getInstance(): BrevilabsClient {
    if (!BrevilabsClient.instance) {
      BrevilabsClient.instance = new BrevilabsClient();
    }
    return BrevilabsClient.instance;
  }

  setPluginVersion(pluginVersion: string) {
    this.pluginVersion = pluginVersion;
  }

  async validateLicenseKey(
    _context?: Record<string, any>
  ): Promise<{ isValid: boolean | undefined; plan?: string }> {
    turnOnPlus();
    return { isValid: true, plan: "kos2" };
  }

  async rerank(query: string, documents: string[]): Promise<RerankResponse> {
    const startTime = Date.now();
    const data = documents
      .map((document, index) => ({
        relevance_score: overlapScore(query, document),
        index,
      }))
      .sort((left, right) => right.relevance_score - left.relevance_score);

    return {
      response: {
        object: "list",
        data,
        model: "kos2-overlap-reranker",
        usage: {
          total_tokens: 0,
        },
      },
      elapsed_time_ms: Date.now() - startTime,
    };
  }

  async url4llm(url: string): Promise<Url4llmResponse> {
    const startTime = Date.now();
    const content = await fetchUrlAsMarkdown(url);

    return {
      response: content,
      elapsed_time_ms: Date.now() - startTime,
    };
  }

  async pdf4llm(_binaryContent: ArrayBuffer): Promise<Pdf4llmResponse> {
    throw new Error(
      "PDF processing is not implemented in the KOS2 bootstrap yet. Use local self-host processing or add a dedicated parser in the BMAD implementation phase."
    );
  }

  async docs4llm(binaryContent: ArrayBuffer, fileType: string): Promise<Docs4llmResponse> {
    const startTime = Date.now();
    const response = normalizeDocumentContent(binaryContent, fileType);

    return {
      response,
      elapsed_time_ms: Date.now() - startTime,
    };
  }

  async webSearch(query: string): Promise<WebSearchResponse> {
    const startTime = Date.now();
    const searchResults = await ollamaCloudWebSearch(query);
    const formatted = formatOllamaCloudWebSearchResults(searchResults);

    logInfo(`[KOS2 webSearch] ${searchResults.length} results using Ollama Cloud`, {
      pluginVersion: this.pluginVersion,
    });

    return {
      response: {
        choices: [
          {
            message: {
              content: formatted.content,
            },
          },
        ],
        citations: formatted.citations,
      },
      elapsed_time_ms: Date.now() - startTime,
    };
  }

  async youtube4llm(_url: string): Promise<Youtube4llmResponse> {
    throw new Error(
      "YouTube transcript processing is not implemented in the KOS2 bootstrap yet. Wire a dedicated transcript provider in the BMAD implementation phase."
    );
  }

  async twitter4llm(url: string): Promise<Twitter4llmResponse> {
    const startTime = Date.now();
    const content = await fetchUrlAsMarkdown(url);

    return {
      response: content,
      elapsed_time_ms: Date.now() - startTime,
    };
  }
}
