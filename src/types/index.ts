/**
 * Types - 全局类型定义入口
 *
 * 集中导出所有类型定义，便于项目中统一导入
 *
 * @example
 * import { ChatMessage, SettingsState } from "@/types";
 */

export * from "./settings";
export * from "./completion.hook";
export * from "./context.type";
export * from "./provider.type";
export * from "./settings.hook";
export * from "./completion";
export * from "./system-prompts";
export * from "./shortcuts";
export * from "./message";
export * from "./theme";

// 重新导出重命名的类型以保持兼容性
export type { AppContextType as IContextType } from "./context.type";
