# Pluely Agent Harness 文档

> 本文档是 AI Agent 在 Pluely 项目中的操作指南和约束规范。
> 每次会话开始时，Agent 必须阅读此文档。
> 当 Agent 犯错时，人类工程师应更新此文档以改进约束。

---

## 1. 项目概览

**Pluely** 是一个桌面 AI 助手应用，基于 Tauri (Rust + TypeScript/React) 构建。

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **后端**: Rust (Tauri)
- **平台**: Windows, macOS, Linux
- **核心功能**: 系统音频捕获、AI 对话、语音转文字、截图分析

### 1.1 项目结构

```
src/                    # 前端代码
  ├── hooks/            # React Hooks (useSystemAudio, useCompletion, etc.)
  ├── components/       # UI 组件
  ├── lib/              # 工具函数和 API 封装
  ├── contexts/         # React Context
  ├── pages/            # 页面组件
  └── config/           # 配置文件和常量

src-tauri/              # Rust 后端代码
  ├── src/
  │   ├── speaker/      # 系统音频捕获模块
  │   ├── shortcuts/    # 全局快捷键
  │   └── lib.rs        # 主入口
  └── Cargo.toml

docs/plans/             # 功能规划和检查清单
```

---

## 2. 上下文架构 (Tier 1-3)

### Tier 1: 会话常驻（每次会话自动加载）

- **Agent.md** (本文档) - 项目级约束和操作指南
- **CLAUDE.md** - 编码风格和项目约定
- 项目根目录结构概览

### Tier 2: 按需加载（特定任务时读取）

| 任务类型 | 需要读取的文件 |
|----------|---------------|
| 系统音频功能 | `docs/plans/system-audio-logging-checklist.md` |
| 添加新 AI Provider | `src/config/ai-providers.constants.ts` |
| 添加新 STT Provider | `src/config/stt.constants.ts` |
| UI 组件开发 | `components.json`, `src/components/ui/` |
| 修改 `src-tauri/src/lib.rs` | 本文档 7 节「陷阱 11：macOS lib.rs 构建失败」 |

### Tier 3: 持久化知识库（主动查询）

- 历史 PR 和 Issue（`.github/`）
- 设计决策记录（`docs/`）
- 代码注释和文档字符串

---

## 3. 专业化 Agent 角色

根据 Harness Engineering 原则，不同任务应激活不同的 Agent 角色：

| Agent 角色 | 适用场景 | 工具权限 | 约束 |
|------------|----------|----------|------|
| **研究 Agent** | 探索代码库、理解现有实现 | 只读 (Read, Grep, Glob) | 禁止修改代码 |
| **规划 Agent** | 将需求分解为结构化任务 | 只读 | 输出为 Markdown/JSON 计划 |
| **执行 Agent** | 实现单个具体功能 | 限定范围读写 | 单次会话只处理一个功能 |
| **审查 Agent** | 代码审查、问题标记 | 只读 + 评论 | 输出审查报告 |
| **调试 Agent** | 修复 Bug | 限定修复权限 | 必须验证修复 |

### 3.1 当前会话角色激活

默认角色：**执行 Agent**

如需切换角色，人类工程师应明确指示："切换到 [角色] 模式"

---

## 4. 编码约束与规范

### 4.1 架构依赖方向

```
Types → Config → Lib → Hooks → Components → Pages
```

**禁止反向依赖**：

- `lib/` 不能导入 `hooks/`
- `config/` 不能导入 `lib/`
- `hooks/` 不能导入 `pages/`

### 4.2 文件命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| Hooks | `useCamelCase.ts` | `useSystemAudio.ts` |
| 组件 | `PascalCase.tsx` | `Button.tsx` |
| 工具函数 | `camelCase.ts` | `ai-response.function.ts` |
| 常量配置 | `SCREAMING_SNAKE.ts` | `ai-providers.constants.ts` |

### 4.3 日志规范

**前端日志**：

