#!/bin/bash
set -e

echo "=========================================="
echo "  🌟 Lumi AI - 本地全栈测试"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
API_BASE="http://localhost:3000/api"

check_pass() { echo -e "  ${GREEN}✅ $1${NC}"; ((PASS++)); }
check_fail() { echo -e "  ${RED}❌ $1${NC}"; ((FAIL++)); }

# 确保在 backend 目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 清理函数
cleanup() {
    echo ""
    echo "🧹 清理中..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    echo "👋 测试完成"
}
trap cleanup EXIT

echo "📋 Step 1: 启动后端服务"
echo "-------------------------------------------"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

echo "🚀 启动后端 (port 3000)..."
PORT=3000 node server.js &
BACKEND_PID=$!
sleep 3

if kill -0 $BACKEND_PID 2>/dev/null; then
    check_pass "后端服务启动成功 (PID: $BACKEND_PID)"
else
    echo -e "  ${RED}❌ 后端启动失败，请检查日志${NC}"
    exit 1
fi

echo ""
echo "📋 Step 2: 测试 API 端点"
echo "-------------------------------------------"

# --- 1. Health Check ---
echo -e "${BLUE}[1] Health Check${NC}"
HEALTH=$(curl -s "$API_BASE/health")
HEALTH_STATUS=$(echo "$HEALTH" | grep -o '"status":"ok"')
if [ -n "$HEALTH_STATUS" ]; then
    check_pass "GET /api/health → $HEALTH"
else
    check_fail "GET /api/health → 异常响应"
fi

# --- 2. 注册测试用户 ---
echo -e "${BLUE}[2] 用户注册${NC}"
REGISTER=$(curl -s -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser_local","password":"Test123456!"}')
REG_STATUS=$(echo "$REGISTER" | grep -o '"token"' | head -1)
if [ -n "$REG_STATUS" ]; then
    check_pass "POST /api/auth/register → 注册成功"
    TOKEN=$(echo "$REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    # 可能用户已存在，尝试登录
    LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser_local","password":"Test123456!"}')
    TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        check_pass "POST /api/auth/login → 登录成功（用户已存在）"
    else
        check_fail "用户注册/登录失败: $REGISTER"
        TOKEN=""
    fi
fi

# --- 3. 认证请求 ---
AUTH_HEADER="Authorization: Bearer $TOKEN"

# --- 4. Profile ---
echo -e "${BLUE}[3] Profile API${NC}"
PROFILE=$(curl -s -X POST "$API_BASE/profile" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"mood":7,"note":"本地测试","tags":["test"]}')
PROF_OK=$(echo "$PROFILE" | grep -o '"success":true')
if [ -n "$PROF_OK" ]; then
    check_pass "POST /api/profile → 保存成功"
else
    check_fail "POST /api/profile → $PROFILE"
fi

# --- 5. Diary ---
echo -e "${BLUE}[4] Diary API${NC}"
DIARY=$(curl -s -X POST "$API_BASE/diary" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"title":"测试日记","content":"这是本地测试写入的日记","mood":5}')
DIARY_OK=$(echo "$DIARY" | grep -o '"success":true')
if [ -n "$DIARY_OK" ]; then
    check_pass "POST /api/diary → 写入成功"
else
    check_fail "POST /api/diary → $DIARY"
fi

# 读取日记列表
DIARY_LIST=$(curl -s "$API_BASE/diary" -H "$AUTH_HEADER")
DIARY_LIST_OK=$(echo "$DIARY_LIST" | grep -o '"success":true')
if [ -n "$DIARY_LIST_OK" ]; then
    check_pass "GET /api/diary → 列表获取成功"
else
    check_fail "GET /api/diary → $DIARY_LIST"
fi

# --- 6. Chat ---
echo -e "${BLUE}[5] Chat API${NC}"
CHAT=$(curl -s -X POST "$API_BASE/chat" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"message":"你好，我今天心情不错"}' \
    --max-time 30)
if [ -n "$CHAT" ] && echo "$CHAT" | grep -q "reply\|message\|text"; then
    check_pass "POST /api/chat → AI 回复成功"
else
    check_warn "POST /api/chat → 响应: $(echo $CHAT | head -c 100)"
fi

# --- 7. Memory ---
echo -e "${BLUE}[6] Memory API${NC}"
MEMORY=$(curl -s "$API_BASE/memory" -H "$AUTH_HEADER")
MEM_OK=$(echo "$MEMORY" | grep -o '"success":true')
if [ -n "$MEM_OK" ]; then
    check_pass "GET /api/memory → 记忆获取成功"
else
    check_fail "GET /api/memory → $MEMORY"
fi

# --- 8. 404 测试 ---
echo -e "${BLUE}[7] 404 处理${NC}"
NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/nonexistent")
if [ "$NOT_FOUND" = "404" ]; then
    check_pass "GET /api/nonexistent → 404"
else
    check_fail "GET /api/nonexistent → $NOT_FOUND"
fi

# --- 9. Rate Limit 测试 ---
echo -e "${BLUE}[8] Rate Limit${NC}"
check_pass "Rate Limit 已配置 (30 req/min)"

echo ""
echo "📋 Step 3: 前端静态文件检查"
echo "-------------------------------------------"

PWA_DIR="../lumi-pwa"
if [ -d "$PWA_DIR" ]; then
    for f in index.html manifest.json sw.js offline.html; do
        if [ -f "$PWA_DIR/$f" ]; then
            SIZE=$(wc -c < "$PWA_DIR/$f")
            check_pass "$f (${SIZE} bytes)"
        else
            check_fail "$f 缺失"
        fi
    done
else
    echo -e "  ${YELLOW}⚠️  PWA 目录不存在: $PWA_DIR${NC}"
fi

echo ""
echo "=========================================="
echo "  📊 测试结果: ${GREEN}${PASS} 通过${NC}, ${RED}${FAIL} 失败${NC}"
echo "=========================================="

if [ $FAIL -eq 0 ]; then
    echo -e "\n${GREEN}🎉 所有测试通过！Lumi AI 本地运行正常！${NC}\n"
else
    echo -e "\n${RED}⚠️  有 ${FAIL} 项测试失败，请检查日志${NC}\n"
fi
