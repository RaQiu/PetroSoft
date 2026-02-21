@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

REM ============================================================
REM  PetroSoft V1.0 — 一键安装 & 启动脚本 (Windows)
REM
REM  版本要求:
REM    Node.js  >= 18.0.0
REM    pnpm     >= 8.0.0
REM    Python   >= 3.9.0
REM    pip      (Python 自带)
REM
REM  用法:
REM    双击 start.bat           安装依赖 + 启动
REM    start.bat --skip         跳过安装，直接启动
REM ============================================================

title PetroSoft V1.0

echo.
echo =============================================
echo        PetroSoft V1.0 启动脚本
echo =============================================
echo.

REM ---------- 项目根目录 ----------
set "ROOT=%~dp0"
cd /d "%ROOT%"

REM ---------- 环境检查 ----------
echo [INFO]  ===== 环境检查 =====

REM -- Node.js --
where node >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [FAIL]  未找到 Node.js，请安装 ^>= 18.0.0  https://nodejs.org
    goto :fail_exit
)
for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo [OK]    Node.js !NODE_VER!

REM -- pnpm --
where pnpm >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [WARN]  未找到 pnpm，正在通过 npm 安装...
    call npm install -g pnpm
    if !ERRORLEVEL! neq 0 (
        echo [FAIL]  pnpm 安装失败
        goto :fail_exit
    )
)
for /f "tokens=*" %%v in ('pnpm --version 2^>nul') do set "PNPM_VER=%%v"
echo [OK]    pnpm !PNPM_VER!

REM -- Python --
set "PY="
where python >nul 2>&1
if !ERRORLEVEL! equ 0 (
    set "PY=python"
) else (
    where python3 >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "PY=python3"
    )
)
if "!PY!"=="" (
    echo [FAIL]  未找到 Python，请安装 ^>= 3.9.0  https://www.python.org
    goto :fail_exit
)
for /f "tokens=2" %%v in ('!PY! --version 2^>^&1') do set "PY_VER=%%v"
echo [OK]    Python !PY_VER! (!PY!)

REM ---------- 安装依赖 ----------
if "%~1"=="--skip" (
    echo [WARN]  已跳过依赖安装 ^(--skip^)
    goto :start
)

echo.
echo [INFO]  ===== 安装前端依赖 =====
call pnpm install
if !ERRORLEVEL! neq 0 (
    echo [FAIL]  前端依赖安装失败
    goto :fail_exit
)
echo [OK]    前端依赖安装完成

echo.
echo [INFO]  ===== 安装后端依赖 =====
!PY! -m pip install -r server\requirements.txt -q
if !ERRORLEVEL! neq 0 (
    echo [FAIL]  后端依赖安装失败
    goto :fail_exit
)
echo [OK]    后端依赖安装完成

REM ---------- 清理占用端口的进程 ----------
:start
echo.
echo [INFO]  ===== 清理残留进程 =====
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":20022 " ^| findstr "LISTENING"') do (
    echo [WARN]  端口 20022 被占用 ^(PID: %%p^)，正在清理...
    taskkill /f /pid %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":20012 " ^| findstr "LISTENING"') do (
    echo [WARN]  端口 20012 被占用 ^(PID: %%p^)，正在清理...
    taskkill /f /pid %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM ---------- 启动后端 ----------
echo.
echo [INFO]  ===== 启动后端 (FastAPI :20022) =====
cd /d "%ROOT%server"
start "PetroSoft-Backend" /min !PY! -m uvicorn main:app --host 127.0.0.1 --port 20022 --reload
cd /d "%ROOT%"

REM 等后端就绪（用 PowerShell 做 HTTP 检查，兼容性最好）
echo [INFO]  等待后端启动...
set "READY=0"
for /L %%i in (1,1,20) do (
    if !READY! equ 0 (
        timeout /t 1 /nobreak >nul
        powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:20022/api/health' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "READY=1"
            echo [OK]    后端已就绪
        )
    )
)
if !READY! equ 0 (
    echo [FAIL]  后端启动超时，请检查 Python 环境和依赖是否正确安装
    goto :fail_exit
)

REM ---------- 启动前端 ----------
echo.
echo [INFO]  ===== 启动前端 (Electron + Vite) =====
echo [INFO]  应用窗口即将弹出，关闭窗口后本脚本自动退出
echo.
call pnpm dev

REM pnpm dev 退出后清理后端
echo.
echo [INFO]  正在停止后端...
taskkill /f /fi "WINDOWTITLE eq PetroSoft-Backend" >nul 2>&1
REM 也尝试通过进程名清理
taskkill /f /im uvicorn.exe >nul 2>&1
echo [OK]    服务已停止
goto :ok_exit

:fail_exit
echo.
echo =============================================
echo   启动失败，请检查上方错误信息
echo =============================================
echo.
pause
exit /b 1

:ok_exit
echo.
echo =============================================
echo   PetroSoft 已正常退出
echo =============================================
echo.
pause
exit /b 0