- 使用 `console.info` / `console.warn` / `console.error`
- 统一前缀：`[system-audio]`, `[completion]`, `[settings]` 等
- 字段：`sessionId`, `action`, `result`, `reason`, `elapsedMs`

**后端日志**：

- 使用 `tracing::info!` / `tracing::warn!` / `tracing::error!`
- 统一前缀：`[speaker]`, `[shortcuts]`, `[api]` 等

### 4.4 类型安全

- **强制 TypeScript strict 模式**
- 所有函数参数和返回值必须显式类型
- 禁止使用 `any`，使用 `unknown` + 类型守卫

---

## 5. 四层反馈闭环

### 5.1 第一层：编译检查

每次代码修改后立即运行：

```bash
# 前端类型检查
npx tsc --noEmit

# Rust 编译检查
cd src-tauri && cargo check
```

**失败 = 立即修复，不得继续**

### 5.2 第二层：单元测试

项目中已有的测试：

- `src-tauri/src/speaker/commands.rs` 中的 VAD 测试

运行命令：

```bash
cd src-tauri && cargo test
```

### 5.3 第三层：端到端验证

**本地无构建环境时的方案**：

- Agent 完成修改并确保编译通过后提交代码
- 人类工程师在本地进行端到端测试
- 发现的问题在下次会话中修复

**测试清单**（人类工程师验证用）：

- [ ] 应用能正常启动
- [ ] 系统音频捕获功能正常（VAD 模式）
- [ ] 系统音频捕获功能正常（连续模式）
- [ ] AI 对话流式响应正常
- [ ] 设置页面能正常保存配置
- [ ] 截图功能正常
- [ ] 快捷键功能正常

### 5.4 第四层：CI Pipeline

GitHub Actions 工作流：

- `.github/workflows/ci.yml` - PR 时触发
- `.github/workflows/publish.yml` - 发布时触发

包含：类型检查、多平台构建、Tauri 打包。

**注意**：若修改了 `src-tauri/src/lib.rs`，本地 `cargo check` 无法验证 macOS 专用代码；需依赖 CI 的 macOS job 或本地 macOS 环境做完整构建验证。

---

## 6. 持久化记忆

### 6.1 进度追踪

当前活跃任务记录在：`docs/plans/`

格式：

```markdown
# Feature X Implementation Checklist

## Status: IN_PROGRESS

### Completed
- [x] Task 1
- [x] Task 2

### In Progress
- [ ] Task 3

### Pending
- [ ] Task 4
```

### 6.2 功能状态文件

建议创建：`docs/feature-status.json`

```json
{
  "features": [
    {
      "id": "system-audio-logging",
      "name": "System Audio Logging",
      "status": "completed",
      "lastUpdated": "2026-03-10"
    }
  ]
}
```

---

## 7. 常见错误与对策

### 通用错误

#### 错误 1：过早宣布胜利

**现象**：部分功能完成就声称任务完成。

**对策**：

- 严格遵循检查清单
- 每个检查项必须有明确的完成标准
- 结束前运行四层反馈闭环

#### 错误 2：上下文窗口耗尽

**现象**：Agent 开始答非所问，工作效率下降。

**对策**：

- 上下文利用率保持在 40% 以下
- 使用 `ReadFile` 只读取需要的代码段
- 复杂任务分解为多个会话

#### 错误 3：架构约束违反

**现象**：出现循环依赖或跨层调用。

**对策**：

- 提交前检查导入关系
- 使用 `Grep` 验证依赖方向
- 违反时立即重构

#### 错误 4：类型错误

**现象**：TypeScript 编译失败。

**对策**：

- 每次修改后立即运行 `npx tsc --noEmit`
- 不依赖隐式类型推断
- 使用类型守卫处理 `unknown`

---

### Pluely 特有陷阱

#### 陷阱 1：Tauri Invoke 调用未处理错误

**现象**：

```typescript
// 错误：未处理可能的异常
await invoke("start_system_audio_capture", { config });
```

