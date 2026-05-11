import { ChatModelProviders, SettingKeyProviders } from "@/constants";
import { logError } from "@/logger";

/**
 * Standard model interface definition - for frontend display
 */
export interface StandardModel {
  id: string; // Model unique identifier
  name: string; // Model display name
  provider: SettingKeyProviders; // Provider
}

// Response type mapping
export interface ProviderResponseMap {
  [ChatModelProviders.COPILOT_PLUS]: null;
}

// Adapter type definition - converts provider-specific models to standard format
export type ModelAdapter<T extends SettingKeyProviders> = (
  data: ProviderResponseMap[T]
) => StandardModel[];

// Create adapter function type
export type ProviderModelAdapters = {
  [K in SettingKeyProviders]?: ModelAdapter<K>;
};

/**
 * Provider model adapters - converts different provider model data to standard format
 * These adapters extract model information from API responses and return in a unified format
 */
export const providerAdapters: ProviderModelAdapters = {};

/**
 * Default model adapter - handles unknown provider or format model data
 * Attempts to detect common data structure patterns and extract relevant information
 */
export const getDefaultModelAdapter = (provider: SettingKeyProviders) => {
  return (data: any): StandardModel[] => {
    // Try to detect common data structure patterns
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((model: any) => ({
        id: model.id || model.name || String(Math.random()),
        name: model.name || model.id || model.display_name || "Unknown Model",
        provider: provider,
      }));
    } else if (data.models && Array.isArray(data.models)) {
      return data.models.map((model: any) => ({
        id: model.id || model.name || String(Math.random()),
        name: model.name || model.displayName || model.id || "Unknown Model",
        provider: provider,
      }));
    } else if (Array.isArray(data)) {
      return data.map((model: any) => ({
        id: model.id || model.name || String(Math.random()),
        name: model.name || model.id || "Unknown Model",
        provider: provider,
      }));
    }
    return [];
  };
};

/**
 * Get adapter function
 * Uses provider-specific adapter if available, otherwise falls back to default adapter
 */
export const getModelAdapter = (provider: SettingKeyProviders) => {
  return providerAdapters[provider] || getDefaultModelAdapter(provider);
};

/**
 * Parse model data and convert to standard format
 */
export const parseModelsResponse = (provider: SettingKeyProviders, data: any): StandardModel[] => {
  const adapter = getModelAdapter(provider);
  try {
    return adapter(data);
  } catch (error) {
    logError(`Error parsing ${provider} model data:`, error);
    return [];
  }
};
