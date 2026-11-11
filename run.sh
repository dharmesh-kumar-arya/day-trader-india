#!/usr/bin/env bash
# Quickstart script for Day Trader India (FastAPI Backend + React Frontend)

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Starting Day Trader India Platform from: $PROJECT_DIR"

# 1. Start FastAPI Backend in background
echo "-> Starting Backend on port 8000..."
cd "$PROJECT_DIR/backend"
PYTHONPATH="$PROJECT_DIR/backend" ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Trap signals to cleanly shut down both servers
trap "echo 'Shutting down Day Trader India...'; kill $BACKEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT

# 2. Start Frontend Dev Server
echo "-> Starting Frontend on port 5173..."
cd "$PROJECT_DIR/frontend"
npm run dev -- --host

