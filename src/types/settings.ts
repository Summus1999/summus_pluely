/**
 * Settings Types - 设置相关类型定义
 *
 * 定义应用设置、提供者配置和截图配置的类型
 */

/** 自定义输入内容的示例结构 */
export interface ExampleStructure {
  [key: string]: unknown;
}

/** 自定义提供者输入配置 */
export interface CustomProviderInput {
  text: {
    placement: string;
    exampleStructure: ExampleStructure;
  };
  image: {
    type: string;
    placement: string;
    exampleStructure: ExampleStructure;
  };
}

/** 自定义提供者响应配置 */
export interface CustomProviderResponse {
  /** 内容提取路径 */
  contentPath: string;
  /** 用量信息提取路径 */
  usagePath: string;
}

/** 自定义 AI 提供者配置 */
export interface CustomProvider {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 基础 URL */
  baseUrl: string;
  /** 聊天端点路径 */
  chatEndpoint: string;
  /** 认证类型 */
  authType: string;
  /** 认证参数 */
  authParam?: string;
  /** 自定义请求头名称 */
  customHeaderName?: string;
  /** 默认模型 */
  defaultModel: string;
  /** 响应配置 */
  response: CustomProviderResponse;
  /** 输入配置 */
  input: CustomProviderInput;
  /** 可用模型列表 */
  models: null;
  /** 是否为自定义提供者 */
  isCustom: true;
  /** 是否支持流式响应 */
  supportsStreaming: boolean;
  /** 响应内容提取路径 */
  responseContentPath?: string;
  /** 响应用量提取路径 */
  responseUsagePath?: string;
  /** 文本示例结构 */
  textExampleStructure?: string;
  /** 图片类型 */
  imageType?: string;
  /** 图片示例结构 */
  imageExampleStructure?: string;
}

/** 截图模式 */
export type ScreenshotMode = "auto" | "manual";

/** 截图配置 */
export interface ScreenshotConfig {
  /** 截图模式 */
  mode: ScreenshotMode;
  /** 自动截图提示词 */
  autoPrompt: string;
  /** 是否启用截图 */
  enabled: boolean;
}

/** 语音转文本请求附加字段 */
export interface AdditionalFields {
  [key: string]: unknown;
}

/** 语音转文本提供者请求配置 */
export interface SpeechProviderRequestConfig {
  /** 音频格式 */
  audioFormat: string;
  /** 音频字段名称 */
  audioFieldName: string;
  /** 附加字段 */
  additionalFields?: AdditionalFields;
}

/** 语音转文本提供者响应配置 */
export interface SpeechProviderResponse {
  /** 内容提取路径 */
  contentPath: string;
  /** 响应示例结构 */
  exampleStructure: ExampleStructure;
}

/** 语音转文本提供者配置 */
export interface SpeechProvider {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 基础 URL */
  baseUrl: string;
  /** API 端点 */
  endpoint: string;
  /** 请求方法 */
  method: "POST" | "PUT" | "PATCH";
  /** 认证类型 */
  authType: "bearer" | "custom-header" | "query" | "none";
  /** 认证参数 */
  authParam?: string;
  /** 自定义请求头名称 */
  customHeaderName?: string;
  /** API 密钥 */
  apiKey?: string;
  /** 请求配置 */
  request: SpeechProviderRequestConfig;
  /** 响应配置 */
  response: SpeechProviderResponse;
  /** 是否为自定义提供者 */
  isCustom: boolean;
  /** 是否支持流式响应 */
  supportsStreaming?: boolean;
  /** 附加请求头 */
  additionalHeaders?: { [key: string]: string };
}

/** 语音转文本提供者表单数据 */
export interface SpeechProviderFormData {
  /** 显示名称 */
  name: string;
  /** 基础 URL */
  baseUrl: string;
  /** API 端点 */
  endpoint: string;
  /** 请求方法 */
  method: "POST" | "PUT" | "PATCH";
  /** 认证类型 */
  authType: "bearer" | "custom-header" | "query" | "none";
  /** 认证参数 */
  authParam: string;
  /** 自定义请求头名称 */
  customHeaderName: string;
  /** API 密钥 */
  apiKey?: string;
  /** 音频格式 */
  audioFormat: string;
  /** 音频字段名称 */
  audioFieldName: string;
  /** 内容提取路径 */
  contentPath: string;
  /** 附加字段 */
  additionalFields: { [key: string]: string };
  /** 附加请求头 */
  additionalHeaders: { [key: string]: string };
  /** 是否支持流式响应 */
  supportsStreaming: boolean;
}

/** 设置状态 */
export interface SettingsState {
  /** 选中的提供者 */
  selectedProvider: string;
  /** API 密钥 */
  apiKey: string;
  /** API 密钥是否已提交 */
  isApiKeySubmitted: boolean;
  /** 选中的模型 */
  selectedModel: string;
  /** 自定义模型 */
  customModel: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 可用模型列表 */
  availableModels: string[];
  /** 是否正在加载模型 */
  isLoadingModels: boolean;
  /** 模型获取错误信息 */
  modelsFetchError: string | null;
  /** OpenAI API 密钥 */
  openAiApiKey: string;
  /** OpenAI API 密钥是否已提交 */
  isOpenAiApiKeySubmitted: boolean;
  /** 截图配置 */
  screenshotConfig: ScreenshotConfig;
  /** 选中的语音提供者 */
  selectedSpeechProvider: string;
  /** 语音提供者列表 */
  speechProviders: SpeechProvider[];
  /** 语音提供者是否已提交 */
  isSpeechProviderSubmitted: boolean;
}

/** 模型选择组件属性 */
export interface ModelSelectionProps {
  /** 提供者 */
  provider: string;
  /** 选中的模型 */
  selectedModel: string;
  /** 自定义模型 */
  customModel: string;
  /** 模型变更回调 */
  onModelChange: (value: string) => void;
  /** 自定义模型变更回调 */
  onCustomModelChange: (value: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 可用模型列表 */
  availableModels?: string[];
  /** 是否正在加载模型 */
  isLoadingModels?: boolean;
  /** 模型获取错误 */
  modelsFetchError?: string | null;
}

/** 选中的语音提供者 */
export interface SelectedSpeechProvider {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 是否已配置 */
  isConfigured: boolean;
  /** API 密钥 */
  apiKey?: string;
}
