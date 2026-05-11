import { CustomModel } from "@/aiParams";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChatModelProviders,
  EmbeddingModelProviders,
  MODEL_CAPABILITIES,
  ModelCapability,
  ProviderMetadata,
  SettingKeyProviders,
} from "@/constants";
import { useTab } from "@/contexts/TabContext";
import { logError } from "@/logger";
import { err2String, getProviderInfo, getProviderLabel } from "@/utils";
import { buildCurlCommandForModel } from "@/utils/curlCommand";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { getApiKeyForProvider } from "@/utils/modelUtils";
import { Notice } from "obsidian";
import React, { useState } from "react";

interface FormErrors {
  name: boolean;
  displayName: boolean;
}

interface ModelAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (model: CustomModel) => void;
  ping: (model: CustomModel) => Promise<boolean>;
  isEmbeddingModel?: boolean;
}

export const ModelAddDialog: React.FC<ModelAddDialogProps> = ({
  open,
  onOpenChange,
  onAdd,
  ping,
  isEmbeddingModel = false,
}) => {
  const { modalContainer } = useTab();
  const defaultProvider = isEmbeddingModel
    ? EmbeddingModelProviders.OLLAMA
    : ChatModelProviders.OPENAI_FORMAT;

  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "success" | "failed">("idle");
  const [errors, setErrors] = useState<FormErrors>({
    name: false,
    displayName: false,
  });

  const setError = (field: keyof FormErrors, value: boolean) => {
    setErrors((prev) => ({ ...prev, [field]: value }));
  };

  const clearErrors = () => {
    setErrors({
      name: false,
      displayName: false,
    });
  };

  const validateFields = (): boolean => {
    let isValid = true;
    const newErrors = { ...errors };

    // Validate name
    newErrors.name = !model.name;
    if (!model.name) isValid = false;

    setErrors(newErrors);
    return isValid;
  };

  const getInitialModel = (provider = defaultProvider): CustomModel => {
    const baseModel = {
      name: "",
      provider,
      enabled: true,
      isBuiltIn: false,
      baseUrl: "",
      apiKey: getApiKeyForProvider(provider as SettingKeyProviders),
      isEmbeddingModel,
      capabilities: [],
    };

    if (!isEmbeddingModel) {
      return {
        ...baseModel,
        stream: true,
      };
    }

    return baseModel;
  };

  const [model, setModel] = useState<CustomModel>(getInitialModel());

  /**
   * Updates model state and resets verify status when connection-related fields change.
   * Use this for fields that affect API connectivity (name, apiKey, baseUrl, etc.)
   */
  const updateModelWithReset = (updates: Partial<CustomModel>) => {
    setModel((prev) => ({ ...prev, ...updates }));
    setVerifyStatus("idle");
  };

  // Clean up model data by trimming whitespace
  const getCleanedModel = (modelData: CustomModel): CustomModel => {
    return {
      ...modelData,
      name: modelData.name?.trim(),
      baseUrl: modelData.baseUrl?.trim(),
      apiKey: modelData.apiKey?.trim(),
    };
  };

  const [providerInfo, setProviderInfo] = useState<ProviderMetadata>(
    getProviderInfo(defaultProvider)
  );

  // Check if the form has required fields filled
  const isFormValid = (): boolean => {
    return Boolean(model.name && model.provider);
  };

  // Check if buttons should be disabled
  const isButtonDisabled = (): boolean => {
    return isVerifying || !isFormValid();
  };

  const handleAdd = () => {
    if (!validateFields()) {
      new Notice("Please fill in all required fields");
      return;
    }

    const cleanedModel = getCleanedModel(model);
    onAdd(cleanedModel);
    onOpenChange(false);
    setModel(getInitialModel());
    clearErrors();
    setVerifyStatus("idle");
  };

  const handleProviderChange = (provider: ChatModelProviders) => {
    setProviderInfo(getProviderInfo(provider));
    setVerifyStatus("idle");
    setModel({
      ...model,
      provider,
      apiKey: getApiKeyForProvider(provider as SettingKeyProviders),
    });
  };
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setModel(getInitialModel());
      clearErrors();
      setVerifyStatus("idle");
    }
    onOpenChange(open);
  };

  const handleVerify = async () => {
    if (!validateFields()) {
      new Notice("Please fill in all required fields");
      return;
    }

    setIsVerifying(true);
    setVerifyStatus("idle");
    try {
      const cleanedModel = getCleanedModel(model);
      await ping(cleanedModel);
      setVerifyStatus("success");
      new Notice("Model verification successful!");
    } catch (err) {
      logError(err);
      const errStr = err2String(err);
      setVerifyStatus("failed");
      new Notice("Model verification failed: " + errStr);
    } finally {
      setIsVerifying(false);
    }
  };

  /** Copies curl command to clipboard for testing */
  const handleCopyCurlCommand = async () => {
    try {
      const cleanedModel = getCleanedModel(model);
      const result = await buildCurlCommandForModel(cleanedModel);

      if (!result.ok) {
        new Notice(result.error);
        return;
      }

      await navigator.clipboard.writeText(result.command);

      // Check if real API key was included (no placeholder warning)
      const hasRealKey = !result.warnings.some((w) => w.includes("placeholder"));
      const keyWarning = hasRealKey ? " Warning: contains real API key!" : "";
      const otherWarnings = result.warnings.filter((w) => !w.includes("placeholder"));
      const suffix = otherWarnings.length > 0 ? ` (${otherWarnings[0]})` : "";

      new Notice(`Copied curl command.${keyWarning}${suffix}`);
    } catch (err) {
      logError(err);
      new Notice("Failed to copy curl command: " + err2String(err));
    }
  };

  const getPlaceholderUrl = () => {
    return providerInfo.host;
  };

  const capabilityOptions = Object.entries(MODEL_CAPABILITIES).map(([id, description]) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    description,
  })) as Array<{ id: ModelCapability; label: string; description: string }>;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="tw-max-h-[80vh] tw-overflow-y-auto sm:tw-max-w-[425px]"
        container={modalContainer}
        ref={(el) => setDialogElement(el)}
      >
        <DialogHeader>
          <DialogTitle>Add Custom {isEmbeddingModel ? "Embedding" : "Chat"} Model</DialogTitle>
          <DialogDescription>Add a new model to your collection.</DialogDescription>
        </DialogHeader>

        <div className="tw-space-y-3">
          <FormField
            label="Model Name"
            required
            error={errors.name}
            errorMessage="Model name is required"
          >
            <Input
              type="text"
              placeholder={`Enter model name (e.g. ${
                isEmbeddingModel ? "text-embedding-3-small" : "gpt-4"
              })`}
              value={model.name}
              onChange={(e) => {
                updateModelWithReset({ name: e.target.value });
                setError("name", false);
              }}
            />
          </FormField>

          <FormField
            label={
              <div className="tw-flex tw-items-center tw-gap-1.5">
                <span className="tw-leading-none">Display Name</span>
                <HelpTooltip
                  content={
                    <div className="tw-flex tw-flex-col tw-gap-0.5 tw-text-sm tw-text-muted">
                      <div className="tw-text-[12px] tw-font-bold">Suggested format:</div>
                      <div className="tw-text-accent">[Source]-[Payment]:[Pretty Model Name]</div>
                      <div className="tw-text-[12px]">
                        Example:
                        <li>Direct-Paid:Ds-r1</li>
                        <li>Proxy-Paid:Ds-r1</li>
                        <li>Perplexity-Paid:lg</li>
                      </div>
                    </div>
                  }
                  contentClassName="tw-max-w-96"
                />
              </div>
            }
          >
            <Input
              type="text"
              placeholder="Custom display name (optional)"
              value={model.displayName || ""}
              onChange={(e) => {
                setModel({ ...model, displayName: e.target.value });
              }}
            />
          </FormField>

          <FormField label="Provider">
            <Select value={model.provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent container={dialogElement}>
                {Object.values(
                  isEmbeddingModel ? EmbeddingModelProviders : ChatModelProviders
                ).map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {getProviderLabel(provider)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Base URL" description="Leave it blank, unless you are using a proxy.">
            <Input
              type="text"
              placeholder={getPlaceholderUrl() || "https://api.example.com/v1"}
              value={model.baseUrl || ""}
              onChange={(e) => updateModelWithReset({ baseUrl: e.target.value })}
            />
          </FormField>

          <FormField label="API Key">
            <PasswordInput
              placeholder={`Enter ${providerInfo.label} API Key`}
              value={model.apiKey || ""}
              onChange={(value) => updateModelWithReset({ apiKey: value })}
            />
            {providerInfo.keyManagementURL && (
              <p className="tw-text-xs tw-text-muted">
                <a href={providerInfo.keyManagementURL} target="_blank" rel="noopener noreferrer">
                  Get {providerInfo.label} API Key
                </a>
              </p>
            )}
          </FormField>

          {!isEmbeddingModel && (
            <FormField
              label={
                <div className="tw-flex tw-items-center tw-gap-1.5">
                  <span className="tw-leading-none">Model Capabilities</span>
                  <HelpTooltip
                    content={
                      <div className="tw-text-sm tw-text-muted">
                        Only used to display model capabilities, does not affect model functionality
                      </div>
                    }
                    contentClassName="tw-max-w-96"
                  />
                </div>
              }
            >
              <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-6 tw-gap-y-2">
                {capabilityOptions.map(({ id, label, description }) => (
                  <div key={id} className="tw-flex tw-items-center tw-gap-2">
                    <Checkbox
                      id={id}
                      checked={model.capabilities?.includes(id)}
                      onCheckedChange={(checked) => {
                        const newCapabilities = model.capabilities || [];
                        setModel({
                          ...model,
                          capabilities: checked
                            ? [...newCapabilities, id]
                            : newCapabilities.filter((cap) => cap !== id),
                        });
                      }}
                    />
                    <HelpTooltip content={description}>
                      <Label htmlFor={id} className="tw-text-sm">
                        {label}
                      </Label>
                    </HelpTooltip>
                  </div>
                ))}
              </div>
            </FormField>
          )}

        </div>

        <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
          {/* CORS 和 CURL */}
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 sm:tw-flex-1">
            <div className="tw-flex tw-items-center tw-gap-2">
              <Checkbox
                id="enable-cors"
                checked={model.enableCors || false}
                onCheckedChange={(checked: boolean) => setModel({ ...model, enableCors: checked })}
              />
              <Label htmlFor="enable-cors" className="tw-cursor-pointer">
                <div className="tw-flex tw-items-center tw-gap-1">
                  <span className="tw-text-sm">CORS</span>
                  <HelpTooltip
                    content={
                      <div className="tw-text-sm tw-text-muted">
                        Only check this option when prompted that CORS is needed
                      </div>
                    }
                    contentClassName="tw-max-w-96"
                  />
                </div>
              </Label>
            </div>
            {model.provider === ChatModelProviders.OPENAI_FORMAT && (
              <div className="tw-flex tw-items-center tw-gap-2">
                <Checkbox
                  id="stream-usage"
                  checked={model.streamUsage || false}
                  onCheckedChange={(checked: boolean) =>
                    setModel({ ...model, streamUsage: checked })
                  }
                />
                <Label htmlFor="stream-usage" className="tw-cursor-pointer">
                  <div className="tw-flex tw-items-center tw-gap-1">
                    <span className="tw-text-sm">Stream Usage</span>
                    <HelpTooltip
                      content={
                        <div className="tw-text-sm tw-text-muted">
                          Enable if your provider supports stream_options for token usage tracking.
                          Disable for providers that do not support it (e.g., Databricks, MLFlow).
                        </div>
                      }
                      contentClassName="tw-max-w-96"
                    />
                  </div>
                </Label>
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCurlCommand}
                    disabled={!model.name}
                    className="tw-text-muted hover:tw-text-normal"
                  >
                    CURL
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy curl command for testing</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 主要操作区：Test 和 Add Model */}
          <div className="tw-flex tw-shrink-0 tw-items-center tw-justify-end tw-gap-2">
            {verifyStatus === "success" && <CheckCircle2 className="tw-size-5 tw-text-success" />}
            {verifyStatus === "failed" && <XCircle className="tw-size-5 tw-text-error" />}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleVerify}
                    disabled={isButtonDisabled()}
                    className="tw-min-w-[72px]"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="tw-mr-1.5 tw-size-3.5 tw-animate-spin" />
                        Test
                      </>
                    ) : (
                      "Test"
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Optional: test API call</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="default" size="sm" onClick={handleAdd} disabled={isButtonDisabled()}>
              Add Model
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
