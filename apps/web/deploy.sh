#!/bin/bash
set -e

# Firebase Hosting Deployment Script for SyncHire Next.js Application
# This script deploys the Next.js web application to Firebase Hosting

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 SyncHire - Firebase Hosting Deployment"
echo "=========================================="

# Load .env.production if it exists
ENV_FILE="${SCRIPT_DIR}/.env.production"
if [ -f "$ENV_FILE" ]; then
  echo "📂 Loading .env.production..."
  set -a
  source "$ENV_FILE"
  set +a
  echo "  ✅ Loaded .env.production"
fi

# Check if GCP_PROJECT_ID is set
if [ -z "$GCP_PROJECT_ID" ]; then
  echo "❌ Error: GCP_PROJECT_ID environment variable is not set"
  echo "Please run: export GCP_PROJECT_ID='your-project-id'"
  exit 1
fi

# Check for API_SECRET_KEY (required for Python agent calls)
if [ -z "$API_SECRET_KEY" ]; then
  echo "⚠️  Warning: API_SECRET_KEY is not set"
  echo "   Python agent calls will fail without this key."
  echo "   Get it from Secret Manager: gcloud secrets versions access latest --secret=API_SECRET_KEY --project=$GCP_PROJECT_ID"
fi

# Update .firebaserc with project ID
echo "📝 Updating .firebaserc with project ID: $GCP_PROJECT_ID"
cat > .firebaserc <<EOF
{
  "projects": {
    "default": "$GCP_PROJECT_ID"
  }
}
EOF

# Get deployment environment (default: production)
ENVIRONMENT=${1:-production}
echo "🌍 Deployment environment: $ENVIRONMENT"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "❌ Error: pnpm is not installed"
  echo "Please install pnpm: npm install -g pnpm"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Build the Next.js application
echo "🔨 Building Next.js application..."
pnpm build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Firebase Hosting
if [ "$ENVIRONMENT" = "preview" ]; then
  echo "🚢 Deploying to Firebase Hosting preview channel..."
  pnpm run deploy:preview
else
  echo "🚢 Deploying to Firebase Hosting production..."
  pnpm run deploy
fi

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed!"
  exit 1
fi

# Grant public access to the Cloud Run service (required for Firebase Hosting)
echo ""
echo "🔐 Configuring IAM for public access..."
REGION="${GCP_REGION:-asia-southeast1}"
SERVICE_NAME="ssrsynchirehackathon"

# Check if the service exists before granting access
if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$GCP_PROJECT_ID &> /dev/null; then
  gcloud run services add-iam-policy-binding $SERVICE_NAME \
    --region=$REGION \
    --project=$GCP_PROJECT_ID \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet 2>/dev/null || true
  echo "  ✅ Public access granted to Cloud Run service"
else
  echo "  ⚠️  Cloud Run service not found yet (first deploy may need manual IAM setup)"
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Visit your Firebase Hosting URL to test the deployment"
echo "2. Test the /python-api proxy by visiting: https://your-app.web.app/api/test-agent"
echo "3. Ensure the Cloud Run service 'sync-hire-agent' is running in $GCP_PROJECT_ID"
echo ""
echo "🔗 Useful Commands:"
echo "  - View deployment: firebase hosting:sites:list"
echo "  - View logs: firebase hosting:channel:list"
echo "  - Rollback: firebase hosting:channel:deploy previous"
echo ""
