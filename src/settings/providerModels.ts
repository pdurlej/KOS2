import { SettingKeyProviders } from "@/constants";
import { logError } from "@/logger";

/**
 * Standard model interface definition - for frontend display
 */
export interface StandardModel {
  id: string; // Model unique identifier
  name: string; // Model display name
  provider: SettingKeyProviders; // Provider
}

// Adapter type definition - converts raw API responses to standard format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModelAdapter = (data: any) => StandardModel[];

// Per-provider adapter registry (empty — no cloud providers remain)
export type ProviderModelAdapters = {
  [key: string]: ModelAdapter | undefined;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data: any): StandardModel[] => {
    // Try to detect common data structure patterns
    if (data.data && Array.isArray(data.data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.data.map((model: any) => ({
        id: model.id || model.name || String(Math.random()),
        name: model.name || model.id || model.display_name || "Unknown Model",
        provider: provider,
      }));
    } else if (data.models && Array.isArray(data.models)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.models.map((model: any) => ({
        id: model.id || model.name || String(Math.random()),
        name: model.name || model.displayName || model.id || "Unknown Model",
        provider: provider,
      }));
    } else if (Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseModelsResponse = (provider: SettingKeyProviders, data: any): StandardModel[] => {
  const adapter = getModelAdapter(provider);
  try {
    return adapter(data);
  } catch (error) {
    logError(`Error parsing ${provider} model data:`, error);
    return [];
  }
};
