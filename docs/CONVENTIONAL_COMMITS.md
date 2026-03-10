# Conventional Commits 使用指南

本文档说明如何在 Pluely 项目中使用 Conventional Commits 规范。

---

## 什么是 Conventional Commits？

Conventional Commits 是一种提交信息规范，通过结构化提交信息实现：
- 自动生成 CHANGELOG
- 自动版本号管理（语义化版本）
- 清晰的代码历史

---

## 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（类型）

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(audio): add noise gate to VAD` |
| `fix` | Bug 修复 | `fix(ui): resolve popover flickering` |
| `docs` | 文档更新 | `docs: update README with new features` |
| `style` | 代码格式（不影响功能） | `style: format with prettier` |
| `refactor` | 代码重构 | `refactor(hooks): extract shared logic` |
| `perf` | 性能优化 | `perf(audio): reduce CPU usage by 20%` |
| `test` | 测试相关 | `test: add unit tests for VAD` |
| `build` | 构建相关 | `build: update vite config` |
| `ci` | CI/CD 配置 | `ci: add commitlint workflow` |
| `chore` | 杂项（依赖更新等） | `chore: update dependencies` |
| `revert` | 回滚提交 | `revert: feat(audio): remove VAD` |

### Scope（范围）

可选，标识修改的模块：

| Scope | 说明 |
|-------|------|
| `audio` | 系统音频捕获 |
| `ui` | UI 组件 |
| `hooks` | React Hooks |
| `api` | API 调用 |
| `config` | 配置文件 |
| `docs` | 文档 |
| `deps` | 依赖更新 |
| `ci` | CI/CD |

### Subject（主题）

- 使用命令式语气（"Add" 而非 "Added"）
- 首字母小写
- 不超过 100 字符
- 不以句号结尾

**正确示例**：
```
feat(audio): add support for custom VAD threshold
fix(ui): resolve memory leak in chat component
docs: update API documentation
```

**错误示例**：
```
feat(audio): Added support for custom VAD threshold  ❌ 使用了过去时
feat(audio): add support for custom VAD threshold.   ❌ 以句号结尾
feat: Add support for custom VAD threshold           ❌ 首字母大写
```

### Body（正文）

可选，详细说明修改内容：
- 解释**为什么**做这些修改
- 与之前的代码对比
- 每行不超过 100 字符

```
feat(audio): add noise gate to VAD processing

The previous implementation was too sensitive to background noise,
causing false positives during speech detection. This change adds
a configurable noise gate that filters out low-amplitude signals.

Fixes #123
```

### Footer（页脚）

用于引用 Issue 或标记破坏性变更：

```
feat(api): change authentication flow

BREAKING CHANGE: The authentication endpoint now requires
API key in the header instead of query parameter.

Fixes #456
Closes #789
```

---

## 使用方法

### 手动提交

```bash
git add .
git commit -m "feat(audio): add support for custom VAD threshold"
```

### 使用 commitizen（交互式）

```bash
# 安装 commitizen（可选，用于交互式提交）
npm install -g commitizen

# 使用交互式提交
git cz
```

### 提交前检查

husky 会自动运行：
- `commit-msg` 钩子：验证提交信息格式
- `pre-commit` 钩子：运行类型检查

如果提交信息不符合规范，提交会被拒绝：
```
⧗   input: fix bug
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]

✖   found 2 problems, 0 warnings
```

---

## 生成 CHANGELOG

### 手动生成

```bash
# 生成 CHANGELOG
npm run changelog
```

### 发布新版本

1. 确定版本类型：
   - `feat` → minor 版本 (0.1.0 → 0.2.0)
   - `fix` → patch 版本 (0.1.0 → 0.1.1)
   - `BREAKING CHANGE` → major 版本 (0.1.0 → 1.0.0)

2. 更新版本号（同时更新 package.json 和 Cargo.toml）：
   ```bash
   # 更新前端版本
   npm version patch|minor|major
   
   # 手动更新 Rust 版本
   # 编辑 src-tauri/Cargo.toml 和 src-tauri/tauri.conf.json
   ```

3. 生成 CHANGELOG：
   ```bash
   npm run changelog
   ```

4. 提交并打标签：
   ```bash
   git add CHANGELOG.md package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
   git commit -m "chore(release): bump version to x.x.x"
   git tag v$(node -p "require('./package.json').version")
   git push origin main --tags
   ```

---

## 常见错误

### 1. 提交信息被拒绝了

```bash
$ git commit -m "fix bug"
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
```

**解决**：添加 type 和 scope
```bash
git commit -m "fix(ui): resolve button click issue"
```

### 2. 提交信息太长

```bash
✖   header must not be longer than 100 characters [header-max-length]
```

**解决**：缩短提交信息，详细内容放 body
```bash
git commit -m "fix(ui): resolve button click issue" -m "详细说明放在这里..."
```

### 3. 提交了才发现格式错误

```bash
# 修改最后一次提交
git commit --amend -m "fix(ui): resolve button click issue"

# 如果是之前的提交，使用 rebase
git rebase -i HEAD~3
# 将 pick 改为 reword，保存后修改提交信息
```

---

## 提交信息示例

### 功能开发

```bash
feat(audio): add support for multiple audio devices
feat(ui): implement dark mode toggle
feat(api): add retry logic for failed requests
```

### Bug 修复

```bash
fix(audio): resolve memory leak in VAD processing
fix(ui): correct popover positioning on small screens
fix(config): handle missing provider configuration gracefully
```

### 重构

```bash
refactor(hooks): extract useAudioCapture from useSystemAudio
refactor(lib): consolidate duplicate type definitions
refactor(components): simplify Button component API
```

### 性能优化

```bash
perf(audio): reduce VAD CPU usage by 30%
perf(ui): virtualize chat message list
perf(api): implement request batching
```

### 文档

```bash
docs: add troubleshooting guide
docs(api): document error codes
docs(README): update installation instructions
```

### 测试

```bash
test: add unit tests for audio processing
test(hooks): increase useSystemAudio coverage to 80%
test(e2e): add screenshot capture flow test
```

---

## 参考资料

- [Conventional Commits 规范](https://www.conventionalcommits.org/)
- [Angular 提交规范](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-format)
- [Semantic Versioning](https://semver.org/)
