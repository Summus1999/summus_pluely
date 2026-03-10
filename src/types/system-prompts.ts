/**
 * System Prompts Types - 系统提示词相关类型定义
 *
 * 定义系统提示词的创建、更新和存储类型
 */

/** 系统提示词 */
export interface SystemPrompt {
  /** 唯一标识符 */
  id: number;
  /** 显示名称 */
  name: string;
  /** 提示词内容 */
  prompt: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/** 创建系统提示词输入 */
export interface SystemPromptInput {
  /** 显示名称 */
  name: string;
  /** 提示词内容 */
  prompt: string;
}

/** 更新系统提示词输入 */
export interface UpdateSystemPromptInput {
  /** 显示名称（可选） */
  name?: string;
  /** 提示词内容（可选） */
  prompt?: string;
}
