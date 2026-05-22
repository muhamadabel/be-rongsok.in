#!/bin/sh
# entrypoint.sh for Rongsok.in API

set -e

echo "=================================================="
echo "      Rongsok.in API Docker Bootstrapping"
echo "=================================================="

# Wait for the PostgreSQL/PostGIS database to be ready
echo "🚀 Connecting to database..."

RETRIES=15
until [ $RETRIES -eq 0 ] || npx prisma db push --accept-data-loss; do
  echo "⏳ Prisma db push failed (database might not be ready yet). Retrying in 3 seconds... ($RETRIES retries left)"
  RETRIES=$((RETRIES-1))
  sleep 3
done

if [ $RETRIES -eq 0 ]; then
  echo "❌ Error: Could not connect to database or apply migrations after several retries. Exiting."
  exit 1
fi

echo "✅ Database is ready and migrations/schema are pushed successfully!"

# (Optional) Seed the database if needed
echo "🌱 Running database seeder..."
node prisma/seed.js || echo "⚠️ Seeding skipped or database already has data."

echo "🚀 Starting Rongsok.in API Server..."
exec npm start
