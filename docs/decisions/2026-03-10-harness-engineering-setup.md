# Decision: Harness Engineering Framework Setup

**Date**: 2026-03-10  
**Status**: Accepted  
**Deciders**: AI Agent + Human Engineer

---

## Context

随着 AI Agent 在项目中的深度参与，需要建立一套系统性的工程实践来确保代码质量和开发效率。基于 Harness Engineering 理念，我们需要为 Pluely 项目建立约束机制、反馈回路和工作流控制。

## Decision

实施 Harness Engineering 框架，包括以下组件：

### 1. Agent.md 活文档

在项目根目录创建 `Agent.md`，作为 AI Agent 的操作指南和约束规范：

- 项目概览和结构
- 上下文架构（Tier 1-3）
- 专业化 Agent 角色定义
- 编码约束与规范
- 四层反馈闭环
- Pluely 特有陷阱和最佳实践

### 2. 进度追踪机制

创建 `docs/active-features.json` 用于追踪当前活跃功能的状态。

创建 `docs/decisions/` 目录用于记录架构决策。

### 3. 四层反馈闭环

| 层级 | 工具/方法 | 执行者 |
|------|----------|--------|
| 编译检查 | `npx tsc --noEmit`, `cargo check` | Agent |
| 单元测试 | `cargo test` | Agent |
| 端到端验证 | 手动测试清单 | Human |
| CI Pipeline | GitHub Actions | Automated |

## Consequences

### Positive

- AI Agent 有明确的操作指南，减少错误
- 知识持久化在文件中，不依赖上下文窗口
- 进度可视化，便于项目管理
- 约束机制确保代码质量

### Negative

- 需要持续维护 Agent.md
- 进度追踪增加了轻微的管理开销

## Implementation

- [x] 创建 Agent.md 初始版本
- [x] 创建 docs/active-features.json
- [x] 创建 docs/decisions/ 目录
- [ ] 后续迭代完善 Agent.md 中的陷阱记录

## References

- [Harness Engineering](../../Harness%20engineering.md)
- [Harness Engineering (OpenAI)](https://openai.com/index/introducing-swarm/)
