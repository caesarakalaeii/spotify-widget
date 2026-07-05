#!/bin/sh
set -e

echo "Running database migrations..."
n=0
until node scripts/migrate.mjs; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then
    echo "Migrations failed after $n attempts, giving up."
    exit 1
  fi
  echo "Migrate failed (DB not ready?), retrying in 3s ($n/10)..."
  sleep 3
done

echo "Starting Next.js server..."
exec node server.js
