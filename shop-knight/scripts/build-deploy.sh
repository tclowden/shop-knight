#!/usr/bin/env bash
set -euo pipefail

max_attempts=3
attempt=1

until prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "prisma migrate deploy failed after ${max_attempts} attempts"
    exit 1
  fi
  echo "prisma migrate deploy retry ${attempt}/${max_attempts}..."
  attempt=$((attempt + 1))
  sleep 6
done

prisma generate
next build