**正确做法**：

```typescript
// 正确：使用 try-catch 或 .catch()
try {
  await invoke("start_system_audio_capture", { config });
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  setError(message);
}

// 或 fire-and-forget 模式（明确忽略错误）
invoke("stop_system_audio_capture").catch(() => {});
```

**注意**：有些命令（如 `stop_system_audio_capture`）允许使用 fire-and-forget 模式，但必须在注释中说明原因。

#### 陷阱 2：事件监听未清理

**现象**：内存泄漏，多次注册同一事件监听器。

**错误**：

```typescript
useEffect(() => {
  listen("speech-detected", handler); // 没有保存 unlisten
}, []);
```

**正确做法**：

```typescript
useEffect(() => {
  let unlisten: (() => void) | undefined;
  
  const setup = async () => {
    unlisten = await listen("speech-detected", handler);
  };
  setup();
  
  return () => {
    if (unlisten) unlisten();
  };
}, []);
```

#### 陷阱 3：AbortController 未正确清理

**现象**：AI 流式响应被中断后，AbortController 未被清理，导致后续请求失败。

**参考实现**（`useSystemAudio.ts` 中的正确模式）：

```typescript
const abortControllerRef = useRef<AbortController | null>(null);

// 开始新请求前确保清理旧请求
if (abortControllerRef.current) {
  abortControllerRef.current.abort();
}
abortControllerRef.current = new AbortController();

// finally 中清理
finally {
  if (abortControllerRef.current?.signal === signal) {
    abortControllerRef.current = null;
  }
}
```

#### 陷阱 4：sessionId 过期检查遗漏

**现象**：异步操作（STT、AI）完成后，session 已切换，但仍更新旧 session 的状态。

**正确模式**：

```typescript
const sessionId = captureSessionIdRef.current;

// 异步操作...
const result = await fetchSTT(...);

// 检查 session 是否已过期
if (sessionId !== captureSessionIdRef.current) {
  console.warn("[system-audio] stt_request_dropped_stale", { sessionId });
  return; // 丢弃过期结果
}

// 更新状态
setState(result);
```

#### 陷阱 5：localStorage 操作未保护

**现象**：Tauri 应用在 SSR 或特殊环境下访问 localStorage 报错。

**正确做法**：始终使用 `safeLocalStorage`：

```typescript
import { safeLocalStorage } from "@/lib";

// 读取
const data = safeLocalStorage.getItem(STORAGE_KEYS.KEY);

// 写入
safeLocalStorage.setItem(STORAGE_KEYS.KEY, value);

// 解析 JSON 时必须 try-catch
try {
  const parsed = JSON.parse(data);
} catch (error) {
  console.error("Failed to parse:", error);
}
```

#### 陷阱 6：VAD 配置与后端不一致

**现象**：前端修改 VAD 参数后，后端行为不一致。

**注意**：

- VAD 配置必须前后端同步修改
- `DEFAULT_VAD_CONFIG` 在 `useSystemAudio.ts` 和 Rust `commands.rs` 中必须一致
- 修改配置时调用 `invoke("update_vad_config", { config })`

#### 陷阱 7：Rust 日志级别使用错误

**现象**：在 Rust 代码中使用 `println!` 或使用错误的日志级别。

**规范**：

```rust
// 正确
use tracing::{info, warn, error};

info!("[speaker] capture_start");   // 正常流程
warn!("[speaker] unexpected_state"); // 异常情况但可继续
error!("[speaker] capture_failed");  // 严重错误

// 错误
println!("debug message");  // 禁止使用
```

#### 陷阱 8：错误变量命名不一致

**现象**：同一个文件中使用 `error` 和 `err` 混用。

**规范**：统一使用 `error`：

```typescript
// 正确
try {
  // ...
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
}

// 错误
try {
  // ...
} catch (err) {  // 不要这样用
```

#### 陷阱 9：Provider 配置变量替换错误

