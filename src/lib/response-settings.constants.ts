export interface ResponseLengthOption {
  id: "short" | "medium" | "auto";
  title: string;
  description: string;
  prompt: string;
}

export interface LanguageOption {
  id: string;
  name: string;
  flag: string;
  prompt: string;
}

export const RESPONSE_LENGTHS: ResponseLengthOption[] = [
  {
    id: "short",
    title: "简短",
    description: "适合快速回答、总结，以及需要节省时间的场景",
    prompt:
      "重要：你必须保持回答极其简洁。将答案限制在 2-4 句话以内。只提供最核心的信息。除非明确要求，否则不要包含解释、示例或额外背景。直击要点。这是严格要求。",
  },
  {
    id: "medium",
    title: "适中",
    description: "平衡的回答，适合大多数任务",
    prompt:
      "重要：提供适中长度的回答，既不太简短也不太冗长。保持 1-2 段（约 4-8 句话）。包含关键解释和相关细节，但避免过于啰嗦或添加不必要的阐述。保持专注和有条理。这是严格要求。",
  },
  {
    id: "auto",
    title: "自动",
    description: "AI 根据问题复杂度自动决定最佳长度",
    prompt:
      "重要：仔细评估问题的复杂度和范围，然后相应调整回答长度。简单问题简短回答（2-4 句）。中等复杂度问题提供平衡的细节（1-2 段）。复杂问题给出全面且有深度的回答。始终使回答长度与问题实际需求相匹配，不多不少。",
  },
];

export const LANGUAGES: LanguageOption[] = [
  {
    id: "english",
    name: "English",
    flag: "🇺🇸",
    prompt: "Respond in English.",
  },
  {
    id: "spanish",
    name: "Spanish",
    flag: "🇪🇸",
    prompt: "Respond in Spanish (Español).",
  },
  {
    id: "french",
    name: "French",
    flag: "🇫🇷",
    prompt: "Respond in French (Français).",
  },
  {
    id: "german",
    name: "German",
    flag: "🇩🇪",
    prompt: "Respond in German (Deutsch).",
  },
  {
    id: "italian",
    name: "Italian",
    flag: "🇮🇹",
    prompt: "Respond in Italian (Italiano).",
  },
  {
    id: "portuguese",
    name: "Portuguese",
    flag: "🇵🇹",
    prompt: "Respond in Portuguese (Português).",
  },
  {
    id: "dutch",
    name: "Dutch",
    flag: "🇳🇱",
    prompt: "Respond in Dutch (Nederlands).",
  },
  {
    id: "russian",
    name: "Russian",
    flag: "🇷🇺",
    prompt: "Respond in Russian (Русский).",
  },
  {
    id: "chinese",
    name: "中文",
    flag: "🇨🇳",
    prompt: "使用简体中文回答，技术术语保持英文。",
  },
  {
    id: "japanese",
    name: "Japanese",
    flag: "🇯🇵",
    prompt: "Respond in Japanese (日本語).",
  },
  {
    id: "korean",
    name: "Korean",
    flag: "🇰🇷",
    prompt: "Respond in Korean (한국어).",
  },
  {
    id: "arabic",
    name: "Arabic",
    flag: "🇸🇦",
    prompt: "Respond in Arabic (العربية).",
  },
  {
    id: "turkish",
    name: "Turkish",
    flag: "🇹🇷",
    prompt: "Respond in Turkish (Türkçe).",
  },
  {
    id: "polish",
    name: "Polish",
    flag: "🇵🇱",
    prompt: "Respond in Polish (Polski).",
  },
  {
    id: "swedish",
    name: "Swedish",
    flag: "🇸🇪",
    prompt: "Respond in Swedish (Svenska).",
  },
  {
    id: "norwegian",
    name: "Norwegian",
    flag: "🇳🇴",
    prompt: "Respond in Norwegian (Norsk).",
  },
  {
    id: "danish",
    name: "Danish",
    flag: "🇩🇰",
    prompt: "Respond in Danish (Dansk).",
  },
  {
    id: "finnish",
    name: "Finnish",
    flag: "🇫🇮",
    prompt: "Respond in Finnish (Suomi).",
  },
  {
    id: "greek",
    name: "Greek",
    flag: "🇬🇷",
    prompt: "Respond in Greek (Ελληνικά).",
  },
  {
    id: "czech",
    name: "Czech",
    flag: "🇨🇿",
    prompt: "Respond in Czech (Čeština).",
  },
  {
    id: "hungarian",
    name: "Hungarian",
    flag: "🇭🇺",
    prompt: "Respond in Hungarian (Magyar).",
  },
  {
    id: "romanian",
    name: "Romanian",
    flag: "🇷🇴",
    prompt: "Respond in Romanian (Română).",
  },
  {
    id: "ukrainian",
    name: "Ukrainian",
    flag: "🇺🇦",
    prompt: "Respond in Ukrainian (Українська).",
  },
  {
    id: "vietnamese",
    name: "Vietnamese",
    flag: "🇻🇳",
    prompt: "Respond in Vietnamese (Tiếng Việt).",
  },
  {
    id: "thai",
    name: "Thai",
    flag: "🇹🇭",
    prompt: "Respond in Thai (ไทย).",
  },
  {
    id: "indonesian",
    name: "Indonesian",
    flag: "🇮🇩",
    prompt: "Respond in Indonesian (Bahasa Indonesia).",
  },
  {
    id: "malay",
    name: "Malay",
    flag: "🇲🇾",
    prompt: "Respond in Malay (Bahasa Melayu).",
  },
  {
    id: "hebrew",
    name: "Hebrew",
    flag: "🇮🇱",
    prompt: "Respond in Hebrew (עברית).",
  },
  {
    id: "filipino",
    name: "Filipino",
    flag: "🇵🇭",
    prompt: "Respond in Filipino (Tagalog).",
  },
];

export const DEFAULT_RESPONSE_LENGTH = "auto";
export const DEFAULT_LANGUAGE = "chinese";
export const DEFAULT_AUTO_SCROLL = true;
