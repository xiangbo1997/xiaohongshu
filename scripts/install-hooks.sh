#!/bin/bash
#
# Git Hooks 安装脚本
# 自动安装 pre-commit 和 commit-msg hooks
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      🔧 Git Hooks 安装工具            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"

# 检查是否在 Git 仓库中
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ 错误: 当前目录不是 Git 仓库${NC}"
  exit 1
fi

# 创建 hooks 目录
HOOKS_DIR=".git/hooks"
if [ ! -d "$HOOKS_DIR" ]; then
  mkdir -p "$HOOKS_DIR"
fi

echo -e "\n${YELLOW}正在安装 Git Hooks...${NC}\n"

# 1. 安装 pre-commit hook
echo -e "${YELLOW}1. 安装 pre-commit hook${NC}"
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
#
# Pre-commit hook
# 在提交前运行代码质量检查
#

# 运行 pre-commit 脚本
./scripts/pre-commit.sh

# 如果检查失败，阻止提交
if [ $? -ne 0 ]; then
  echo "❌ Pre-commit 检查失败，提交已取消"
  echo "💡 提示: 使用 git commit --no-verify 跳过检查（不推荐）"
  exit 1
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo -e "${GREEN}✅ pre-commit hook 已安装${NC}"

# 2. 安装 commit-msg hook
echo -e "\n${YELLOW}2. 安装 commit-msg hook${NC}"
cat > "$HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash
#
# Commit-msg hook
# 验证提交信息格式（Conventional Commits）
#

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# 允许的类型
TYPES="feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert"

# 验证格式: <type>(<scope>): <subject>
# 或: <type>: <subject>
PATTERN="^(${TYPES})(\(.+\))?: .{1,100}$"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo "❌ 提交信息格式错误"
  echo ""
  echo "正确格式："
  echo "  <type>(<scope>): <subject>"
  echo ""
  echo "示例："
  echo "  feat(auth): 添加手机号登录功能"
  echo "  fix(payment): 修复支付回调验证失败问题"
  echo "  docs(api): 更新 API 文档"
  echo ""
  echo "允许的类型："
  echo "  feat     - 新功能"
  echo "  fix      - Bug 修复"
  echo "  docs     - 文档更新"
  echo "  style    - 代码格式（不影响代码运行）"
  echo "  refactor - 重构"
  echo "  perf     - 性能优化"
  echo "  test     - 测试相关"
  echo "  chore    - 构建过程或辅助工具的变动"
  echo "  build    - 构建系统或外部依赖的变动"
  echo "  ci       - CI 配置文件和脚本的变动"
  echo "  revert   - 回滚之前的提交"
  echo ""
  exit 1
fi

# 检查是否包含 emoji（可选）
if echo "$COMMIT_MSG" | grep -qE "^[[:space:]]*[[:emoji:]]"; then
  echo "💡 提示: 检测到 emoji，建议使用标准格式"
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/commit-msg"
echo -e "${GREEN}✅ commit-msg hook 已安装${NC}"

# 3. 安装 pre-push hook
echo -e "\n${YELLOW}3. 安装 pre-push hook${NC}"
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
#
# Pre-push hook
# 在推送前运行测试
#

echo "🧪 运行测试..."

# 运行测试
pnpm test

if [ $? -ne 0 ]; then
  echo "❌ 测试失败，推送已取消"
  echo "💡 提示: 使用 git push --no-verify 跳过测试（不推荐）"
  exit 1
fi

echo "✅ 测试通过"
exit 0
EOF

chmod +x "$HOOKS_DIR/pre-push"
echo -e "${GREEN}✅ pre-push hook 已安装${NC}"

# 4. 创建 hooks 配置文件
echo -e "\n${YELLOW}4. 创建 hooks 配置文件${NC}"
cat > ".githooks.json" << 'EOF'
{
  "hooks": {
    "pre-commit": {
      "enabled": true,
      "description": "运行代码质量检查",
      "script": "./scripts/pre-commit.sh"
    },
    "commit-msg": {
      "enabled": true,
      "description": "验证提交信息格式",
      "pattern": "^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\\(.+\\))?: .{1,100}$"
    },
    "pre-push": {
      "enabled": true,
      "description": "运行测试"
    }
  },
  "commitMessageFormat": {
    "types": [
      { "type": "feat", "description": "新功能" },
      { "type": "fix", "description": "Bug 修复" },
      { "type": "docs", "description": "文档更新" },
      { "type": "style", "description": "代码格式" },
      { "type": "refactor", "description": "重构" },
      { "type": "perf", "description": "性能优化" },
      { "type": "test", "description": "测试相关" },
      { "type": "chore", "description": "构建/工具变动" },
      { "type": "build", "description": "构建系统变动" },
      { "type": "ci", "description": "CI 配置变动" },
      { "type": "revert", "description": "回滚提交" }
    ],
    "maxLength": 100,
    "minLength": 10
  }
}
EOF

echo -e "${GREEN}✅ hooks 配置文件已创建${NC}"

# 5. 创建卸载脚本
echo -e "\n${YELLOW}5. 创建卸载脚本${NC}"
cat > "scripts/uninstall-hooks.sh" << 'EOF'
#!/bin/bash
#
# Git Hooks 卸载脚本
#

set -e

echo "🗑️  卸载 Git Hooks..."

rm -f .git/hooks/pre-commit
rm -f .git/hooks/commit-msg
rm -f .git/hooks/pre-push

echo "✅ Git Hooks 已卸载"
EOF

chmod +x "scripts/uninstall-hooks.sh"
echo -e "${GREEN}✅ 卸载脚本已创建${NC}"

# 完成
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      ✅ Git Hooks 安装完成            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}已安装的 Hooks:${NC}"
echo "  ✓ pre-commit  - 提交前代码质量检查"
echo "  ✓ commit-msg  - 提交信息格式验证"
echo "  ✓ pre-push    - 推送前运行测试"

echo -e "\n${YELLOW}使用说明:${NC}"
echo "  • Hooks 会在相应的 Git 操作时自动运行"
echo "  • 使用 --no-verify 跳过 hooks（不推荐）"
echo "  • 运行 ./scripts/uninstall-hooks.sh 卸载"

echo -e "\n${YELLOW}提交信息格式:${NC}"
echo "  <type>(<scope>): <subject>"
echo ""
echo "  示例:"
echo "    feat(auth): 添加手机号登录功能"
echo "    fix(payment): 修复支付回调验证失败"
echo "    docs: 更新 README"

echo ""
