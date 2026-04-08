import { getDecryptedKey } from "@/encryptionService";
import { htmlToMarkdown } from "@/services/webViewerService/webViewerServiceHelpers";
import { getSettings } from "@/settings/model";
import { safeFetchNoThrow } from "@/utils";

const OLLAMA_WEB_SEARCH_URL = "https://ollama.com/api/web_search";
const KOS2_OLLAMA_KEYCHAIN_SERVICE = "cos2-ollama-cloud";

export interface OllamaCloudSearchResult {
  title: string;
  url: string;
  content: string;
}

async function readMacOSKeychainValue(service: string): Promise<string> {
  if (process.platform !== "darwin") {
    return "";
  }

  const account = process.env.USER || "";
  if (!account) {
    return "";
  }

  try {
    const desktopRequire = (window as unknown as { require?: (id: string) => any }).require;
    const childProcess = desktopRequire?.("child_process") as
      | {
          execFile: (
            file: string,
            args: string[],
            callback: (error: Error | null, stdout: string) => void
          ) => void;
        }
      | undefined;

    if (!childProcess?.execFile) {
      return "";
    }

    return await new Promise<string>((resolve) => {
      childProcess.execFile(
        "/usr/bin/security",
        ["find-generic-password", "-a", account, "-s", service, "-w"],
        (error, stdout) => {
          if (error) {
            resolve("");
            return;
          }
          resolve(stdout.trim());
        }
      );
    });
  } catch {
    return "";
  }
}

export async function getOllamaCloudApiKey(): Promise<string> {
  const settingsValue = await getDecryptedKey(getSettings().ollamaCloudApiKey || "");
  if (settingsValue) {
    return settingsValue;
  }

  if (process.env.OLLAMA_API_KEY) {
    return process.env.OLLAMA_API_KEY;
  }

  return readMacOSKeychainValue(KOS2_OLLAMA_KEYCHAIN_SERVICE);
}

export async function ollamaCloudWebSearch(
  query: string,
  maxResults = 5
): Promise<OllamaCloudSearchResult[]> {
  const apiKey = await getOllamaCloudApiKey();
  if (!apiKey) {
    throw new Error(
      "Ollama Cloud API key is not configured. Set OLLAMA_API_KEY, save ollamaCloudApiKey, or add the macOS Keychain item 'cos2-ollama-cloud'."
    );
  }

  const response = await safeFetchNoThrow(OLLAMA_WEB_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama Cloud web search failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  const results = Array.isArray(json?.results) ? json.results : [];

  return results.map((item: Record<string, unknown>) => ({
    title: typeof item.title === "string" ? item.title : "Untitled",
    url: typeof item.url === "string" ? item.url : "",
    content: typeof item.content === "string" ? item.content : "",
  }));
}

export function formatOllamaCloudWebSearchResults(results: OllamaCloudSearchResult[]): {
  content: string;
  citations: string[];
} {
  const citations: string[] = [];
  const content = results
    .map((item) => {
      if (item.url) {
        citations.push(item.url);
      }
      const source = item.url ? `Source: ${item.url}` : "Source: unavailable";
      return `### ${item.title}\n${item.content}\n${source}`;
    })
    .join("\n\n");

  return { content, citations };
}

export async function fetchUrlAsMarkdown(url: string): Promise<string> {
  const response = await safeFetchNoThrow(url, {
    method: "GET",
    headers: {
      Accept: "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8, */*;q=0.5",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`URL fetch failed (${response.status}): ${body}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("html")) {
    return htmlToMarkdown(text, url);
  }

  return text.trim();
}
