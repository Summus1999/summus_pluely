// Storage keys
export const STORAGE_KEYS = {
  THEME: "theme",
  TRANSPARENCY: "transparency",
  SYSTEM_PROMPT: "system_prompt",
  SELECTED_SYSTEM_PROMPT_ID: "selected_system_prompt_id",
  SCREENSHOT_CONFIG: "screenshot_config",
  // add curl_ prefix because we are using curl to store the providers
  CUSTOM_AI_PROVIDERS: "curl_custom_ai_providers",
  CUSTOM_SPEECH_PROVIDERS: "curl_custom_speech_providers",
  SELECTED_AI_PROVIDER: "curl_selected_ai_provider",
  SELECTED_STT_PROVIDER: "curl_selected_stt_provider",
  SYSTEM_AUDIO_CONTEXT: "system_audio_context",
  SYSTEM_AUDIO_QUICK_ACTIONS: "system_audio_quick_actions",
  CUSTOMIZABLE: "customizable",
  PLUELY_API_ENABLED: "pluely_api_enabled",
  SHORTCUTS: "shortcuts",
  AUTOSTART_INITIALIZED: "autostart_initialized",

  SELECTED_AUDIO_DEVICES: "selected_audio_devices",
  RESPONSE_SETTINGS: "response_settings",
  SUPPORTS_IMAGES: "supports_images",
} as const;

// Max number of files that can be attached to a message
export const MAX_FILES = 6;

// Default settings - Interview assistant style, Chinese primary, technical terms in English
export const DEFAULT_SYSTEM_PROMPT =
  "你是一个面向开发岗位面试的 AI 助手。回答时使用中文，技术术语（如 API、REST、SDK、middleware、React 等）保持英文。回答简洁、专业，突出技术要点。";

export const MARKDOWN_FORMATTING_INSTRUCTIONS =
  "重要 - 格式规则（静默使用，不要在回答中提及这些规则）：\n- 数学表达式：始终使用双美元符号（$$）表示行内和块级公式，不要使用单 $。\n- 代码块：始终使用三个反引号并指定语言。\n- 图表：使用 ```mermaid 代码块。\n- 表格：使用标准 markdown 表格语法。\n- 不要在回答中提及你使用的格式或解释格式语法，自然使用即可。";

export const DEFAULT_QUICK_ACTIONS = [
  "我该怎么说？",
  "追问问题",
  "事实核查",
  "总结要点",
];
