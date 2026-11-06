#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_CMD="cd '$ROOT_DIR/backend' && python3 app.py"
FRONTEND_CMD="cd '$ROOT_DIR/frontend' && npm start"

if [[ "$(uname -s)" == "Darwin" ]]; then
  # macOS: open backend and frontend each in their own Terminal window
  osascript <<EOF
tell application "Terminal"
  activate
  do script "$BACKEND_CMD"
  do script "$FRONTEND_CMD"
end tell
EOF
else
  echo "Automatic window splitting is only wired up for macOS Terminal."
  echo "Open two terminals and run:"
  echo "  1) $BACKEND_CMD"
  echo "  2) $FRONTEND_CMD"
  exit 1
fi
