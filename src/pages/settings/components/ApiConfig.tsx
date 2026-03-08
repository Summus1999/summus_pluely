import { useEffect, useState } from "react";
import { Header, Input, Selection, TextInput } from "@/components";
import { useApp } from "@/contexts";
import { extractVariables } from "@/lib";
import { KeyIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components";
import curl2Json from "@bany/curl-to-json";

export const ApiConfig = () => {
  const {
    allAiProviders,
    allSttProviders,
    selectedAIProvider,
    selectedSttProvider,
    onSetSelectedAIProvider,
    onSetSelectedSttProvider,
  } = useApp();

  const [aiVariables, setAiVariables] = useState<
    { key: string; value: string }[]
  >([]);
  const [sttVariables, setSttVariables] = useState<
    { key: string; value: string }[]
  >([]);

  // Extract AI provider variables when selection changes
  useEffect(() => {
    if (selectedAIProvider.provider) {
      const provider = allAiProviders.find(
        (p) => p.id === selectedAIProvider.provider
      );
      if (provider) {
        setAiVariables(extractVariables(provider.curl));
      }
    }
  }, [selectedAIProvider.provider, allAiProviders]);

  // Extract STT provider variables when selection changes
  useEffect(() => {
    if (selectedSttProvider.provider) {
      const provider = allSttProviders.find(
        (p) => p.id === selectedSttProvider.provider
      );
      if (provider) {
        setSttVariables(extractVariables(provider.curl));
      }
    }
  }, [selectedSttProvider.provider, allSttProviders]);

  const getProviderLabel = (provider: any) => {
    try {
      if (provider?.isCustom) {
        const json = curl2Json(provider?.curl);
        return json?.url || "自定义提供商";
      }
      // For STT providers that have a name field
      if (provider?.name) return provider.name;
      return provider?.id || "自定义提供商";
    } catch {
      return provider?.id || "自定义提供商";
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="API 配置"
        description="配置 AI 对话和语音识别的服务商、API Key 与模型"
        isMainTitle
      />

      {/* AI Provider Config */}
      <div className="space-y-3">
        <Header
          title="AI 对话模型"
          description="选择 AI 服务提供商并配置密钥和模型，用于智能对话回答。"
        />

        <Selection
          selected={selectedAIProvider?.provider}
          options={allAiProviders.map((p) => ({
            label: getProviderLabel(p),
            value: p.id || "",
            isCustom: p.isCustom,
          }))}
          placeholder="选择 AI 提供商"
          onChange={(value: string) => {
            onSetSelectedAIProvider({ provider: value, variables: {} });
          }}
        />

        {/* AI Variables */}
        <VariableFields
          variables={aiVariables}
          selectedProvider={selectedAIProvider}
          onSetProvider={onSetSelectedAIProvider}
          providerLabel={
            allAiProviders.find((p) => p.id === selectedAIProvider?.provider)
              ?.isCustom
              ? "自定义提供商"
              : selectedAIProvider?.provider
          }
        />
      </div>

      {/* STT Provider Config */}
      <div className="space-y-3">
        <Header
          title="STT 语音识别模型"
          description="选择语音识别服务提供商并配置密钥和模型，用于语音转文字。"
        />

        <Selection
          selected={selectedSttProvider?.provider}
          options={allSttProviders.map((p) => ({
            label: getProviderLabel(p),
            value: p.id || "",
            isCustom: p.isCustom,
          }))}
          placeholder="选择 STT 提供商"
          onChange={(value: string) => {
            onSetSelectedSttProvider({ provider: value, variables: {} });
          }}
        />

        {/* STT Variables */}
        <VariableFields
          variables={sttVariables}
          selectedProvider={selectedSttProvider}
          onSetProvider={onSetSelectedSttProvider}
          providerLabel={
            allSttProviders.find((p) => p.id === selectedSttProvider?.provider)
              ?.isCustom
              ? "自定义提供商"
              : selectedSttProvider?.provider
          }
        />
      </div>
    </div>
  );
};

/** Reusable sub-component for rendering provider variable fields (API Key + others) */
function VariableFields({
  variables,
  selectedProvider,
  onSetProvider,
  providerLabel,
}: {
  variables: { key: string; value: string }[];
  selectedProvider: { provider: string; variables: Record<string, string> };
  onSetProvider: (p: {
    provider: string;
    variables: Record<string, string>;
  }) => void;
  providerLabel: string;
}) {
  if (!selectedProvider?.provider || variables.length === 0) return null;

  const apiKeyVar = variables.find((v) => v.key === "api_key");
  const otherVars = variables.filter((v) => v.key !== "api_key");

  const getVarValue = (key: string) =>
    selectedProvider.variables?.[key] || "";

  const setVarValue = (key: string, value: string) => {
    onSetProvider({
      ...selectedProvider,
      variables: { ...selectedProvider.variables, [key]: value },
    });
  };

  return (
    <>
      {/* API Key field */}
      {apiKeyVar && (
        <div className="space-y-2">
          <Header
            title="API Key"
            description={`输入 ${providerLabel} 的 API Key，密钥仅存储在本地，不会共享。`}
          />
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="sk-**********"
              value={getVarValue(apiKeyVar.key)}
              onChange={(value) => {
                const v = typeof value === "string" ? value : value.target.value;
                setVarValue(apiKeyVar.key, v);
              }}
              className="flex-1 h-11 border-1 border-input/50 focus:border-primary/50 transition-colors"
            />
            {getVarValue(apiKeyVar.key).trim() ? (
              <Button
                onClick={() => setVarValue(apiKeyVar.key, "")}
                size="icon"
                variant="destructive"
                className="shrink-0 h-11 w-11"
                title="移除 API Key"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="shrink-0 h-11 w-11"
                disabled
                title="请输入 API Key"
              >
                <KeyIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Other variable fields (MODEL, etc.) */}
      {otherVars.map((variable) => (
        <div className="space-y-1" key={variable.key}>
          <Header
            title={variable.value}
            description={`设置 ${providerLabel} 的 ${variable.key.replace(/_/g, " ")}`}
          />
          <TextInput
            placeholder={`输入 ${variable.key.replace(/_/g, " ")}`}
            value={getVarValue(variable.key)}
            onChange={(val) => setVarValue(variable.key, val)}
          />
        </div>
      ))}
    </>
  );
}
