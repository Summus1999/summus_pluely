/**
 * Shortcuts Types - 快捷键相关类型定义
 *
 * 定义快捷键动作、绑定和配置的类型
 */

/** 快捷键动作 */
export interface ShortcutAction {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 默认按键（各平台） */
  defaultKey: {
    macos: string;
    windows: string;
    linux: string;
  };
}

/** 快捷键绑定 */
export interface ShortcutBinding {
  /** 动作 ID */
  action: string;
  /** 按键 */
  key: string;
  /** 是否启用 */
  enabled: boolean;
}

/** 快捷键配置 */
export interface ShortcutsConfig {
  /** 快捷键绑定 */
  bindings: Record<string, ShortcutBinding>;
  /** 自定义动作 */
  customActions?: ShortcutAction[];
}

/** 快捷键冲突 */
export interface ShortcutConflict {
  /** 冲突的按键 */
  key: string;
  /** 冲突的动作列表 */
  actions: string[];
}
