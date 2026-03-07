import { Button, Header, Input, Selection, TextInput } from "@/components";
import { UseSettingsReturn } from "@/types";
import curl2Json, { ResultJSON } from "@bany/curl-to-json";
import { KeyIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";

export const Providers = ({
  allAiProviders,
  selectedAIProvider,
  onSetSelectedAIProvider,
  variables,
}: UseSettingsReturn) => {
  const [localSelectedProvider, setLocalSelectedProvider] =
    useState<ResultJSON | null>(null);

  useEffect(() => {
    if (selectedAIProvider?.provider) {
      const provider = allAiProviders?.find(
        (p) => p?.id === selectedAIProvider?.provider
      );
      if (provider) {
        const json = curl2Json(provider?.curl);
        setLocalSelectedProvider(json as ResultJSON);
      }
    }
  }, [selectedAIProvider?.provider]);

  const findKeyAndValue = (key: string) => {
    return variables?.find((v) => v?.key === key);
  };

  const getApiKeyValue = () => {
    const apiKeyVar = findKeyAndValue("api_key");
    if (!apiKeyVar || !selectedAIProvider?.variables) return "";
    return selectedAIProvider?.variables?.[apiKeyVar.key] || "";
  };

  const isApiKeyEmpty = () => {
    return !getApiKeyValue().trim();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Header
          title="选择 AI 提供商"
          description="选择你偏好的 AI 服务提供商或自定义提供商以开始使用。"
        />
        <Selection
          selected={selectedAIProvider?.provider}
          options={allAiProviders?.map((provider) => {
            const json = curl2Json(provider?.curl);
            return {
              label: provider?.isCustom
                ? json?.url || "自定义提供商"
                : provider?.id || "自定义提供商",
              value: provider?.id || "自定义提供商",
              isCustom: provider?.isCustom,
            };
          })}
          placeholder="选择 AI 提供商"
          onChange={(value) => {
            onSetSelectedAIProvider({
              provider: value,
              variables: {},
            });
          }}
        />
      </div>

      {localSelectedProvider ? (
        <Header
          title={`方法：${
            localSelectedProvider?.method || "无效"
          }，端点：${localSelectedProvider?.url || "无效"}`}
          description={`如需使用不同的 URL 或方法，可创建自定义提供商。`}
        />
      ) : null}

      {findKeyAndValue("api_key") ? (
        <div className="space-y-2">
          <Header
            title="API Key"
            description={`输入你的 ${
              allAiProviders?.find(
                (p) => p?.id === selectedAIProvider?.provider
              )?.isCustom
                ? "自定义提供商"
                : selectedAIProvider?.provider
            } API Key 以验证并访问 AI 模型。密钥仅存储在本地，不会共享。`}
          />

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="**********"
                value={getApiKeyValue()}
                onChange={(value) => {
                  const apiKeyVar = findKeyAndValue("api_key");
                  if (!apiKeyVar || !selectedAIProvider) return;

                  onSetSelectedAIProvider({
                    ...selectedAIProvider,
                    variables: {
                      ...selectedAIProvider.variables,
                      [apiKeyVar.key]:
                        typeof value === "string" ? value : value.target.value,
                    },
                  });
                }}
                onKeyDown={(e) => {
                  const apiKeyVar = findKeyAndValue("api_key");
                  if (!apiKeyVar || !selectedAIProvider) return;

                  onSetSelectedAIProvider({
                    ...selectedAIProvider,
                    variables: {
                      ...selectedAIProvider.variables,
                      [apiKeyVar.key]: (e.target as HTMLInputElement).value,
                    },
                  });
                }}
                disabled={false}
                className="flex-1 h-11 border-1 border-input/50 focus:border-primary/50 transition-colors"
              />
              {isApiKeyEmpty() ? (
                <Button
                  onClick={() => {
                    const apiKeyVar = findKeyAndValue("api_key");
                    if (!apiKeyVar || !selectedAIProvider || isApiKeyEmpty())
                      return;

                    onSetSelectedAIProvider({
                      ...selectedAIProvider,
                      variables: {
                        ...selectedAIProvider.variables,
                        [apiKeyVar.key]: getApiKeyValue(),
                      },
                    });
                  }}
                  disabled={isApiKeyEmpty()}
                  size="icon"
                  className="shrink-0 h-11 w-11"
                  title="提交 API Key"
                >
                  <KeyIcon className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const apiKeyVar = findKeyAndValue("api_key");
                    if (!apiKeyVar || !selectedAIProvider) return;

                    onSetSelectedAIProvider({
                      ...selectedAIProvider,
                      variables: {
                        ...selectedAIProvider.variables,
                        [apiKeyVar.key]: "",
                      },
                    });
                  }}
                  size="icon"
                  variant="destructive"
                  className="shrink-0 h-11 w-11"
                  title="移除 API Key"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4 mt-2">
        {variables
          .filter(
            (variable) => variable.key !== findKeyAndValue("api_key")?.key
          )
          .map((variable) => {
            const getVariableValue = () => {
              if (!variable?.key || !selectedAIProvider?.variables) return "";
              return selectedAIProvider.variables[variable.key] || "";
            };

            return (
              <div className="space-y-1" key={variable?.key}>
                <Header
                  title={variable?.value || ""}
                  description={`为 ${
                    allAiProviders?.find(
                      (p) => p?.id === selectedAIProvider?.provider
                    )?.isCustom
                      ? "自定义提供商"
                      : selectedAIProvider?.provider
                  } 添加 ${variable?.key?.replace(/_/g, " ")}`}
                />
                <TextInput
                  placeholder={`输入 ${
                    allAiProviders?.find(
                      (p) => p?.id === selectedAIProvider?.provider
                    )?.isCustom
                      ? "自定义提供商"
                      : selectedAIProvider?.provider
                  } 的 ${variable?.key?.replace(/_/g, " ") || "值"}`}
                  value={getVariableValue()}
                  onChange={(value) => {
                    if (!variable?.key || !selectedAIProvider) return;

                    onSetSelectedAIProvider({
                      ...selectedAIProvider,
                      variables: {
                        ...selectedAIProvider.variables,
                        [variable.key]: value,
                      },
                    });
                  }}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
};
