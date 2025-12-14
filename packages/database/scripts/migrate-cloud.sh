#!/bin/bash
set -e

# Cloud SQL Migration Script
# Starts Cloud SQL Proxy, fetches credentials, and runs migrations
#
# Usage:
#   ./scripts/migrate-cloud.sh              # Apply migrations
#   ./scripts/migrate-cloud.sh --status     # Check migration status
#   ./scripts/migrate-cloud.sh --seed       # Apply migrations + seed

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-synchire-hackathon}"
REGION="${GCP_REGION:-asia-southeast1}"
INSTANCE="${DB_INSTANCE_NAME:-synchire-db}"
PROXY_PORT="${PROXY_PORT:-5433}"

# Parse arguments (pass through to migrate-production.sh)
MIGRATE_ARGS="$@"

echo "🗄️  Cloud SQL Migration"
echo "======================"
echo ""

# Check for cloud-sql-proxy
if ! command -v cloud-sql-proxy &> /dev/null; then
  echo "❌ cloud-sql-proxy not found"
  echo ""
  echo "Install with:"
  echo "  brew install cloud-sql-proxy"
  exit 1
fi

# Check for gcloud auth
if ! gcloud auth application-default print-access-token &> /dev/null; then
  echo "❌ Application Default Credentials not set"
  echo ""
  echo "Run:"
  echo "  gcloud auth application-default login"
  exit 1
fi

# Get password from Secret Manager
echo "🔑 Fetching credentials from Secret Manager..."
DB_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL --project=$PROJECT_ID 2>/dev/null)
if [ -z "$DB_URL" ]; then
  echo "❌ Failed to fetch DATABASE_URL from Secret Manager"
  exit 1
fi

# Extract credentials from URL
# URL format: postgresql://user:password@host/database?host=/cloudsql/...
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*@[^/]*\/\([^?]*\).*/\1/p')

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Failed to parse DATABASE_URL"
  exit 1
fi

echo "✅ Credentials loaded (user: $DB_USER, database: $DB_NAME)"
echo ""

# Check if proxy port is in use
if lsof -i :$PROXY_PORT &> /dev/null; then
  echo "⚠️  Port $PROXY_PORT already in use (proxy may be running)"
  PROXY_RUNNING=true
else
  PROXY_RUNNING=false
fi

# Start Cloud SQL Proxy if not running
if [ "$PROXY_RUNNING" = false ]; then
  echo "🔌 Starting Cloud SQL Proxy on port $PROXY_PORT..."
  cloud-sql-proxy ${PROJECT_ID}:${REGION}:${INSTANCE} --port $PROXY_PORT &
  PROXY_PID=$!

  # Wait for proxy to be ready
  sleep 3

  if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo "❌ Failed to start Cloud SQL Proxy"
    exit 1
  fi

  echo "✅ Proxy started (PID: $PROXY_PID)"
  echo ""

  # Cleanup function
  cleanup() {
    echo ""
    echo "🔌 Stopping Cloud SQL Proxy..."
    kill $PROXY_PID 2>/dev/null || true
  }
  trap cleanup EXIT
else
  echo "✅ Using existing proxy on port $PROXY_PORT"
  echo ""
fi

# Build local DATABASE_URL
LOCAL_DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PROXY_PORT}/${DB_NAME}"

# Run migration script
export DATABASE_URL="$LOCAL_DB_URL"
"$SCRIPT_DIR/migrate-production.sh" $MIGRATE_ARGS
