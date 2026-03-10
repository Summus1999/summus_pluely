/**
 * UseSettings Return Type - useSettings Hook 返回类型
 *
 * 定义应用设置管理功能的类型
 */

import { ProviderConfig } from "./provider.type";
import { ScreenshotConfig, ScreenshotMode } from "./settings";

/** useSettings Hook 返回类型 */
export interface UseSettingsReturn {
  screenshotConfiguration: ScreenshotConfig;
  setScreenshotConfiguration: React.Dispatch<
    React.SetStateAction<ScreenshotConfig>
  >;
  handleScreenshotModeChange: (value: ScreenshotMode) => void;
  handleScreenshotPromptChange: (value: string) => void;
  handleScreenshotEnabledChange: (enabled: boolean) => void;
  allAiProviders: ProviderConfig[];
  allSttProviders: ProviderConfig[];
  selectedAIProvider: { provider: string; variables: Record<string, string> };
  selectedSttProvider: {
    provider: string;
    variables: Record<string, string>;
  };
  onSetSelectedAIProvider: (provider: {
    provider: string;
    variables: Record<string, string>;
  }) => void;
  onSetSelectedSttProvider: (provider: {
    provider: string;
    variables: Record<string, string>;
  }) => void;
  handleDeleteAllChatsConfirm: () => void;
  showDeleteConfirmDialog: boolean;
  setShowDeleteConfirmDialog: React.Dispatch<React.SetStateAction<boolean>>;
  variables: { key: string; value: string }[];
  sttVariables: { key: string; value: string }[];
}
