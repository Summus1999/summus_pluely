import {
  ResponseLength,
  LanguageSelector,
  AutoScrollToggle,
} from "./components";
import { PageLayout } from "@/layouts";

const Responses = () => {
  return (
    <PageLayout
      title="响应设置"
      description="自定义 AI 生成和显示响应的方式"
    >
      {/* Response Length */}
      <ResponseLength />

      {/* Language Selector */}
      <LanguageSelector />

      {/* Auto-Scroll Toggle */}
      <AutoScrollToggle />
    </PageLayout>
  );
};

export default Responses;
