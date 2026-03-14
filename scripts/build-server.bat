@echo off
setlocal
cd /d "%~dp0\..\server"

echo === Building PetroSoft Python backend ===

pip install pyinstaller

rd /s /q build 2>nul
rd /s /q dist 2>nul

pyinstaller petrosoft_server.spec --clean

echo.
echo === Build complete ===
echo Output: server\dist\petrosoft-server\
dir /s dist\petrosoft-server\ | findstr /r "File(s)"

endlocal
