# Conventional Commits Skill

在 Pluely 项目中使用 Conventional Commits 规范提交代码。

## 快速参考

### 基本格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 常用 Type

| Type | 使用场景 |
|------|----------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式 |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试 |
| `build` | 构建 |
| `ci` | CI/CD |
| `chore` | 杂项 |

### 常用 Scope

- `audio` - 系统音频
- `ui` - UI 组件
- `hooks` - React Hooks
- `api` - API 调用
- `config` - 配置
- `deps` - 依赖

## 示例

```bash
# 功能开发
git commit -m "feat(audio): add support for custom VAD threshold"

# Bug 修复
git commit -m "fix(ui): resolve popover flickering issue"

# 文档
git commit -m "docs: update README with new features"

# 带 body 的提交
git commit -m "feat(audio): add noise gate to VAD processing" -m "The previous implementation was too sensitive to background noise."

# 带 Issue 引用
git commit -m "fix(audio): resolve memory leak" -m "Fixes #123"
```

## 提交前检查

husky 会自动验证提交信息，不合规会被拒绝。

## 生成 CHANGELOG

```bash
npm run changelog
```

## 发布新版本

```bash
npm run version:bump patch  # 或 minor, major
```

## 完整文档

详见 [docs/CONVENTIONAL_COMMITS.md](../../../docs/CONVENTIONAL_COMMITS.md)
