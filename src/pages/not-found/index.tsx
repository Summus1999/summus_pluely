import { Button } from "@/components";
import { Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * NotFound - 404 页面未找到组件
 *
 * 当用户访问不存在的路由时显示，提供返回首页或上一页的操作
 *
 * @example
 * <Route path="*" element={<NotFound />} />
 */
export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        {/* 404 图标 */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <span className="text-4xl font-bold text-muted-foreground">404</span>
        </div>

        {/* 错误信息 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            页面未找到
          </h1>
          <p className="text-muted-foreground">
            抱歉，您访问的页面不存在或已被移除
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="default"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回上一页
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