**现象**：自定义 Provider 的 curl 模板变量未正确替换。

**注意**：

- 变量格式：`{{VARIABLE_NAME}}`
- 图片输入必须有 `{{IMAGE}}` 占位符
- STT 必须有 `{{AUDIO}}` 占位符
- 变量替换前必须验证所有必需变量非空

#### 陷阱 10：连续模式与 VAD 模式混淆

**现象**：

- `config.enabled = true` → VAD 模式（自动检测语音）
- `config.enabled = false` → 连续/手动模式（手动开始/停止）

**检查点**：

- `isContinuousMode = !config.enabled`
- 连续模式需要手动调用 `startContinuousRecording()`
- VAD 模式自动开始录音，检测到语音后自动处理

#### 陷阱 11：macOS lib.rs 构建失败

**现象**：CI 或本地 macOS 构建报错 `cannot find type AppHandle in this scope` 或 `cannot find type WebviewWindow in this scope`。

**根因**：`src-tauri/src/lib.rs` 中的 macOS 面板初始化（`tauri-nspanel`）仅在 `target_os = "macos"` 下参与编译，在 Windows/Linux 开发机上 `cargo check` 不会编译该段代码，因此容易在重构时被无意改坏。

**修改 lib.rs 时必须遵守**：

1. `init` 函数保持 Tauri 2 泛型签名：`fn init<R: Runtime>(app_handle: &AppHandle<R>)`
2. 窗口类型使用 `WebviewWindow<R>`，禁止裸类型 `WebviewWindow`
3. 顶部必须有条件导入：`#[cfg(target_os = "macos")] use tauri::{AppHandle, Runtime, WebviewWindow};`
4. `run()` 中 macOS 条件分支必须能继续挂载 `tauri_nspanel` 和 `tauri_plugin_macos_permissions`（使用条件 `let builder = builder.plugin(...)` 重新绑定，或保持 `let mut builder`）

**验证**：修改后必须在 macOS 环境或 CI 的 macOS job 中执行 `npm run tauri build` 或 `cargo check --target x86_64-apple-darwin`，Linux/Windows 的 `cargo check` 无法发现该段错误。

**参考**：`README.md` 中「macOS 构建维护说明」小节。

#### 陷阱 12：Tauri 命令未注册导致静默失败

**现象**：前端调用 `invoke("command_name")` 无响应，控制台仅打印 `console.error`，用户看不到任何错误提示。

**根因**：Rust 后端未在 `invoke_handler` 中注册该命令，或命令名拼写错误。

**正确做法**：

1. 前端调用前先用 `Grep` 搜索 Rust 代码确认命令已注册：
   ```bash
   # 搜索命令定义
   grep -r "pub async fn command_name" src-tauri/src/
   
   # 搜索命令注册
   grep -r "command_name" src-tauri/src/lib.rs
   ```

2. 检查 `src-tauri/src/lib.rs` 的 `invoke_handler` 列表：
   ```rust
   .invoke_handler(tauri::generate_handler![
       // 确保命令在这里
       capture::capture_to_base64,
       capture::start_screen_capture,
       // ...
   ])
   ```

3. 错误处理必须显示用户可见的错误信息：
   ```typescript
   try {
     await invoke("capture_to_base64");
   } catch (err) {
     const message = err instanceof Error ? err.message : String(err);
     setError(`截图失败：${message}`); // 用户可见
   }
   ```

**修复案例**：系统音频面板截图按钮调用 `capture_screenshot`（未注册），应改为 `capture_to_base64`。

#### 陷阱 13：模式切换时异步竞态条件

**现象**：从自动检测（VAD）切换到手动模式时，UI 已显示手动模式但仍在处理 VAD 捕获的语音，看起来像"还在抓录音"。

**根因**：模式切换流程存在异步窗口：
```typescript
// 错误：异步操作期间 VAD 仍可触发事件
setVadConfig(config);
await invoke("update_vad_config", { config }); // ← VAD 仍在运行
restartCaptureSession(config); // ← 此时才停止
```

