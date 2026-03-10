export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 类型枚举，与 Angular 规范保持一致
    'type-enum': [
      2,
      'always',
      [
        'feat',      // 新功能
        'fix',       // 修复
        'docs',      // 文档
        'style',     // 格式（不影响代码运行的变动）
        'refactor',  // 重构
        'perf',      // 性能优化
        'test',      // 测试
        'build',     // 构建
        'ci',        // CI/CD
        'chore',     // 杂项
        'revert',    // 回滚
      ],
    ],
    // type 必须小写
    'type-case': [2, 'always', 'lower-case'],
    // type 不能为空
    'type-empty': [2, 'never'],
    // scope 可以为空
    'scope-empty': [0],
    // scope 格式：小写或连字符
    'scope-case': [2, 'always', 'kebab-case'],
    // subject 不能为空
    'subject-empty': [2, 'never'],
    // subject 不能以 . 结尾
    'subject-full-stop': [2, 'never', '.'],
    // subject 必须以动词开头，使用命令式语气
    'subject-case': [0],
    // body 每行最大长度
    'body-max-line-length': [2, 'always', 100],
    // footer 每行最大长度
    'footer-max-line-length': [2, 'always', 100],
    // header 最大长度
    'header-max-length': [2, 'always', 100],
  },
  // 提示信息
  prompt: {
    messages: {
      skip: ':skip',
      max: 'upper %d chars',
      min: '%d chars at least',
      emptyWarning: 'can not be empty',
      upperLimitWarning: 'over limit',
      lowerLimitWarning: 'below limit',
    },
    questions: {
      type: {
        description: "Select the type of change that you're committing:",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description: 'Changes that do not affect the meaning of the code',
            title: 'Styles',
            emoji: '💎',
          },
          refactor: {
            description: 'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '📦',
          },
          perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '🚀',
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '🚨',
          },
          build: {
            description: 'Changes that affect the build system or external dependencies',
            title: 'Builds',
            emoji: '🛠',
          },
          ci: {
            description: 'Changes to our CI configuration files and scripts',
            title: 'Continuous Integrations',
            emoji: '⚙️',
          },
          chore: {
            description: "Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '♻️',
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '🗑',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g. component or file name)',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself',
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123")',
      },
    },
  },
};
