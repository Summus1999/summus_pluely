import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Header,
  Input,
  Selection,
  TextInput,
  Textarea,
} from "@/components";
import { useApp } from "@/contexts";
import { useCustomSttProviders } from "@/hooks";
import { extractVariables } from "@/lib";
import { EditIcon, KeyIcon, PlusIcon, SaveIcon, TrashIcon } from "lucide-react";
import curl2Json from "@bany/curl-to-json";
import { TYPE_PROVIDER } from "@/types";

const createCustomSttFormData = (): TYPE_PROVIDER => ({
  id: "",
  streaming: false,
  responseContentPath: "",
  isCustom: true,
  curl: "",
});

const getProviderLabel = (provider?: TYPE_PROVIDER & { name?: string }) => {
  if (!provider) return "未命名服务商";

  try {
    if (provider.isCustom) {
      const json = curl2Json(provider.curl);
      if (json?.url) {
        return json.url;
      }
    }
  } catch {
    return provider.name || provider.id || "未命名服务商";
  }

  return provider.name || provider.id || "未命名服务商";
};

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

  useEffect(() => {
    const provider = allAiProviders.find(
      (item) => item.id === selectedAIProvider.provider
    );
    setAiVariables(provider ? extractVariables(provider.curl) : []);
  }, [allAiProviders, selectedAIProvider.provider]);

  useEffect(() => {
    const provider = allSttProviders.find(
      (item) => item.id === selectedSttProvider.provider
    );
    setSttVariables(provider ? extractVariables(provider.curl) : []);
  }, [allSttProviders, selectedSttProvider.provider]);

  const selectedAiLabel = getProviderLabel(
    allAiProviders.find((item) => item.id === selectedAIProvider.provider)
  );
  const selectedSttLabel = getProviderLabel(
    allSttProviders.find((item) => item.id === selectedSttProvider.provider)
  );

  return (
    <div className="space-y-6">
      <Header
        title="API 配置"
        description="在一个页面内完成 AI 对话与语音识别的服务商选择和参数配置。"
        isMainTitle
      />

      <div className="space-y-3">
        <Header
          title="AI 对话模型"
          description="只保留内置 AI 服务商。选择后填写该服务商要求的变量即可开始使用。"
        />

        <Selection
          selected={selectedAIProvider.provider}
          options={allAiProviders.map((provider) => ({
            label: getProviderLabel(provider),
            value: provider.id || "",
          }))}
          placeholder="选择 AI 提供商"
          onChange={(value: string) => {
            onSetSelectedAIProvider({ provider: value, variables: {} });
          }}
        />

        <VariableFields
          variables={aiVariables}
          selectedProvider={selectedAIProvider}
          onSetProvider={onSetSelectedAIProvider}
          providerLabel={selectedAiLabel}
        />
      </div>

      <div className="space-y-3">
        <Header
          title="STT 语音识别模型"
          description="先选择内置或自定义 STT 服务商，再填写必要变量。"
        />

        <Selection
          selected={selectedSttProvider.provider}
          options={allSttProviders.map((provider) => ({
            label: getProviderLabel(provider),
            value: provider.id || "",
          }))}
          placeholder="选择 STT 提供商"
          onChange={(value: string) => {
            onSetSelectedSttProvider({ provider: value, variables: {} });
          }}
        />

        <VariableFields
          variables={sttVariables}
          selectedProvider={selectedSttProvider}
          onSetProvider={onSetSelectedSttProvider}
          providerLabel={selectedSttLabel}
        />

        <CustomSttProviderManager allSttProviders={allSttProviders} />
      </div>
    </div>
  );
};

