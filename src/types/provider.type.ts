/**
 * Base provider interface with common fields
 */
export interface TYPE_PROVIDER {
  id?: string;
  streaming?: boolean;
  responseContentPath?: string;
  isCustom?: boolean;
  curl: string;
}

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
