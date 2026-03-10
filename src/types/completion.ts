/**
 * Completion Types - AI 对话补全相关类型定义
 *
 * 定义对话状态、消息结构和提供者相关类型
 */

import type { AttachedFile, ChatMessage, ChatConversation } from "./message";

// Re-export base types
export type { AttachedFile, ChatMessage, ChatConversation };

/** 补全状态 */
export interface CompletionState {
  /** 输入文本 */
  input: string;
  /** 响应文本 */
  response: string;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 附件文件列表 */
  attachedFiles: AttachedFile[];
  /** 当前对话 ID */
  currentConversationId: string | null;
  /** 对话历史 */
  conversationHistory: ChatMessage[];
}

/** 消息内容的多模态部分 */
export interface MessageContentPart {
  type: string;
  /** 文本内容 */
  text?: string;
  /** 图片 URL */
  image_url?: { url: string };
  /** 图片来源（Anthropic 格式） */
  source?: {
    type: "base64" | "url";
    media_type?: string;
    data?: string;
    url?: string;
  };
  /** 内联数据（Gemini 格式） */
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

/** 消息（用于 API 请求） */
export interface Message {
  /** 角色 */
  role: "system" | "user" | "assistant";
  /** 内容（文本或多模态） */
  content: string | MessageContentPart[];
}
