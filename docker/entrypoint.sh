#!/bin/sh
set -e

echo "Applying Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

# Seed is opt-in only. Default is false so API restarts never wipe data.
# One-shot demo seed (exits without starting API):
#   docker compose run --rm -e RUN_SEED=true -e SEED_ONLY=true api
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding demo fixture data (non-destructive upsert)..."
  ./node_modules/.bin/prisma db seed
fi

if [ "${SEED_ONLY:-false}" = "true" ]; then
  echo "SEED_ONLY=true — exiting without starting API."
  exit 0
fi

echo "Starting API..."
exec node dist/main.js
