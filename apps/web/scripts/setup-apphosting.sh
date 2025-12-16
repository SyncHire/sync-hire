#!/bin/bash
set -e

# Firebase App Hosting Setup Script
# Sets up GCS bucket and secrets from .env.production file
#
# Usage:
#   ./setup-apphosting.sh              # Dry-run: show what would happen
#   ./setup-apphosting.sh --create     # Actually create resources
#   ./setup-apphosting.sh --override   # Update all secrets (implies --create)
#
# Environment variables (from .env.production):
#   GCS_BUCKET     - Cloud Storage bucket name (default: synchire-uploads)
#   GCS_LOCATION   - Bucket location (default: asia-southeast1)
#   GCP_PROJECT_ID - GCP project ID (default: synchire-hackathon)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${APP_DIR}/.env.production"

# Parse arguments
DRY_RUN=true
OVERRIDE=false
for arg in "$@"; do
  case $arg in
    --create)
      DRY_RUN=false
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --override)
      OVERRIDE=true
      DRY_RUN=false
      ;;
  esac
done

echo "🚀 Firebase App Hosting Setup"
echo "============================="

if [ "$DRY_RUN" = true ]; then
  echo "🔍 DRY-RUN MODE: No changes will be made"
  echo "   Pass --create to actually create resources"
  echo ""
fi

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
echo "📋 Configuration:"
echo "  Project: $PROJECT_ID"
if [ "$DRY_RUN" = true ]; then
  echo "  Mode: Dry-run"
elif [ "$OVERRIDE" = true ]; then
  echo "  Mode: Override (updating all secrets)"
else
  echo "  Mode: Create missing only"
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
    echo "  ⚠️  Skipping $name (not set in .env.production)"
    return
  fi

  # Write to temp file to avoid stdin conflicts with interactive prompts
  local tmpfile=$(mktemp)
  printf '%s' "$value" > "$tmpfile"

  if secret_exists "$name"; then
    if [ "$DRY_RUN" = true ]; then
      echo "  ✅ $name exists"
    elif [ "$OVERRIDE" = true ]; then
      echo "  Updating $name..."
      firebase apphosting:secrets:set "$name" \
        --project "$PROJECT_ID" \
        --data-file "$tmpfile" \
        --force && echo "    ✅ $name updated" || echo "    ❌ Failed to update $name"
    else
      echo "  ✅ $name exists"
    fi
  else
    if [ "$DRY_RUN" = true ]; then
      echo "  [DRY-RUN] Would create secret: $name"
    else
      echo "  Creating $name..."
      firebase apphosting:secrets:set "$name" \
        --project "$PROJECT_ID" \
        --data-file "$tmpfile" \
        --force && echo "    ✅ $name created" || echo "    ❌ Failed to create $name"
    fi
  fi

  rm -f "$tmpfile"
}

echo "🪣 Checking Cloud Storage bucket..."

# Set up GCS bucket for file uploads
GCS_BUCKET="${GCS_BUCKET:-synchire-uploads}"
GCS_LOCATION="${GCS_LOCATION:-asia-southeast1}"

if gcloud storage buckets describe "gs://$GCS_BUCKET" --project="$PROJECT_ID" &>/dev/null; then
  echo "  ✅ Bucket gs://$GCS_BUCKET exists"
else
  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY-RUN] Would create bucket: gs://$GCS_BUCKET (location: $GCS_LOCATION)"
  else
    echo "  Creating bucket gs://$GCS_BUCKET..."
    gcloud storage buckets create "gs://$GCS_BUCKET" \
      --project="$PROJECT_ID" \
      --location="$GCS_LOCATION" \
      --uniform-bucket-level-access \
      && echo "  ✅ Bucket created" \
      || { echo "  ❌ Failed to create bucket"; exit 1; }
  fi
fi

echo ""
echo "🔑 Checking secrets..."

# Set secrets from .env.production
# AI & Video
set_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
set_secret "STREAM_API_SECRET" "$STREAM_API_SECRET"

# Better Auth
set_secret "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET"

# Google OAuth
set_secret "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
set_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"

# Sentry (error tracking)
set_secret "SENTRY_DSN" "$NEXT_PUBLIC_SENTRY_DSN"

echo ""
echo "🔐 Checking backend access to secrets..."

# Grant backend access to secrets (required for App Hosting)
BACKEND_NAME="${BACKEND_NAME:-synchire}"

# Get backend service account for checking existing access
BACKEND_SA="firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com"

