#!/usr/bin/env bash
# ==============================================================================
# Day Trader India - Automated Termux (Android) Installer & Launcher
# ==============================================================================

set -e

echo "🚀 [1/4] Installing pre-compiled packages for Android..."
# Enable TUR for precompiled wheels (bypasses pydantic-core Rust compile)
pkg install -y tur-repo 2>/dev/null || true
pkg install -y python-pydantic python-numpy 2>/dev/null || true

# Install Python packages using TUR pre-compiled wheels index to bypass Rust compilation
python3 -m pip install --extra-index-url https://termux-user-repository.github.io/pypi/ pydantic pydantic-core
python3 -m pip install fastapi uvicorn requests httpx websockets python-dateutil typing_extensions
python3 -m pip install --no-deps dhanhq

echo "📦 [2/4] Checking Node.js for frontend..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    pkg install -y nodejs-lts
fi

echo "⚛️ [3/4] Building React Trading Terminal..."
cd frontend
npm install --no-audit --no-fund
npm run build
cd ..

echo "⚡ [4/4] Launching Day Trader India on http://localhost:8000 ..."
echo "👉 Open your Android Chrome browser and navigate to: http://localhost:8000"
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
