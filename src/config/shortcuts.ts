import { ShortcutAction } from "@/types";

export const DEFAULT_SHORTCUT_ACTIONS: ShortcutAction[] = [
  {
    id: "toggle_dashboard",
    name: "切换控制台",
    description: "打开/关闭控制台窗口",
    defaultKey: {
      macos: "cmd+shift+d",
      windows: "ctrl+shift+d",
      linux: "ctrl+shift+d",
    },
  },
  {
    id: "toggle_window",
    name: "切换窗口",
    description: "显示/隐藏主窗口",
    defaultKey: {
      macos: "cmd+backslash",
      windows: "ctrl+backslash",
      linux: "ctrl+backslash",
    },
  },
  {
    id: "focus_input",
    name: "聚焦输入框",
    description: "将 Pluely 置于前台并将光标移至输入区域",
    defaultKey: {
      macos: "cmd+shift+i",
      windows: "ctrl+shift+i",
      linux: "ctrl+shift+i",
    },
  },
  {
    id: "move_window",
    name: "移动窗口",
    description: "使用方向键移动悬浮窗（长按持续移动）",
    defaultKey: {
      macos: "cmd",
      windows: "ctrl",
      linux: "ctrl",
    },
  },
  {
    id: "system_audio",
    name: "系统音频",
    description: "切换系统音频采集",
    defaultKey: {
      macos: "cmd+shift+m",
      windows: "ctrl+shift+m",
      linux: "ctrl+shift+m",
    },
  },
  {
    id: "audio_recording",
    name: "语音输入",
    description: "开始语音录制",
    defaultKey: {
      macos: "cmd+shift+a",
      windows: "ctrl+shift+a",
      linux: "ctrl+shift+a",
    },
  },
  {
    id: "screenshot",
    name: "截图",
    description: "截取屏幕",
    defaultKey: {
      macos: "cmd+shift+s",
      windows: "ctrl+shift+s",
      linux: "ctrl+shift+s",
    },
  },
];
