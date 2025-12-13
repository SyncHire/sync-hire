#!/bin/bash
set -e

# Google Secret Manager Setup Script
# Creates and configures secrets for the SyncHire application

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔐 SyncHire - Secret Manager Setup"
echo "===================================="

# Load .env.production if it exists (relative to script directory)
ENV_FILE="${SCRIPT_DIR}/.env.production"
if [ -f "$ENV_FILE" ]; then
  echo "📂 Loading .env.production..."
  set -a
  source "$ENV_FILE"
  set +a
  echo "  ✅ Loaded .env.production"
else
  echo "⚠️  Warning: .env.production not found at $ENV_FILE"
  echo "   Please create it from .env.production.example:"
  echo "   cp .env.production.example .env.production"
  echo ""
fi

# Check if GCP_PROJECT_ID is set
if [ -z "$GCP_PROJECT_ID" ]; then
  echo "❌ Error: GCP_PROJECT_ID is not set"
  echo "Please set it in .env.production or run: export GCP_PROJECT_ID='your-project-id'"
  exit 1
fi

echo "📋 Project ID: $GCP_PROJECT_ID"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI is not installed"
  echo "Please install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Enable Secret Manager API
echo "🔧 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project=$GCP_PROJECT_ID

# Check for --override flag
OVERRIDE_MODE=false
for arg in "$@"; do
  if [ "$arg" = "--override" ]; then
    OVERRIDE_MODE=true
  fi
done

# Function to create or update a secret
create_or_update_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2

  if [ -z "$SECRET_VALUE" ]; then
    echo "⚠️  Skipping $SECRET_NAME (no value provided)"
    return 0
  fi

  # Check if secret exists
  if gcloud secrets describe $SECRET_NAME --project=$GCP_PROJECT_ID &> /dev/null; then
    if [ "$OVERRIDE_MODE" = true ]; then
      echo "📝 Updating secret: $SECRET_NAME"
      echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$GCP_PROJECT_ID --quiet
      echo "  ✅ Updated"
    else
      echo "✓  Secret exists: $SECRET_NAME (use --override to update)"
    fi
  else
    echo "📝 Creating secret: $SECRET_NAME"
    echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=- --project=$GCP_PROJECT_ID --quiet
    echo "  ✅ Created"
  fi
}

echo ""
echo "📋 Setting up secrets from .env.production..."
echo ""

# Create/update secrets from .env.production values
create_or_update_secret "GEMINI_API_KEY" "${GEMINI_API_KEY:-}"
create_or_update_secret "STREAM_API_SECRET" "${STREAM_API_SECRET:-}"
create_or_update_secret "NEXT_PUBLIC_STREAM_API_KEY" "${NEXT_PUBLIC_STREAM_API_KEY:-}"

echo ""
echo "🔐 Configuring IAM permissions..."

# Grant Secret Manager access to compute service account (used by Firebase/Cloud Run)
PROJECT_NUMBER=$(gcloud projects describe $GCP_PROJECT_ID --format='value(projectNumber)')
echo "  ↳ Granting access to compute service account..."
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet 2>/dev/null || true

# Also grant to App Engine service account (used by Firebase Hosting)
echo "  ↳ Granting access to App Engine service account..."
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:${GCP_PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet 2>/dev/null || true

echo ""
echo "✅ Secret Manager setup completed successfully!"
echo ""
echo "📋 Processed Secrets:"
echo "  - GEMINI_API_KEY"
echo "  - STREAM_API_SECRET"
echo "  - NEXT_PUBLIC_STREAM_API_KEY"
echo ""
echo "🔐 IAM Permissions Granted To:"
echo "  - ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "  - ${GCP_PROJECT_ID}@appspot.gserviceaccount.com"
echo ""
echo "🔗 View secrets:"
echo "  gcloud secrets list --project=$GCP_PROJECT_ID"
echo ""
echo "🔑 Access a secret value:"
echo "  gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=$GCP_PROJECT_ID"
echo ""
