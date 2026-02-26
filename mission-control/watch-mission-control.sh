#!/usr/bin/env bash
set -euo pipefail

if pgrep -f "openclaw" >/dev/null 2>&1; then
  if ! pgrep -f "node server.js" >/dev/null 2>&1; then
    cd /home/knight/.openclaw/workspace/mission-control
    nohup npm start >/tmp/mission-control.log 2>&1 &
  fi
fi
