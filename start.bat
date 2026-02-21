@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

REM ============================================================
REM  PetroSoft V1.0 — 一键安装 ^& 启动脚本 (Windows)
REM
REM  版本要求:
REM    Node.js  >= 18.0.0
REM    pnpm     >= 8.0.0
REM    Python   >= 3.9.0
REM    pip      (Python 自带)
REM
REM  用法:
REM    start.bat              安装依赖 + 启动
REM    start.bat --skip       跳过安装，直接启动
REM ============================================================

echo.
echo ╔══════════════════════════════════════╗
echo ║      PetroSoft V1.0 启动脚本        ║
echo ╚══════════════════════════════════════╝
echo.

REM ---------- 项目根目录 ----------
set "ROOT=%~dp0"
cd /d "%ROOT%"

REM ---------- 环境检查 ----------
echo [INFO]  ===== 环境检查 =====

REM -- Node.js --
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [FAIL]  未找到 Node.js，请安装 ^>= 18.0.0  https://nodejs.org
    goto :error
)
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK]    Node.js %NODE_VER%

REM -- pnpm --
where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN]  未找到 pnpm，正在通过 npm 安装...
    call npm install -g pnpm
    if %ERRORLEVEL% neq 0 (
        echo [FAIL]  pnpm 安装失败
        goto :error
    )
)
for /f "tokens=*" %%v in ('pnpm --version') do set "PNPM_VER=%%v"
echo [OK]    pnpm %PNPM_VER%

REM -- Python --
set "PY="
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PY=python"
) else (
    where python3 >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PY=python3"
    )
)
if "%PY%"=="" (
    echo [FAIL]  未找到 Python，请安装 ^>= 3.9.0  https://www.python.org
    goto :error
)
for /f "tokens=2" %%v in ('%PY% --version 2^>^&1') do set "PY_VER=%%v"
echo [OK]    Python %PY_VER% (%PY%)

REM ---------- 安装依赖 ----------
if "%1"=="--skip" (
    echo [WARN]  已跳过依赖安装 ^(--skip^)
    goto :start
)

echo.
echo [INFO]  ===== 安装前端依赖 =====
call pnpm install
if %ERRORLEVEL% neq 0 (
    echo [FAIL]  前端依赖安装失败
    goto :error
)
echo [OK]    前端依赖安装完成

echo.
echo [INFO]  ===== 安装后端依赖 =====
%PY% -m pip install -r server\requirements.txt -q
if %ERRORLEVEL% neq 0 (
    echo [FAIL]  后端依赖安装失败
    goto :error
)
echo [OK]    后端依赖安装完成

REM ---------- 清理占用端口的进程 ----------
:start
echo.
echo [INFO]  ===== 清理残留进程 =====
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":20022 " ^| findstr "LISTENING" 2^>nul') do (
    echo [WARN]  端口 20022 被占用 ^(PID: %%p^)，正在清理...
    taskkill /f /pid %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":20012 " ^| findstr "LISTENING" 2^>nul') do (
    echo [WARN]  端口 20012 被占用 ^(PID: %%p^)，正在清理...
    taskkill /f /pid %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM ---------- 启动服务 ----------
echo.
echo [INFO]  ===== 启动后端 (FastAPI :20022) =====
cd /d "%ROOT%server"
start "PetroSoft-Backend" /B %PY% -m uvicorn main:app --host 127.0.0.1 --port 20022 --reload
cd /d "%ROOT%"

REM 等后端就绪
echo [INFO]  等待后端启动...
set "READY=0"
for /L %%i in (1,1,15) do (
    if !READY! equ 0 (
        timeout /t 1 /nobreak >nul
        curl --noproxy "*" -s http://127.0.0.1:20022/api/health >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "READY=1"
            echo [OK]    后端已就绪
        )
    )
)
if %READY% equ 0 (
    echo [FAIL]  后端启动超时
    goto :error
)

echo.
echo [INFO]  ===== 启动前端 (Electron + Vite :20012) =====
call pnpm dev

REM pnpm dev 退出后清理后端
echo.
echo [INFO]  正在停止后端...
taskkill /f /fi "WINDOWTITLE eq PetroSoft-Backend" >nul 2>&1
echo [OK]    服务已停止
goto :end

:error
echo.
echo [FAIL]  启动失败，请检查上方错误信息
pause
exit /b 1

:end
pause
exit /b 0
