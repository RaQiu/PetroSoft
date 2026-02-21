#!/usr/bin/env python3
"""
PetroSoft V1.0 — 跨平台一键启动脚本

用法:
    python start.py              安装依赖 + 启动
    python start.py --skip       跳过安装，直接启动
"""

import os
import sys
import subprocess
import shutil
import time
import signal
import socket
import platform

# ── 颜色输出 ──────────────────────────────────────────────────────

IS_WIN = platform.system() == "Windows"

if IS_WIN:
    os.system("")  # 启用 ANSI 转义码支持

RED = "\033[0;31m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
CYAN = "\033[0;36m"
NC = "\033[0m"


def info(msg):
    print(f"{CYAN}[INFO]{NC}  {msg}")


def ok(msg):
    print(f"{GREEN}[OK]{NC}    {msg}")


def warn(msg):
    print(f"{YELLOW}[WARN]{NC}  {msg}")


def fail(msg):
    print(f"{RED}[FAIL]{NC}  {msg}")
    print()
    input("按回车键退出...")
    sys.exit(1)


# ── 工具函数 ──────────────────────────────────────────────────────

ROOT = os.path.dirname(os.path.abspath(__file__))

backend_proc = None
frontend_proc = None


def run(cmd, cwd=None, check=True, shell=False):
    """执行命令并实时显示输出"""
    try:
        result = subprocess.run(
            cmd, cwd=cwd or ROOT, check=check,
            shell=shell if IS_WIN else False,
        )
        return result.returncode == 0
    except subprocess.CalledProcessError:
        return False
    except FileNotFoundError:
        return False


def find_cmd(names):
    """在 PATH 中查找命令，返回第一个找到的"""
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    return None


def get_version(cmd, args=None):
    """获取命令版本号"""
    try:
        r = subprocess.run(
            [cmd] + (args or ["--version"]),
            capture_output=True, text=True, timeout=10,
        )
        return r.stdout.strip().split()[-1].lstrip("v")
    except Exception:
        return None


def port_in_use(port):
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def kill_port(port):
    """清理占用端口的进程"""
    if not port_in_use(port):
        return
    warn(f"端口 {port} 被占用，正在清理...")
    try:
        if IS_WIN:
            subprocess.run(
                f'for /f "tokens=5" %p in (\'netstat -aon ^| findstr :{port} ^| findstr LISTENING\') do taskkill /f /pid %p',
                shell=True, capture_output=True,
            )
        else:
            subprocess.run(
                f"lsof -ti:{port} | xargs kill -9",
                shell=True, capture_output=True,
            )
    except Exception:
        pass
    time.sleep(1)


def wait_for_backend(timeout=20):
    """等待后端 HTTP 服务就绪"""
    for i in range(timeout):
        try:
            with socket.create_connection(("127.0.0.1", 20022), timeout=1):
                # 端口可连接，再试 HTTP
                import urllib.request
                req = urllib.request.Request("http://127.0.0.1:20022/api/health")
                urllib.request.urlopen(req, timeout=2)
                return True
        except Exception:
            pass
        time.sleep(1)
        if (i + 1) % 5 == 0:
            info(f"  已等待 {i + 1} 秒...")
    return False


# ── 环境检查 ──────────────────────────────────────────────────────

def check_node():
    node = find_cmd(["node"])
    if not node:
        fail("未找到 Node.js，请安装 >= 18.0.0\n       下载: https://nodejs.org")
    ver = get_version(node, ["-v"])
    ok(f"Node.js {ver}")
    return node


def check_pnpm():
    pnpm = find_cmd(["pnpm"])
    if not pnpm:
        warn("未找到 pnpm，正在通过 npm 安装...")
        npm = find_cmd(["npm"])
        if not npm:
            fail("未找到 npm，请先安装 Node.js")
        if not run([npm, "install", "-g", "pnpm"]):
            fail("pnpm 安装失败")
        pnpm = find_cmd(["pnpm"])
        if not pnpm:
            fail("pnpm 安装后仍未找到，请检查 PATH")
    ver = get_version(pnpm)
    ok(f"pnpm {ver}")
    return pnpm


