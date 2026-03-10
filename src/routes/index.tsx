import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  Dashboard,
  App,
  SystemPrompts,
  ViewChat,
  Settings,
  Shortcuts,
  Audio,
  Screenshot,
  Chats,
  Responses,
  NotFound,
} from "@/pages";
import { DashboardLayout } from "@/layouts";
import { ROUTES } from "@/constants/routes";

interface AppRoutesProps {
  // 当前无 props，为未来扩展预留
}

/**
 * AppRoutes - 应用路由配置组件
 *
 * 定义应用的所有路由配置，包括：
 * - 根路径 `/`：主应用页面
 * - `/dashboard` 及其子路由：仪表盘相关页面（使用 DashboardLayout 布局）
 * - 404 页面：处理所有未匹配路由
 *
 * @example
 * <AppRoutes />
 */
export const AppRoutes = (_props: AppRoutesProps) => {
  return (
    <Router>
      <Routes>
        {/* 根路由 - 主应用 */}
        <Route path={ROUTES.HOME} element={<App />} />

        {/* 仪表盘布局路由组 */}
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.CHATS} element={<Chats />} />
          <Route path={ROUTES.SYSTEM_PROMPTS} element={<SystemPrompts />} />
          <Route path={ROUTES.VIEW_CHAT} element={<ViewChat />} />
          <Route path={ROUTES.SHORTCUTS} element={<Shortcuts />} />
          <Route path={ROUTES.SCREENSHOT} element={<Screenshot />} />
          <Route path={ROUTES.SETTINGS} element={<Settings />} />
          <Route path={ROUTES.AUDIO} element={<Audio />} />
          <Route path={ROUTES.RESPONSES} element={<Responses />} />
        </Route>

        {/* 404 页面 - 捕获所有未匹配路由 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};
