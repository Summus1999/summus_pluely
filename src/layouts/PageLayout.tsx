import { Header, ScrollArea } from "@/components";

interface PageLayoutProps {
  /** 子内容 */
  children: React.ReactNode;
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description: string;
  /** 右侧操作区域 */
  rightSlot?: React.ReactNode;
  /** 是否显示返回按钮 */
  allowBackButton?: boolean;
  /** 是否为主标题 */
  isMainTitle?: boolean;
}

/**
 * PageLayout - 页面内容布局组件
 *
 * 提供统一的页面头部和可滚动内容区域布局
 *
 * @example
 * <PageLayout title="设置" description="管理应用配置">
 *   <SettingsForm />
 * </PageLayout>
 */
export const PageLayout = ({
  children,
  title,
  description,
  rightSlot,
  allowBackButton = false,
  isMainTitle = true,
}: PageLayoutProps) => {
  return (
    <div className="flex flex-1 flex-col">
      <header className="pt-8">
        <Header
          isMainTitle={isMainTitle}
          showBorder={true}
          title={title}
          description={description}
          rightSlot={rightSlot}
          allowBackButton={allowBackButton}
        />
      </header>

      <ScrollArea className="h-[calc(100vh-5rem)] pr-6">
        <div className="flex flex-col gap-6 pb-12 pt-4 px-1">{children}</div>
      </ScrollArea>
    </div>
  );
};