function VariableFields({
  variables,
  selectedProvider,
  onSetProvider,
  providerLabel,
}: {
  variables: { key: string; value: string }[];
  selectedProvider: { provider: string; variables: Record<string, string> };
  onSetProvider: (provider: {
    provider: string;
    variables: Record<string, string>;
  }) => void;
  providerLabel: string;
}) {
  if (!selectedProvider.provider || variables.length === 0) return null;

  const apiKeyVar = variables.find((variable) => variable.key === "api_key");
  const otherVars = variables.filter((variable) => variable.key !== "api_key");
  const getVarValue = (key: string) => selectedProvider.variables?.[key] || "";

  const setVarValue = (key: string, value: string) => {
    onSetProvider({
      ...selectedProvider,
      variables: { ...selectedProvider.variables, [key]: value },
    });
  };

  return (
    <>
      {apiKeyVar ? (
        <div className="space-y-2">
          <Header
            title="API Key"
            description={`输入 ${providerLabel} 的 API Key。密钥仅保存在本地。`}
          />
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="sk-**********"
              value={getVarValue(apiKeyVar.key)}
              onChange={(value) => {
                const nextValue =
                  typeof value === "string" ? value : value.target.value;
                setVarValue(apiKeyVar.key, nextValue);
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
      ) : null}

      {otherVars.map((variable) => (
        <div className="space-y-1" key={variable.key}>
          <Header
            title={variable.value}
            description={`设置 ${providerLabel} 的 ${variable.key.replace(/_/g, " ")}`}
          />
          <TextInput
            placeholder={`输入 ${variable.key.replace(/_/g, " ")}`}
            value={getVarValue(variable.key)}
            onChange={(value) => setVarValue(variable.key, value)}
          />
        </div>
      ))}
    </>
  );
}

function CustomSttProviderManager({
  allSttProviders,
}: {
  allSttProviders: TYPE_PROVIDER[];
}) {
  const customProviderHook = useCustomSttProviders();
  const {
    errors,
    setErrors,
    showForm,
    setShowForm,
    editingProvider,
    setEditingProvider,
    deleteConfirm,
    formData,
    setFormData,
    handleSave,
    handleAutoFill,
    handleEdit,
    handleDelete,
    confirmDelete,
    cancelDelete,
  } = customProviderHook;

  const builtinSttProviders = useMemo(
    () => allSttProviders.filter((provider) => !provider.isCustom),
    [allSttProviders]
  );
  const customSttProviders = useMemo(
    () => allSttProviders.filter((provider) => provider.isCustom),
    [allSttProviders]
  );

  const resetForm = () => {
    setShowForm(false);
    setEditingProvider(null);
    setErrors({});
    setFormData(createCustomSttFormData());
  };

  return (
    <div className="space-y-3 pt-2">
      <Header
        title="自定义 STT 服务商"
        description="当内置 STT 服务商不满足需求时，可通过 cURL 增加自定义语音识别配置。"
      />

      {customSttProviders.length > 0 ? (
        <div className="space-y-2">
          {customSttProviders.map((provider) => (
            <Card
              key={provider.id}
              className="p-3 border !bg-transparent border-input/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {getProviderLabel(provider)}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    响应路径：{provider.responseContentPath || "未设置"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => provider.id && handleEdit(provider.id)}
                    title="编辑服务商"
                  >
                    <EditIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => provider.id && handleDelete(provider.id)}
                    title="删除服务商"
                    className="text-destructive hover:text-destructive"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {!showForm ? (
        <Button
          onClick={() => {
            setEditingProvider(null);
            setErrors({});
            setFormData(createCustomSttFormData());
            setShowForm(true);
          }}
          variant="outline"
          className="w-full h-11 border-1 border-input/50 focus:border-primary/50 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          添加自定义 STT 服务商
        </Button>
      ) : (
        <Card className="p-4 border border-input/50 bg-transparent space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <Header
              title={editingProvider ? "编辑自定义 STT 服务商" : "添加自定义 STT 服务商"}
              description="保留最小配置项：cURL 请求与响应内容路径。"
            />
            <div className="w-full lg:w-56">
              <Selection
                selected={undefined}
                options={builtinSttProviders.map((provider) => ({
                  label: getProviderLabel(provider),
                  value: provider.id || "",
                }))}
                placeholder="从内置模板填充"
                onChange={(value: string) => handleAutoFill(value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Header
              title="cURL 命令"
              description="必须包含 {{AUDIO}}。如需变量输入，可继续使用 {{API_KEY}}、{{MODEL}} 等占位符。"
            />
            <Textarea
              className={`h-64 font-mono text-sm ${
                errors.curl ? "border-red-500" : ""
              }`}
              placeholder={`curl -X POST "https://api.openai.com/v1/audio/transcriptions" \\
  -H "Authorization: Bearer {{API_KEY}}" \\
  -F "file={{AUDIO}}" \\
  -F "model={{MODEL}}"`}
              value={formData.curl}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  curl: event.target.value,
                }))
              }
            />
            {errors.curl ? (
              <p className="text-xs text-red-500">{errors.curl}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                必需变量：<code>{"{{AUDIO}}"}</code>。其余变量会在选择该服务商时自动生成输入框。
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Header
              title="响应内容路径"
              description="用于从接口响应中提取转写结果。"
            />
            <TextInput
              placeholder="text"
              value={formData.responseContentPath || ""}
              onChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  responseContentPath: value,
                }))
              }
              error={errors.responseContentPath}
              notes="示例：text、transcript、results[0].alternatives[0].transcript"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetForm}
              className="h-11 border-1 border-input/50 focus:border-primary/50 transition-colors"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.curl.trim()}
              className="h-11 border-1 border-input/50 focus:border-primary/50 transition-colors"
            >
              <SaveIcon className="h-4 w-4 mr-2" />
              {editingProvider ? "更新服务商" : "保存服务商"}
            </Button>
          </div>
        </Card>
      )}

      {deleteConfirm ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">删除自定义 STT 服务商</h3>
            <p className="text-sm text-muted-foreground mb-4">
              确定要删除这个自定义 STT 服务商吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelDelete}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                删除
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
