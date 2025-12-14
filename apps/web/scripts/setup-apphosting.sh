#!/bin/bash
set -e

# Firebase App Hosting Setup Script
# Sets up GCS bucket and secrets from .env.production file
#
# Usage:
#   ./setup-apphosting.sh           # Only create missing resources
#   ./setup-apphosting.sh --override # Update all secrets
#
# Environment variables (from .env.production):
#   GCS_BUCKET     - Cloud Storage bucket name (default: synchire-uploads)
#   GCS_LOCATION   - Bucket location (default: asia-southeast1)
#   GCP_PROJECT_ID - GCP project ID (default: synchire-hackathon)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${APP_DIR}/.env.production"

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

echo "Setting up Cloud Storage bucket..."
echo ""

# Set up GCS bucket for file uploads
GCS_BUCKET="${GCS_BUCKET:-synchire-uploads}"
GCS_LOCATION="${GCS_LOCATION:-asia-southeast1}"

if gcloud storage buckets describe "gs://$GCS_BUCKET" --project="$PROJECT_ID" &>/dev/null; then
  echo "✅ Bucket gs://$GCS_BUCKET already exists"
else
  echo "Creating bucket gs://$GCS_BUCKET..."
  gcloud storage buckets create "gs://$GCS_BUCKET" \
    --project="$PROJECT_ID" \
    --location="$GCS_LOCATION" \
    --uniform-bucket-level-access \
    && echo "✅ Bucket created" \
    || { echo "❌ Failed to create bucket"; exit 1; }
fi

echo ""
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

# Get backend service account for checking existing access
BACKEND_SA="firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com"

for secret in API_SECRET_KEY STREAM_API_SECRET GEMINI_API_KEY; do
  # Check if backend already has access
  if gcloud secrets get-iam-policy "$secret" --project="$PROJECT_ID" 2>/dev/null | grep -q "$BACKEND_SA"; then
    echo "  ✅ $secret access already granted"
  else
    firebase apphosting:secrets:grantaccess "$secret" \
      --project "$PROJECT_ID" \
      --backend "$BACKEND_NAME" 2>/dev/null && echo "  ✅ $secret access granted" || echo "  ⚠️  $secret (backend may not exist yet)"
  fi
done

echo ""
echo "Granting App Hosting storage access..."

# Firebase App Hosting uses a dedicated compute service account
APP_HOSTING_SA="firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if permission already exists
if gcloud storage buckets get-iam-policy "gs://$GCS_BUCKET" --project="$PROJECT_ID" 2>/dev/null | grep -q "$APP_HOSTING_SA"; then
  echo "✅ Storage access already granted to $APP_HOSTING_SA"
else
  gcloud storage buckets add-iam-policy-binding "gs://$GCS_BUCKET" \
    --member="serviceAccount:$APP_HOSTING_SA" \
    --role="roles/storage.objectAdmin" \
    --project="$PROJECT_ID" 2>/dev/null \
    && echo "✅ Storage access granted to $APP_HOSTING_SA" \
    || echo "⚠️  Could not grant storage access (SA may not exist yet)"
fi

echo ""
echo "✅ Secrets setup complete!"
echo ""
echo "Next steps:"
echo "1. Create backend:  firebase apphosting:backends:create --project $PROJECT_ID"
echo "2. Push to GitHub:  git push origin main"
echo "3. Check status:    firebase apphosting:backends:list --project $PROJECT_ID"
