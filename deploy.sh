#!/bin/bash
set -e

echo "=========================================="
echo "  🌟 Lumi AI Backend - 部署检查脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check_pass() { echo -e "${GREEN}✅ $1${NC}"; ((PASS++)); }
check_fail() { echo -e "${RED}❌ $1${NC}"; ((FAIL++)); }
check_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "📋 Step 1: 环境检查"
echo "-------------------------------------------"

# 检查 Node.js
if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    MAJOR_VER=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
    if [ "$MAJOR_VER" -ge 18 ]; then
        check_pass "Node.js $NODE_VER (>= 18 ✓)"
    else
        check_fail "Node.js $NODE_VER (需要 >= 18)"
    fi
else
    check_fail "Node.js 未安装"
fi

# 检查 npm
if command -v npm &> /dev/null; then
    check_pass "npm $(npm -v)"
else
    check_fail "npm 未安装"
fi

echo ""
echo "📋 Step 2: 文件完整性检查"
echo "-------------------------------------------"

# 检查关键文件
for f in server.js package.json Procfile .env db/init.js middleware/auth.js routes/auth.js routes/chat.js routes/diary.js routes/memory.js routes/profile.js routes/proxy.js; do
    if [ -f "$f" ]; then
        check_pass "$f"
    else
        check_fail "$f 缺失"
    fi
done

echo ""
echo "📋 Step 3: 环境变量检查"
echo "-------------------------------------------"

if [ -f ".env" ]; then
    check_pass ".env 文件存在"

    # 检查关键环境变量
    source .env 2>/dev/null || true

    if [ -n "$DEEPSEEK_API_KEY" ] && [ "$DEEPSEEK_API_KEY" != "your_deepseek_api_key_here" ]; then
        check_pass "DEEPSEEK_API_KEY 已配置"
    else
        check_fail "DEEPSEEK_API_KEY 未配置或使用默认值"
    fi

    if [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" != "your_jwt_secret_change_me" ]; then
        check_pass "JWT_SECRET 已配置"
    else
        check_warn "JWT_SECRET 使用默认值，建议修改为随机字符串"
    fi

    if [ -n "$DEEPSEEK_BASE_URL" ]; then
        check_pass "DEEPSEEK_BASE_URL = $DEEPSEEK_BASE_URL"
    else
        check_fail "DEEPSEEK_BASE_URL 未配置"
    fi

    if [ -n "$DEEPSEEK_MODEL" ]; then
        check_pass "DEEPSEEK_MODEL = $DEEPSEEK_MODEL"
    else
        check_fail "DEEPSEEK_MODEL 未配置"
    fi
else
    check_fail ".env 文件缺失，请复制 .env.example 并填写配置"
fi

echo ""
echo "📋 Step 4: 安装依赖"
echo "-------------------------------------------"

if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    if npm install --production 2>&1; then
        check_pass "依赖安装成功"
    else
        check_fail "依赖安装失败"
    fi
else
    check_pass "node_modules 已存在"
fi

echo ""
echo "📋 Step 5: 启动测试"
echo "-------------------------------------------"

# 启动服务并测试
echo "🚀 启动服务..."
PORT=3000 node server.js &
SERVER_PID=$!
sleep 3

# 检查进程
if kill -0 $SERVER_PID 2>/dev/null; then
    check_pass "服务启动成功 (PID: $SERVER_PID)"
else
    check_fail "服务启动失败"
fi

# 测试健康检查接口
echo "🔍 测试 API 端点..."
if command -v curl &> /dev/null; then
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    if [ "$HEALTH" = "200" ]; then
        check_pass "GET /api/health → 200 OK"
    else
        check_fail "GET /api/health → $HEALTH"
    fi

    # 测试 404
    NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/nonexistent 2>/dev/null)
    if [ "$NOT_FOUND" = "404" ]; then
        check_pass "GET /api/nonexistent → 404 (预期)"
    else
        check_warn "GET /api/nonexistent → $NOT_FOUND (预期 404)"
    fi
else
    check_warn "curl 未安装，跳过 API 测试"
fi

# 停止服务
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "=========================================="
echo "  📊 检查结果: ${GREEN}${PASS} 通过${NC}, ${RED}${FAIL} 失败${NC}"
echo "=========================================="

if [ $FAIL -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 所有检查通过！可以部署到 Railway 了！${NC}"
    echo ""
    echo "📌 部署到 Railway 的步骤："
    echo "  1. 将代码推送到 GitHub"
    echo "  2. 在 railway.app 导入项目"
    echo "  3. 设置环境变量（见 README-deploy.md）"
    echo "  4. 等待部署完成"
    echo ""
else
    echo ""
    echo -e "${RED}⚠️  存在问题，请先修复后再部署${NC}"
    echo ""
fi

exit $FAIL
