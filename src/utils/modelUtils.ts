import { ChatModelProviders, ProviderSettingsKeyMap, SettingKeyProviders } from "@/constants";
import { getSettings } from "@/settings/model";
import { CustomModel } from "@/aiParams";

/**
 * Check if a provider requires an API key.
 * Local providers (OLLAMA, LM_STUDIO, OPENAI_FORMAT) don't require API keys.
 *
 * @param provider - The provider to check
 * @returns true if the provider requires an API key, false for local providers
 *
 * @example
 * if (providerRequiresApiKey(model.provider)) {
 *   // This is a cloud provider, check for API key
 * } else {
 *   // This is a local provider, no API key needed
 * }
 */
export function providerRequiresApiKey(provider: string): provider is SettingKeyProviders {
  return provider in ProviderSettingsKeyMap;
}

/**
 * Get API key for a provider, with model-specific key taking precedence over global settings.
 *
 * @param provider - The provider to get the API key for
 * @param model - Optional model instance; if provided and has apiKey, it will be used instead of global key
 * @returns The API key (model-specific if available, otherwise global provider key, or empty string)
 *
 * @example
 * // Get global API key for OpenAI
 * const globalKey = getApiKeyForProvider(ChatModelProviders.OPENAI);
 *
 * // Get model-specific key (falls back to global if model.apiKey is empty)
 * const modelKey = getApiKeyForProvider(ChatModelProviders.OPENAI, customModel);
 */
export function getApiKeyForProvider(provider: SettingKeyProviders, model?: CustomModel): string {
  const settings = getSettings();
  return model?.apiKey || (settings[ProviderSettingsKeyMap[provider]] as string | undefined) || "";
}

/**
 * Check whether disabling this model would leave KOS2 without any enabled Ollama chat runtime.
 *
 * @param model - Candidate model being toggled.
 * @param activeModels - Current chat model inventory.
 * @returns true when this is the last enabled Ollama chat model.
 */
export function isLastEnabledOllamaChatModel(
  model: CustomModel,
  activeModels: CustomModel[]
): boolean {
  if (model.provider !== ChatModelProviders.OLLAMA || model.isEmbeddingModel || !model.enabled) {
    return false;
  }

  const enabledOllamaChatModels = activeModels.filter(
    (candidate) =>
      candidate.provider === ChatModelProviders.OLLAMA &&
      candidate.enabled &&
      !candidate.isEmbeddingModel
  );

  return enabledOllamaChatModels.length === 1 && enabledOllamaChatModels[0].name === model.name;
}
