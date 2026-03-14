#!/bin/bash
set -e

cd "$(dirname "$0")/../server"

echo "=== Building PetroSoft Python backend ==="

# Ensure PyInstaller is installed
pip install pyinstaller 2>/dev/null || pip3 install pyinstaller

# Clean previous builds
rm -rf build/ dist/

# Build with spec file
pyinstaller petrosoft_server.spec --clean

echo ""
echo "=== Build complete ==="
echo "Output: server/dist/petrosoft-server/"
du -sh dist/petrosoft-server/
