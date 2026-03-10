/**
 * Provider Configuration - 基础提供者配置接口
 *
 * 定义 AI 和 STT 提供者的通用字段
 */
export interface ProviderConfig {
  /** 唯一标识符 */
  id?: string;
  /** 是否支持流式响应 */
  streaming?: boolean;
  /** 响应内容提取路径（JSONPath） */
  responseContentPath?: string;
  /** 是否为自定义提供者 */
  isCustom?: boolean;
  /** cURL 命令模板 */
  curl: string;
}

/** @deprecated 请使用 ProviderConfig */
export type TYPE_PROVIDER = ProviderConfig;

/**
 * AI Provider configuration
 * Used in ai-providers.constants.ts
 */
export interface AIProvider {
  /** Unique identifier for the provider */
  id: string;
  /** cURL command template with placeholders like {{API_KEY}}, {{MODEL}} */
  curl: string;
  /** JSONPath to extract response content from API response */
  responseContentPath: string;
  /** Whether the provider supports streaming responses */
  streaming: boolean;
}

/**
 * Speech-to-Text Provider configuration
 * Used in stt.constants.ts
 */
export interface STTProvider {
  /** Unique identifier for the provider */
  id: string;
  /** Display name for the provider */
  name: string;
  /** cURL command template with placeholders like {{API_KEY}}, {{AUDIO}} */
  curl: string;
  /** JSONPath to extract transcription from API response */
  responseContentPath: string;
  /** Whether the provider supports streaming (typically false for STT) */
  streaming: boolean;
}
