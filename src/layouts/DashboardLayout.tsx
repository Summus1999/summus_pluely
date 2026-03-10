import { Sidebar } from "@/components";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorLayout } from "./ErrorLayout";

/**
 * DashboardLayout - 仪表盘页面布局组件
 *
 * 提供侧边栏 + 主内容区的布局结构，包含错误边界处理
 * 支持 Tauri 窗口拖拽功能
 *
 * @example
 * // 在路由配置中使用
 * <Route element={<DashboardLayout />}>
 *   <Route path="/" element={<HomePage />} />
 * </Route>
 */
export const DashboardLayout = () => {
  return (
    <ErrorBoundary
      fallbackRender={() => {
        return <ErrorLayout />;
      }}
      resetKeys={["dashboard-error"]}
      onReset={() => {
        console.log("Reset");
      }}
    >
      <div className="relative flex h-screen w-screen overflow-hidden bg-background">
        {/* Draggable region */}
        <div
          role="toolbar"
          aria-label="窗口拖拽区域"
          className="absolute left-0 right-0 top-0 z-50 h-10 select-none"
          data-tauri-drag-region
        />

        {/* Sidebar */}
        <Sidebar />
        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden px-8">
          <Outlet />
        </main>
      </div>
    </ErrorBoundary>
  );
};
