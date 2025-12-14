#!/bin/bash
set -e

# Production Database Migration Script
# Applies Prisma migrations to the production database
#
# Usage:
#   ./migrate-production.sh              # Apply migrations
#   ./migrate-production.sh --status     # Check migration status
#   ./migrate-production.sh --seed       # Apply migrations + seed

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
ACTION="deploy"
for arg in "$@"; do
  case $arg in
    --status)
      ACTION="status"
      ;;
    --seed)
      ACTION="seed"
      ;;
  esac
done

echo "🗄️  Production Database Migration"
echo "================================="

# Try to load DATABASE_URL from different sources
if [ -z "$DATABASE_URL" ]; then
  # Try .env.production
  ENV_FILE="${SCRIPT_DIR}/.env.production"
  if [ -f "$ENV_FILE" ]; then
    echo "📂 Loading from .env.production..."
    set -a
    source "$ENV_FILE"
    set +a
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  # Try Secret Manager
  echo "📂 Loading from Secret Manager..."
  DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL 2>/dev/null || echo "")
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found"
  echo ""
  echo "Set it via one of:"
  echo "  1. Export: export DATABASE_URL='postgresql://...'"
  echo "  2. File: Add to scripts/.env.production"
  echo "  3. Secret Manager: gcloud secrets versions access latest --secret=DATABASE_URL"
  exit 1
fi

echo "✅ DATABASE_URL loaded"
echo ""

cd "$PACKAGE_DIR"

case $ACTION in
  status)
    echo "📋 Checking migration status..."
    DATABASE_URL="$DATABASE_URL" pnpm prisma migrate status
    ;;
  seed)
    echo "📦 Applying migrations..."
    DATABASE_URL="$DATABASE_URL" pnpm prisma migrate deploy
    echo ""
    echo "🌱 Seeding database..."
    DATABASE_URL="$DATABASE_URL" ALLOW_SEED=true pnpm db:seed
    ;;
  deploy)
    echo "📦 Applying migrations..."
    DATABASE_URL="$DATABASE_URL" pnpm prisma migrate deploy
    ;;
esac

echo ""
echo "✅ Done!"