**正确做法**：在异步操作前立即失效所有 in-flight 事件：
```typescript
if (capturing && modeChanged) {
  abortActiveAIRequest();                    // 中止 AI
  captureSessionIdRef.current += 1;          // 使旧事件失效
  transitionRef.current = true;              // 标记过渡状态
  setIsProcessing(false);                    // 清除 UI 状态
  setIsAIProcessing(false);
}

setVadConfig(config);
await invoke("update_vad_config", { config });
restartCaptureSession(config);
```

**关键原则**：
- 切换模式时先递增 `sessionId`，让旧事件处理器中的 stale check 丢弃结果
- 立即清除 UI 处理状态，给用户即时反馈
- 异步操作期间任何触发的事件都应被丢弃

#### 陷阱 14：supportsImages 检测过于严格

**现象**：截图按钮被禁用，即使 AI Provider 支持图片输入。

**根因**：检测逻辑依赖 curl 模板是否包含 `{{IMAGE}}` 占位符，但某些 Provider 可能不显式使用该占位符。

**正确做法**：
```typescript
// 不要仅依赖 curl 检测
const hasImageSupport = selectedProvider.curl?.includes("{{IMAGE}}") ?? false;

// 应该默认启用或在 Provider 配置中明确标记
const hasImageSupport = true; // 默认启用，让后端处理不支持的情况
```

或在 Provider 配置中添加显式标记：
```typescript
{
  id: "siliconflow",
  supportsImages: true,  // 显式标记
  curl: `...`,
}
```

---

## 8. 任务执行流程

### 标准执行流程

```
1. 阅读 Agent.md（本文档）
   ↓
2. 阅读任务相关的 Tier 2 文档
   ↓
3. 研究现有代码（研究 Agent 模式）
   ↓
4. 制定实施计划（规划 Agent 模式）
   ↓ [人类审查点]
5. 执行单个功能（执行 Agent 模式）
   ↓
6. 运行四层反馈闭环
   ↓
7. 更新进度文件
   ↓
8. 提交变更
```

### 人类审查点

以下情况需要人类工程师确认：

- 架构设计变更
- 新增外部依赖
- 修改现有 API 接口
- 删除已有功能

---

## 9. 项目特定知识

### 9.1 Tauri 命令调用

前端调用 Rust 命令：

```typescript
import { invoke } from "@tauri-apps/api/core";

// 系统音频捕获
await invoke("start_system_audio_capture", { vadConfig, deviceId });
await invoke("stop_system_audio_capture");
await invoke("flush_system_audio_capture");
```

### 9.2 状态管理

- **全局状态**: React Context (`src/contexts/`)
- **本地状态**: `useState`, `useReducer`
- **持久化状态**: `safeLocalStorage` 工具

### 9.3 事件监听

```typescript
import { listen } from "@tauri-apps/api/event";

const unlisten = await listen("speech-detected", (event) => {
  // 处理事件
});

// 清理
unlisten();
```

---

## 10. 更新记录

| 日期 | 更新者 | 内容 |
|------|--------|------|
| 2026-03-10 | AI | 创建初始版本，基于 Harness Engineering 框架 |
| 2026-03-10 | AI | 添加 Pluely 特有陷阱（10个常见错误模式） |
| 2026-03-10 | AI | 更新四层反馈闭环，明确人工测试环节 |
| 2026-03-11 | AI | 添加陷阱 11：macOS lib.rs 构建失败；Tier 2 增加 lib.rs 修改指引 |

---

## 11. 参考文档

- [Harness engineering.md](./Harness%20engineering.md) - Harness Engineering 原理
- [README.md](./README.md) - 项目介绍
- [CLAUDE.md](./CLAUDE.md) - 编码风格指南（如存在）

---

**记住：当本文档无法解决你的问题时，请要求人类工程师更新它。**