# List of all secrets to grant access
SECRETS="GEMINI_API_KEY STREAM_API_SECRET BETTER_AUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET API_SECRET_KEY SENTRY_DSN"

for secret in $SECRETS; do
  # Check if secret exists first
  if ! secret_exists "$secret"; then
    if [ "$DRY_RUN" = true ]; then
      echo "  [DRY-RUN] Would grant $BACKEND_NAME access to $secret"
    fi
    continue
  fi

  # Check if backend already has access
  if gcloud secrets get-iam-policy "$secret" --project="$PROJECT_ID" 2>/dev/null | grep -q "$BACKEND_SA"; then
    echo "  ✅ $secret access granted"
  else
    if [ "$DRY_RUN" = true ]; then
      echo "  [DRY-RUN] Would grant $BACKEND_NAME access to $secret"
    else
      firebase apphosting:secrets:grantaccess "$secret" \
        --project "$PROJECT_ID" \
        --backend "$BACKEND_NAME" 2>/dev/null && echo "  ✅ $secret access granted" || echo "  ⚠️  $secret (backend may not exist yet)"
    fi
  fi
done

echo ""
echo "📦 Checking App Hosting storage access..."

# Firebase App Hosting uses a dedicated compute service account
APP_HOSTING_SA="firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if permission already exists
if gcloud storage buckets get-iam-policy "gs://$GCS_BUCKET" --project="$PROJECT_ID" 2>/dev/null | grep -q "$APP_HOSTING_SA"; then
  echo "  ✅ Storage access granted to $APP_HOSTING_SA"
else
  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY-RUN] Would grant storage access to $APP_HOSTING_SA"
  else
    gcloud storage buckets add-iam-policy-binding "gs://$GCS_BUCKET" \
      --member="serviceAccount:$APP_HOSTING_SA" \
      --role="roles/storage.objectAdmin" \
      --project="$PROJECT_ID" 2>/dev/null \
      && echo "  ✅ Storage access granted to $APP_HOSTING_SA" \
      || echo "  ⚠️  Could not grant storage access (SA may not exist yet)"
  fi
fi

# Check VPC configuration in apphosting.yaml
echo ""
echo "🌐 Checking VPC configuration..."

APPHOSTING_YAML="${APP_DIR}/apphosting.yaml"
VPC_NETWORK="${VPC_NETWORK:-synchire-network}"
VPC_SUBNET="${VPC_SUBNET:-synchire-subnet}"

if [ -f "$APPHOSTING_YAML" ]; then
  if grep -q "vpcAccess" "$APPHOSTING_YAML"; then
    echo "  ✅ VPC access configured in apphosting.yaml"

    # Verify network and subnet match expected values
    if grep -q "$VPC_NETWORK" "$APPHOSTING_YAML" && grep -q "$VPC_SUBNET" "$APPHOSTING_YAML"; then
      echo "    Network: $VPC_NETWORK"
      echo "    Subnet: $VPC_SUBNET"
    else
      echo "  ⚠️  VPC config found but network/subnet may differ from expected"
      echo "     Expected: network=$VPC_NETWORK, subnet=$VPC_SUBNET"
    fi
  else
    echo "  ⚠️  apphosting.yaml missing vpcAccess configuration"
    echo ""
    echo "     Add the following to runConfig in apphosting.yaml:"
    echo ""
    echo "     runConfig:"
    echo "       vpcAccess:"
    echo "         egress: PRIVATE_RANGES_ONLY"
    echo "         networkInterfaces:"
    echo "           - network: $VPC_NETWORK"
    echo "             subnetwork: $VPC_SUBNET"
  fi
else
  echo "  ⚠️  apphosting.yaml not found at $APPHOSTING_YAML"
fi

echo ""
if [ "$DRY_RUN" = true ]; then
  echo "📋 DRY-RUN Summary:"
  echo "  Bucket: gs://$GCS_BUCKET"
  echo "  Secrets: GEMINI_API_KEY, STREAM_API_SECRET, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SENTRY_DSN"
  echo "  VPC: $VPC_NETWORK / $VPC_SUBNET"
  echo ""
  echo "To create these resources, run:"
  echo "  ./setup-apphosting.sh --create"
else
  echo "✅ Setup complete!"
  echo ""
  echo "Next steps:"
  echo "1. Ensure VPC is configured: ./setup-database.sh --create"
  echo "2. Create backend:  firebase apphosting:backends:create --project $PROJECT_ID"
  echo "3. Push to GitHub:  git push origin main"
  echo "4. Check status:    firebase apphosting:backends:list --project $PROJECT_ID"
fi
