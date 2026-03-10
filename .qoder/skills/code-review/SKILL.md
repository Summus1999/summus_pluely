# Code Review Skill

针对 Pluely 项目的代码审查指南，帮助 AI Agent 和人类工程师进行高质量的代码审查。

## 使用场景

- 提交 PR 前的自查
- 审查他人代码
- 学习项目代码规范

## 审查维度

### 1. 功能正确性 (Functionality)

- [ ] 代码是否实现了预期的功能？
- [ ] 是否处理了边界情况？
- [ ] 错误处理是否完善？
- [ ] 用户交互是否符合预期？

### 2. 代码质量 (Code Quality)

- [ ] TypeScript 类型是否完整？避免使用 `any`
- [ ] 函数是否单一职责？避免过长函数
- [ ] 命名是否清晰？使用有意义的变量名
- [ ] 是否有重复代码？考虑提取复用
- [ ] 注释是否必要且清晰？

### 3. 项目规范 (Project Standards)

- [ ] 是否符合 Agent.md 中的架构约束？
  - `lib/` 不导入 `hooks/`
  - `config/` 不导入 `lib/`
  - `hooks/` 不导入 `pages/`
- [ ] 文件命名是否符合规范？
  - Hooks: `useCamelCase.ts`
  - 组件: `PascalCase.tsx`
  - 工具函数: `camelCase.ts`
- [ ] 日志前缀是否正确？`[system-audio]`, `[speaker]` 等

### 4. 性能与安全 (Performance & Security)

- [ ] 是否有内存泄漏风险？（useEffect 清理）
- [ ] 是否有不必要的重渲染？
- [ ] 敏感信息是否硬编码？
- [ ] 用户输入是否验证？

### 5. 测试与文档 (Testing & Documentation)

- [ ] 是否有对应的测试？
- [ ] 复杂逻辑是否有注释说明？
- [ ] 公开 API 是否有使用文档？

## 前端特殊检查（React + TypeScript）

### Hooks 审查

```typescript
// ❌ 错误：事件监听未清理
useEffect(() => {
  listen('event', handler);
}, []);

// ✅ 正确：清理函数
useEffect(() => {
  let unlisten: (() => void) | undefined;
  const setup = async () => {
    unlisten = await listen('event', handler);
  };
  setup();
  return () => {
    if (unlisten) unlisten();
  };
}, []);
```

### Tauri Invoke 审查

```typescript
// ❌ 错误：未处理异常
await invoke("command");

// ✅ 正确：try-catch 处理
try {
  await invoke("command");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setError(message);
}
```

### 类型安全审查

```typescript
// ❌ 错误：使用 any
function process(data: any) { ... }

// ✅ 正确：明确类型
interface Data {
  id: string;
  value: number;
}
function process(data: Data) { ... }
```

## Rust 后端特殊检查

### 错误处理

```rust
// ❌ 错误：unwrap 可能导致 panic
let result = some_operation().unwrap();

// ✅ 正确：使用 ? 传播错误
let result = some_operation()?;
```

### 日志规范

```rust
// ❌ 错误：使用 println
println!("debug message");

// ✅ 正确：使用 tracing
use tracing::{info, warn, error};
info!("[speaker] capture_start");
```

## 审查流程

### 快速审查（5分钟）

1. 通读代码，理解意图
2. 检查明显的错误（语法、类型）
3. 确认是否符合项目规范

### 深度审查（15-30分钟）

1. 理解业务逻辑
2. 检查边界情况和错误处理
3. 验证架构约束
4. 检查测试覆盖
5. 提出改进建议

## 审查反馈模板

### 发现严重问题

```
🚨 **阻塞问题**
- 问题：...
- 影响：...
- 建议：...
```

### 发现改进建议

```
💡 **建议优化**
- 当前：...
- 建议：...
- 原因：...
```

### 发现好的实践

```
✅ **好评**
- ...
```

## 常见代码异味

| 异味 | 示例 | 解决方案 |
|------|------|----------|
| 重复代码 | 相同逻辑在多个地方 | 提取为公共函数 |
| 过长函数 | 函数超过 50 行 | 拆分为小函数 |
| 魔法数字 | `setTimeout(fn, 3000)` | 定义为常量 `const DEBOUNCE_MS = 3000` |
| 深层嵌套 | 多层 if/try 嵌套 | 提前返回、提取函数 |
| 不必要的状态 | `useState` 可以通过 props 计算 | 使用 useMemo |

## 工具推荐

- **ESLint**: 静态代码检查
- **TypeScript**: 类型检查
- **Rust Clippy**: Rust 代码检查
- **GitLens**: VS Code 插件，查看代码历史

## 参考文档

- [Agent.md](../../Agent.md) - 项目规范
- [Harness engineering.md](../../Harness%20engineering.md) - 工程实践
