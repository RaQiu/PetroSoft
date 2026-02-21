#!/usr/bin/env bash
#
# PetroSoft V1.0 — 一键安装 & 启动脚本
#
# ============== 版本要求 ==============
#  Node.js  >= 18.0.0
#  pnpm     >= 8.0.0
#  Python   >= 3.9.0
#  pip      (Python 自带)
# ======================================
#
# 用法:
#   chmod +x start.sh
#   ./start.sh            # 安装依赖 + 启动
#   ./start.sh --skip     # 跳过安装，直接启动
#

set -e

# ---------- 颜色 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ---------- 项目根目录 ----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ---------- 版本检查函数 ----------
# 比较 semver: 返回 0 表示 $1 >= $2
ver_gte() {
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

check_node() {
    if ! command -v node &>/dev/null; then
        fail "未找到 Node.js，请安装 >= 18.0.0  https://nodejs.org"
    fi
    local v; v="$(node -v | sed 's/^v//')"
    if ! ver_gte "$v" "18.0.0"; then
        fail "Node.js 版本 $v 过低，需要 >= 18.0.0"
    fi
    ok "Node.js $v"
}

check_pnpm() {
    if ! command -v pnpm &>/dev/null; then
        warn "未找到 pnpm，正在通过 npm 安装..."
        npm install -g pnpm || fail "pnpm 安装失败"
    fi
    local v; v="$(pnpm --version)"
    if ! ver_gte "$v" "8.0.0"; then
        fail "pnpm 版本 $v 过低，需要 >= 8.0.0"
    fi
    ok "pnpm $v"
}

check_python() {
    local py=""
    if command -v python3 &>/dev/null; then
        py="python3"
    elif command -v python &>/dev/null; then
        py="python"
    fi
    if [ -z "$py" ]; then
        fail "未找到 Python，请安装 >= 3.9.0  https://www.python.org"
    fi
    local v; v="$($py --version 2>&1 | awk '{print $2}')"
    if ! ver_gte "$v" "3.9.0"; then
        fail "Python 版本 $v 过低，需要 >= 3.9.0"
    fi
    ok "Python $v ($py)"
    PYTHON="$py"
}

# ---------- 安装依赖 ----------
install_deps() {
    info "===== 安装前端依赖 ====="
    pnpm install
    ok "前端依赖安装完成"

    info "===== 安装后端依赖 ====="
    $PYTHON -m pip install -r server/requirements.txt -q
    ok "后端依赖安装完成"
}

# ---------- 清理占用端口的进程 ----------
kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        warn "端口 $port 被占用，正在清理 (PID: $(echo $pids | tr '\n' ' '))"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# ---------- 启动服务 ----------
start_services() {
    # 清理可能残留的旧进程
    kill_port 20022
    kill_port 20012

    info "===== 启动后端 (FastAPI :20022) ====="
    cd "$SCRIPT_DIR/server"
    $PYTHON -m uvicorn main:app --host 127.0.0.1 --port 20022 --reload &
    BACKEND_PID=$!
    cd "$SCRIPT_DIR"

    # 等后端就绪
    info "等待后端启动..."
    for i in $(seq 1 15); do
        if curl --noproxy '*' -s http://127.0.0.1:20022/api/health &>/dev/null; then
            ok "后端已就绪"
            break
        fi
        if [ "$i" = "15" ]; then
            fail "后端启动超时"
        fi
        sleep 1
    done

    info "===== 启动前端 (Electron + Vite :20012) ====="
    pnpm dev &
    FRONTEND_PID=$!

    echo ""
    ok "========================================="
    ok "  PetroSoft V1.0 已启动"
    ok "  后端 API : http://127.0.0.1:20022/api"
    ok "  前端 Dev : http://localhost:20012"
    ok "  后端 PID : $BACKEND_PID"
    ok "  前端 PID : $FRONTEND_PID"
    ok "========================================="
    echo ""
    info "按 Ctrl+C 停止所有服务"
}

# ---------- 清理 ----------
cleanup() {
    echo ""
    info "正在停止服务..."
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null && ok "后端已停止"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && ok "前端已停止"
    # 也清理 uvicorn 子进程
    pkill -f "uvicorn main:app" 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# ---------- 主流程 ----------
echo ""
echo "╔══════════════════════════════════════╗"
echo "║      PetroSoft V1.0 启动脚本        ║"
echo "╚══════════════════════════════════════╝"
echo ""

info "===== 环境检查 ====="
check_node
check_pnpm
check_python

if [ "$1" != "--skip" ]; then
    install_deps
else
    warn "已跳过依赖安装 (--skip)"
fi

start_services

# 保持前台运行，等待 Ctrl+C
wait
