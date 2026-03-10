# 截图功能问题诊断

## 问题分析

### 1. `supportsImages` 检测机制

当前逻辑（`app.context.tsx:507-509`）：
```typescript
const hasImageSupport = selectedProvider.curl?.includes("{{IMAGE}}") ?? false;
setSupportsImages(hasImageSupport);
```

**问题**：如果 AI Provider 的 curl 模板不包含 `{{IMAGE}}` 占位符，截图按钮会被完全禁用。

### 2. 配置初始化问题

`getActiveLicenseStatus` 函数（`app.context.tsx:147-154`）：
```typescript
setScreenshotConfiguration({
  mode: "auto",
  autoPrompt: "Analyze the screenshot and provide insights",
  enabled: false,  // <-- 这里强制设置为 false
});
```

首次启动时会强制将截图功能设为 `enabled: false`。

### 3. 截图交互流程

当前流程：
1. 用户点击截图按钮
2. 检查 `supportsImages`（如果不支持则禁用按钮）
3. 检查 `screenshotConfiguration.enabled`：
   - `true`：直接全屏截图
   - `false`：打开选区遮罩层
4. 选区模式下用户拖动选择区域
5. 调用 `capture_selected_area` 裁剪图片
6. 根据 `mode` 处理：
   - `auto`：直接发送给 AI
   - `manual`：添加到附件列表

## 预期行为 vs 实际行为

### 预期（用户需求）
1. 点击截图按钮
2. 选择屏幕区域（选区模式）
3. AI 自动识别题目并给题解

### 实际（当前实现）
1. 需要正确配置 AI Provider（支持图片）
2. 需要手动设置截图模式
3. 自动模式下可以自动分析，但可能没有预设好的"面试题分析"提示词

## 修复方案

### 方案 1：修复 `supportsImages` 检测（推荐）

不是所有 AI Provider 都在 curl 中显式使用 `{{IMAGE}}`，应该：
- 或者默认启用截图功能
- 或者在 Provider 配置中明确标记是否支持图片

### 方案 2：优化首次配置

不要强制设置 `enabled: false`，让用户自己选择。

### 方案 3：添加默认的面试题分析提示词

对于面试场景，可以预设一个专门用于分析面试题的提示词。

## 检查清单

用户遇到问题时，请检查：

1. [ ] AI Provider 是否已配置？
2. [ ] `supports_images` 在 localStorage 中是否为 `true`？
3. [ ] Screenshot 配置是否为期望的模式？
4. [ ] 如果是选区模式，遮罩层是否正常显示？
5. [ ] 截图后是否有错误提示？
