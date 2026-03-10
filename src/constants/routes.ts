/**
 * 应用路由常量
 *
 * 集中管理所有路由路径，便于维护和重构
 *
 * @example
 * import { ROUTES } from "@/constants/routes";
 * <Link to={ROUTES.DASHBOARD}>Dashboard</Link>
 */
export const ROUTES = {
  /** 首页 */
  HOME: "/",
  /** 仪表盘 */
  DASHBOARD: "/dashboard",
  /** 聊天记录列表 */
  CHATS: "/chats",
  /** 查看聊天详情 */
  VIEW_CHAT: "/chats/view/:conversationId",
  /** 系统提示词管理 */
  SYSTEM_PROMPTS: "/system-prompts",
  /** 快捷键设置 */
  SHORTCUTS: "/shortcuts",
  /** 截图设置 */
  SCREENSHOT: "/screenshot",
  /** 应用设置 */
  SETTINGS: "/settings",
  /** 音频设置 */
  AUDIO: "/audio",
  /** 回复设置 */
  RESPONSES: "/responses",
} as const;

/** 路由常量类型 */
export type RouteKeys = keyof typeof ROUTES;
export type RoutePaths = (typeof ROUTES)[RouteKeys];
