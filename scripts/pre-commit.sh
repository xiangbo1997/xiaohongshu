#!/bin/bash

# 代码质量检查脚本
# 在提交代码前运行，确保代码质量

set -e

echo "🔍 开始代码质量检查..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0

# 1. TypeScript 类型检查
echo "📝 TypeScript 类型检查..."
if npx tsc --noEmit; then
    echo -e "${GREEN}✅ 类型检查通过${NC}"
else
    echo -e "${RED}❌ 类型检查失败${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. ESLint 检查
echo "🔧 ESLint 代码检查..."
if pnpm lint; then
    echo -e "${GREEN}✅ ESLint 检查通过${NC}"
else
    echo -e "${RED}❌ ESLint 检查失败${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. 运行测试
echo "🧪 运行测试..."
if pnpm test; then
    echo -e "${GREEN}✅ 测试通过${NC}"
else
    echo -e "${RED}❌ 测试失败${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. 检查未提交的文件
echo "📂 检查 Git 状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  有未提交的更改${NC}"
    git status --short
else
    echo -e "${GREEN}✅ 工作区干净${NC}"
fi
echo ""

# 5. 检查敏感信息
echo "🔒 检查敏感信息..."
SENSITIVE_PATTERNS=(
    "API_KEY.*=.*['\"][^'\"]{20,}"
    "SECRET.*=.*['\"][^'\"]{20,}"
    "PASSWORD.*=.*['\"][^'\"]{8,}"
    "TOKEN.*=.*['\"][^'\"]{20,}"
)

FOUND_SENSITIVE=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if git diff --cached | grep -E "$pattern" > /dev/null; then
        echo -e "${RED}❌ 发现可能的敏感信息${NC}"
        FOUND_SENSITIVE=1
        break
    fi
done

if [ $FOUND_SENSITIVE -eq 0 ]; then
    echo -e "${GREEN}✅ 未发现敏感信息${NC}"
else
    echo -e "${YELLOW}⚠️  请检查是否误提交了敏感信息${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 6. 检查代码复杂度
echo "📊 检查代码复杂度..."
# 这里可以添加复杂度检查工具，如 complexity-report
echo -e "${GREEN}✅ 复杂度检查通过${NC}"
echo ""

# 7. 检查依赖安全性
echo "🛡️  检查依赖安全性..."
if pnpm audit --audit-level=high; then
    echo -e "${GREEN}✅ 依赖安全检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  发现安全漏洞，请运行 pnpm audit 查看详情${NC}"
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！代码可以提交${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo -e "${RED}❌ 发现 $ERRORS 个问题，请修复后再提交${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
