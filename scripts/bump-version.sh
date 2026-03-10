#!/bin/bash

# bump-version.sh
# 用法: ./scripts/bump-version.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

# 检查是否在 git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not a git repository"
    exit 1
fi

# 检查工作目录是否干净
if ! git diff-index --quiet HEAD --; then
    echo "Error: Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# 计算新版本
if command -v npm &> /dev/null; then
    NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
    NEW_VERSION=${NEW_VERSION#v}  # 移除 v 前缀
else
    echo "Error: npm not found"
    exit 1
fi

echo "New version: $NEW_VERSION"

# 更新 Rust 版本
echo "Updating Rust version..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^version = \"$CURRENT_VERSION\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml
else
    # Linux/Windows
    sed -i "s/^version = \"$CURRENT_VERSION\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml
fi

# 更新 tauri.conf.json
if command -v node &> /dev/null; then
    node -e "
        const fs = require('fs');
        const path = './src-tauri/tauri.conf.json';
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        config.version = '$NEW_VERSION';
        fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
        console.log('Updated tauri.conf.json');
    "
fi

# 生成 CHANGELOG
echo "Generating CHANGELOG..."
npm run changelog

# 提交更改
echo "Committing version bump..."
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore(release): bump version to $NEW_VERSION"

# 打标签
echo "Creating git tag..."
git tag "v$NEW_VERSION"

echo ""
echo "✅ Version bumped to $NEW_VERSION"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git show HEAD"
echo "  2. Push to remote: git push origin main --tags"
echo ""
