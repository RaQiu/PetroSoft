@echo off
title PetroSoft V1.0
cd /d "%~dp0"
python start.py %*
if %ERRORLEVEL% neq 0 pause
