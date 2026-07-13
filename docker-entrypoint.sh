#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss

echo "Seeding database..."
npx prisma db seed

echo "Starting SentinelPay API..."
exec node dist/index.js
