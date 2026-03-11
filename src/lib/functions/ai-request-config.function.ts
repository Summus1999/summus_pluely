import {
  buildDynamicMessages,
  deepVariableReplacer,
  extractVariables,
} from "./common.function";
import { Message, ProviderConfig } from "@/types";
import curl2Json from "@bany/curl-to-json";
import { getResponseSettings, RESPONSE_LENGTHS, LANGUAGES } from "@/lib";
import { MARKDOWN_FORMATTING_INSTRUCTIONS } from "@/config/constants";

function buildEnhancedSystemPrompt(baseSystemPrompt?: string): string {
  const responseSettings = getResponseSettings();
  const prompts: string[] = [];

  if (baseSystemPrompt) {
    prompts.push(baseSystemPrompt);
  }

  const lengthOption = RESPONSE_LENGTHS.find(
    (l) => l.id === responseSettings.responseLength
  );
  if (lengthOption?.prompt?.trim()) {
    prompts.push(lengthOption.prompt);
  }

  const languageOption = LANGUAGES.find(
    (l) => l.id === responseSettings.language
  );
  if (languageOption?.prompt?.trim()) {
    prompts.push(languageOption.prompt);
  }

  prompts.push(MARKDOWN_FORMATTING_INSTRUCTIONS);

  return prompts.join(" ");
}

export interface PrepareAIRequestParams {
  provider: ProviderConfig | undefined;
  selectedProvider: {
    provider: string;
    variables: Record<string, string>;
  };
  systemPrompt?: string;
  history?: Message[];
  userMessage: string;
  imagesBase64?: string[];
}

export interface PreparedAIRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  responseContentPath: string;
  streaming: boolean;
  providerId?: string;
}

export function prepareAIRequest(
  params: PrepareAIRequestParams
): PreparedAIRequest {
  const {
    provider,
    selectedProvider,
    systemPrompt,
    history = [],
    userMessage,
    imagesBase64 = [],
  } = params;

  const enhancedSystemPrompt = buildEnhancedSystemPrompt(systemPrompt);

  if (!provider) {
    throw new Error("未提供服务商配置");
  }
  if (!selectedProvider) {
    throw new Error("未选择服务商");
  }
  if (!userMessage) {
    throw new Error("用户消息不能为空");
  }
  if (imagesBase64.length > 0 && !provider.curl.includes("{{IMAGE}}")) {
    throw new Error(`服务商 ${provider.id ?? "未知"} 不支持图片输入`);
  }

  let curlJson: any;
  try {
    curlJson = curl2Json(provider.curl);
  } catch (error) {
    throw new Error(
      `Curl 解析失败: ${
        error instanceof Error ? error.message : "未知错误"
      }`
    );
  }

  const requiredVars = extractVariables(provider.curl).filter(
    ({ key }) => key !== "system_prompt" && key !== "text" && key !== "image"
  );

  for (const { key } of requiredVars) {
    const value = selectedProvider.variables?.[key];
    if (!value || value.trim() === "") {
      throw new Error(`缺少必要变量: ${key}，请在设置中配置。`);
    }
  }

  let bodyObj: any = curlJson.data
    ? JSON.parse(JSON.stringify(curlJson.data))
    : {};

  const messagesKey = Object.keys(bodyObj).find((key) =>
    ["messages", "contents", "conversation", "history"].includes(key)
  );

  if (messagesKey && Array.isArray(bodyObj[messagesKey])) {
    bodyObj[messagesKey] = buildDynamicMessages(
      bodyObj[messagesKey],
      history,
      userMessage,
      imagesBase64
    );
  }

  const allVariables = {
    ...Object.fromEntries(
      Object.entries(selectedProvider.variables).map(([key, value]) => [
        key.toUpperCase(),
        value,
      ])
    ),
    SYSTEM_PROMPT: enhancedSystemPrompt || "",
  };

  bodyObj = deepVariableReplacer(bodyObj, allVariables);
  const url = deepVariableReplacer(curlJson.url || "", allVariables);
  const headers = deepVariableReplacer(curlJson.header || {}, allVariables);
  headers["Content-Type"] = "application/json";

  if (provider.streaming && typeof bodyObj === "object" && bodyObj !== null) {
    const streamKey = Object.keys(bodyObj).find(
      (key) => key.toLowerCase() === "stream"
    );
    if (streamKey) {
      bodyObj[streamKey] = true;
    } else {
      bodyObj.stream = true;
    }
  }

  return {
    url,
    method: curlJson.method || "POST",
    headers,
    body: curlJson.method === "GET" ? undefined : JSON.stringify(bodyObj),
    responseContentPath: provider.responseContentPath || "",
    streaming: Boolean(provider.streaming),
    providerId: provider.id,
  };
}