def check_python():
    # 当前 Python 就是可用的
    ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    ok(f"Python {ver} ({sys.executable})")
    return sys.executable


# ── 安装依赖 ──────────────────────────────────────────────────────

def install_deps(pnpm, python):
    info("===== 安装前端依赖 =====")
    if not run([pnpm, "install"]):
        fail("前端依赖安装失败")
    ok("前端依赖安装完成")

    info("===== 安装后端依赖 =====")
    if not run([python, "-m", "pip", "install", "-r", "server/requirements.txt", "-q"]):
        fail("后端依赖安装失败")
    ok("后端依赖安装完成")


# ── 启动服务 ──────────────────────────────────────────────────────

def start_services(pnpm, python):
    global backend_proc, frontend_proc

    kill_port(20022)
    kill_port(20012)

    info("===== 启动后端 (FastAPI :20022) =====")
    env = os.environ.copy()
    # 防止代理干扰本地通信
    env["NO_PROXY"] = "127.0.0.1,localhost"
    env["no_proxy"] = "127.0.0.1,localhost"

    backend_proc = subprocess.Popen(
        [python, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "20022", "--reload"],
        cwd=os.path.join(ROOT, "server"),
        env=env,
    )

    info("等待后端启动...")
    if not wait_for_backend():
        fail("后端启动超时，请检查 server/ 目录下的 Python 代码和依赖")
    ok("后端已就绪")

    print()
    info("===== 启动前端 (Electron + Vite) =====")
    frontend_proc = subprocess.Popen(
        [pnpm, "dev"],
        cwd=ROOT,
        env=env,
        shell=IS_WIN,
    )

    print()
    ok("=========================================")
    ok("  PetroSoft V1.0 已启动")
    ok(f"  后端 PID : {backend_proc.pid}")
    ok(f"  前端 PID : {frontend_proc.pid}")
    ok("=========================================")
    print()
    info("关闭 Electron 窗口后自动退出")
    print()


# ── 清理 ──────────────────────────────────────────────────────────

def cleanup(*_args):
    print()
    info("正在停止服务...")
    for name, proc in [("前端", frontend_proc), ("后端", backend_proc)]:
        if proc and proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=5)
                ok(f"{name}已停止")
            except Exception:
                proc.kill()
                ok(f"{name}已强制停止")
    # 额外清理残留 uvicorn
    try:
        if IS_WIN:
            subprocess.run("taskkill /f /im uvicorn.exe", shell=True, capture_output=True)
        else:
            subprocess.run("pkill -f 'uvicorn main:app'", shell=True, capture_output=True)
    except Exception:
        pass


# ── 主流程 ────────────────────────────────────────────────────────

def main():
    print()
    print("=============================================")
    print("       PetroSoft V1.0 启动脚本")
    print("=============================================")
    print()

    skip_install = "--skip" in sys.argv

    info("===== 环境检查 =====")
    check_node()
    pnpm = check_pnpm()
    python = check_python()
    print()

    if not skip_install:
        install_deps(pnpm, python)
    else:
        warn("已跳过依赖安装 (--skip)")
    print()

    start_services(pnpm, python)

    # 注册信号处理
    signal.signal(signal.SIGINT, lambda *_: None)
    if not IS_WIN:
        signal.signal(signal.SIGTERM, lambda *_: None)

    # 等待前端退出（用户关闭 Electron 窗口）
    try:
        frontend_proc.wait()
    except KeyboardInterrupt:
        pass

    cleanup()
    ok("PetroSoft 已退出")
    print()


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print(f"\n{RED}[错误]{NC}  {e}")
        input("\n按回车键退出...")
        sys.exit(1)
