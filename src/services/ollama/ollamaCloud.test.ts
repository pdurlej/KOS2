jest.mock("@/encryptionService", () => ({
  getDecryptedKey: jest.fn(),
}));

jest.mock("@/settings/model", () => ({
  getSettings: jest.fn(),
}));

import { getDecryptedKey } from "@/encryptionService";
import { getSettings } from "@/settings/model";
import { getOllamaCloudApiKey } from "@/services/ollama/ollamaCloud";

describe("getOllamaCloudApiKey", () => {
  const mockedGetDecryptedKey = getDecryptedKey as jest.MockedFunction<typeof getDecryptedKey>;
  const mockedGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;
  const originalPlatform = process.platform;
  const originalUser = process.env.USER;
  const originalEnvKey = process.env.OLLAMA_API_KEY;
  const originalWindowRequire = (window as unknown as { require?: unknown }).require;

  beforeAll(() => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "darwin",
    });
  });

  afterAll(() => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: originalPlatform,
    });

    if (originalUser === undefined) {
      delete process.env.USER;
    } else {
      process.env.USER = originalUser;
    }

    if (originalEnvKey === undefined) {
      delete process.env.OLLAMA_API_KEY;
    } else {
      process.env.OLLAMA_API_KEY = originalEnvKey;
    }

    if (originalWindowRequire === undefined) {
      delete (window as unknown as { require?: unknown }).require;
    } else {
      (window as unknown as { require?: unknown }).require = originalWindowRequire;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSettings.mockReturnValue({
      ollamaCloudApiKey: "",
    } as ReturnType<typeof getSettings>);
    mockedGetDecryptedKey.mockResolvedValue("");
    delete process.env.OLLAMA_API_KEY;
    process.env.USER = "pd";
    delete (window as unknown as { require?: unknown }).require;
  });

  it("prefers the decrypted plugin setting over env and keychain", async () => {
    mockedGetSettings.mockReturnValue({
      ollamaCloudApiKey: "encrypted-setting",
    } as ReturnType<typeof getSettings>);
    mockedGetDecryptedKey.mockResolvedValue("settings-key");
    process.env.OLLAMA_API_KEY = "env-key";

    const key = await getOllamaCloudApiKey();

    expect(key).toBe("settings-key");
    expect(mockedGetDecryptedKey).toHaveBeenCalledWith("encrypted-setting");
  });

  it("falls back to OLLAMA_API_KEY when the plugin setting is empty", async () => {
    mockedGetDecryptedKey.mockResolvedValue("");
    process.env.OLLAMA_API_KEY = "env-key";

    const key = await getOllamaCloudApiKey();

    expect(key).toBe("env-key");
  });

  it("falls back to the macOS Keychain when settings and env are empty", async () => {
    mockedGetDecryptedKey.mockResolvedValue("");
    (window as unknown as { require?: (id: string) => unknown }).require = jest
      .fn()
      .mockReturnValue({
        execFile: (
          _file: string,
          _args: string[],
          callback: (error: Error | null, stdout: string) => void
        ) => callback(null, "keychain-key\n"),
      });

    const key = await getOllamaCloudApiKey();

    expect(key).toBe("keychain-key");
  });

  it("returns an empty string when no key source is available", async () => {
    mockedGetDecryptedKey.mockResolvedValue("");
    (window as unknown as { require?: (id: string) => unknown }).require = jest
      .fn()
      .mockReturnValue({
        execFile: (
          _file: string,
          _args: string[],
          callback: (error: Error | null, stdout: string) => void
        ) => callback(new Error("missing"), ""),
      });

    const key = await getOllamaCloudApiKey();

    expect(key).toBe("");
  });
});
