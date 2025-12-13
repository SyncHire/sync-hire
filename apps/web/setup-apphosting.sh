#!/bin/bash
set -e

# Firebase App Hosting Setup Script
# Sets up secrets from .env.production file
#
# Usage:
#   ./setup-apphosting.sh           # Only create missing secrets
#   ./setup-apphosting.sh --override # Update all secrets

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.production"

# Parse arguments
OVERRIDE=false
for arg in "$@"; do
  case $arg in
    --override)
      OVERRIDE=true
      ;;
  esac
done

echo "Firebase App Hosting Setup"
echo "=========================="

# Check for .env.production
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: .env.production not found"
  echo "   Copy .env.production.example to .env.production and fill in values"
  exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Get project ID
PROJECT_ID="${GCP_PROJECT_ID:-synchire-hackathon}"
echo "Project: $PROJECT_ID"
if [ "$OVERRIDE" = true ]; then
  echo "Mode: Override (updating all secrets)"
else
  echo "Mode: Create missing only (use --override to update existing)"
fi
echo ""

# Function to check if secret exists
secret_exists() {
  local name=$1
  gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null
}

# Function to set a secret
set_secret() {
  local name=$1
  local value=$2

  if [ -z "$value" ]; then
    echo "⚠️  Skipping $name (not set in .env.production)"
    return
  fi

  if secret_exists "$name"; then
    if [ "$OVERRIDE" = true ]; then
      echo "Updating $name..."
      echo -n "$value" | firebase apphosting:secrets:set "$name" \
        --project "$PROJECT_ID" \
        --data-file - \
        --force 2>/dev/null && echo "  ✅ $name updated" || echo "  ❌ Failed to update $name"
    else
      echo "⏭️  $name exists (use --override to update)"
    fi
  else
    echo "Creating $name..."
    echo -n "$value" | firebase apphosting:secrets:set "$name" \
      --project "$PROJECT_ID" \
      --data-file - \
      --force 2>/dev/null && echo "  ✅ $name created" || echo "  ❌ Failed to create $name"
  fi
}

echo "Setting up secrets..."
echo ""

# Set secrets from .env.production
set_secret "API_SECRET_KEY" "$API_SECRET_KEY"
set_secret "STREAM_API_SECRET" "$STREAM_API_SECRET"
set_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"

echo ""

# Grant backend access to secrets (required for App Hosting)
BACKEND_NAME="${BACKEND_NAME:-synchire}"
echo "Granting backend '$BACKEND_NAME' access to secrets..."
for secret in API_SECRET_KEY STREAM_API_SECRET GEMINI_API_KEY; do
  firebase apphosting:secrets:grantaccess "$secret" \
    --project "$PROJECT_ID" \
    --backend "$BACKEND_NAME" 2>/dev/null && echo "  ✅ $secret access granted" || echo "  ⚠️  $secret (may already have access or backend not created)"
done

echo ""
echo "✅ Secrets setup complete!"
echo ""
echo "Next steps:"
echo "1. Create backend:  firebase apphosting:backends:create --project $PROJECT_ID"
echo "2. Push to GitHub:  git push origin main"
echo "3. Check status:    firebase apphosting:backends:list --project $PROJECT_ID"
