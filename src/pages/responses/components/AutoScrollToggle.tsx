import { Switch, Label, Header } from "@/components";
import { useApp } from "@/contexts";
import { useState, useEffect } from "react";
import { getResponseSettings, updateAutoScroll } from "@/lib";

export const AutoScrollToggle = () => {
  const { hasActiveLicense } = useApp();
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  useEffect(() => {
    const settings = getResponseSettings();
    setAutoScroll(settings.autoScroll);
  }, []);

  const handleSwitchChange = (checked: boolean) => {
    if (!hasActiveLicense) {
      return;
    }
    setAutoScroll(checked);
    updateAutoScroll(checked);
  };

  return (
    <div className="space-y-4">
      <Header
        title="自动滚动"
        description="控制响应是否自动滚动到底部。此设置立即生效，控制响应是否在流式输出时自动滚动到最新内容"
        isMainTitle
      />

      <div className="flex items-center justify-between p-4 border rounded-xl">
        <div className="flex items-center space-x-3">
          <div>
            <Label className="text-sm font-medium">
              {autoScroll ? "已启用自动滚动" : "已禁用自动滚动"}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {autoScroll
                ? "响应将自动滚动到底部"
                : "响应将保持在当前滚动位置"}
            </p>
          </div>
        </div>
        <Switch
          checked={autoScroll}
          onCheckedChange={handleSwitchChange}
          disabled={!hasActiveLicense}
          title={`切换${!autoScroll ? "启用" : "禁用"}自动滚动`}
          aria-label={`切换${autoScroll ? "禁用" : "启用"}自动滚动`}
        />
      </div>
    </div>
  );
};
