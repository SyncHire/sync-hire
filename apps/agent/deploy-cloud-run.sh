#!/bin/bash
set -e

# =============================================================================
# SyncHire FastAPI Agent - Cloud Run Deployment Script
# =============================================================================
# This script builds and deploys the FastAPI backend to Google Cloud Run
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Docker installed
# - Project configured with billing enabled
# - Artifact Registry API enabled
# - Cloud Run API enabled
# - Secret Manager API enabled
#
# Usage:
#   ./deploy-cloud-run.sh [environment]
#
# Examples:
#   ./deploy-cloud-run.sh production
#   ./deploy-cloud-run.sh staging
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_ID=${GCP_PROJECT_ID:-""}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="sync-hire-agent"
REPOSITORY_NAME="sync-hire"

# Image configuration
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}"
IMAGE_TAG="latest"

# Cloud Run configuration
MIN_INSTANCES=1
MAX_INSTANCES=10
MEMORY="2Gi"
CPU=2
TIMEOUT=3600
CONCURRENCY=10

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
}

load_env_production() {
    print_step "Loading .env.production..."

    if [ -f ".env.production" ]; then
        # Export all variables from .env.production
        set -a
        source .env.production
        set +a
        echo "  ✓ Loaded .env.production"

        # Override PROJECT_ID and REGION from .env.production if set
        if [ -n "$GCP_PROJECT_ID" ]; then
            PROJECT_ID="$GCP_PROJECT_ID"
        fi
        if [ -n "$GCP_REGION" ]; then
            REGION="$GCP_REGION"
        fi

        # Update IMAGE_NAME with new PROJECT_ID
        IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}"
    else
        print_warning ".env.production not found. Please create it from .env.production.example"
        print_warning "Run: cp .env.production.example .env.production"
        read -p "Continue without .env.production? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check for --override flag
OVERRIDE_MODE=false
for arg in "$@"; do
    if [ "$arg" = "--override" ]; then
        OVERRIDE_MODE=true
    fi
done

create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2

    if [ -z "$SECRET_VALUE" ]; then
        print_warning "No value provided for $SECRET_NAME, skipping..."
        return 1
    fi

    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
        if [ "$OVERRIDE_MODE" = true ]; then
            echo "    ↳ Updating secret: $SECRET_NAME"
            echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID --quiet
        else
            echo "    ✓ Secret exists: $SECRET_NAME (use --override to update)"
        fi
    else
        echo "    ↳ Creating secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=- --project=$PROJECT_ID --quiet
    fi
}

setup_secrets_from_env() {
    print_step "Setting up secrets in Secret Manager..."

    # Grant Secret Manager access to Cloud Run service account
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
    echo "  ↳ Granting Secret Manager access to Cloud Run service account..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet 2>/dev/null || true

    # Create/update secrets from .env.production
    create_or_update_secret "API_SECRET_KEY" "${API_SECRET_KEY:-}"
    create_or_update_secret "STREAM_API_KEY" "${STREAM_API_KEY:-}"
    create_or_update_secret "STREAM_API_SECRET" "${STREAM_API_SECRET:-}"
    create_or_update_secret "GEMINI_API_KEY" "${GEMINI_API_KEY:-}"
    create_or_update_secret "HEYGEN_API_KEY" "${HEYGEN_API_KEY:-}"

    echo "  ✓ Secrets configured"
}

print_step() {
    echo -e "${GREEN}➜ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✖ $1${NC}"
}

check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    # Check docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Check project ID
    if [ -z "$PROJECT_ID" ]; then
        print_warning "GCP_PROJECT_ID not set. Attempting to get from gcloud config..."
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

        if [ -z "$PROJECT_ID" ]; then
            print_error "No GCP project configured. Please run: gcloud config set project YOUR_PROJECT_ID"
            exit 1
        fi
    fi

    echo "  ✓ Project ID: $PROJECT_ID"
    echo "  ✓ Region: $REGION"
    echo "  ✓ Environment: $ENVIRONMENT"
}

enable_apis() {
    print_step "Enabling required Google Cloud APIs..."

    gcloud services enable \
        artifactregistry.googleapis.com \
        run.googleapis.com \
        secretmanager.googleapis.com \
        --project=$PROJECT_ID \
        --quiet

    echo "  ✓ APIs enabled"
}

create_artifact_registry() {
    print_step "Checking Artifact Registry repository..."

    # Check if repository exists
    if gcloud artifacts repositories describe $REPOSITORY_NAME \
        --location=$REGION \
        --project=$PROJECT_ID &> /dev/null; then
        echo "  ✓ Repository already exists: $REPOSITORY_NAME"
    else
        print_step "Creating Artifact Registry repository..."
        gcloud artifacts repositories create $REPOSITORY_NAME \
            --repository-format=docker \
            --location=$REGION \
            --description="SyncHire Docker images" \
            --project=$PROJECT_ID
        echo "  ✓ Repository created: $REPOSITORY_NAME"
    fi
}

configure_docker() {
    print_step "Configuring Docker authentication..."
    gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
    echo "  ✓ Docker configured for Artifact Registry"
}

build_and_push_image() {
    print_step "Building Docker image..."

    docker build \
        --platform linux/amd64 \
        -t ${IMAGE_NAME}:${IMAGE_TAG} \
        -t ${IMAGE_NAME}:${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S) \
        .

    echo "  ✓ Image built successfully"

    print_step "Pushing image to Artifact Registry..."
    docker push ${IMAGE_NAME}:${IMAGE_TAG}
    echo "  ✓ Image pushed: ${IMAGE_NAME}:${IMAGE_TAG}"
}

check_secrets() {
    print_step "Checking required secrets in Secret Manager..."

    required_secrets=(
        "API_SECRET_KEY"
        "STREAM_API_KEY"
        "STREAM_API_SECRET"
        "GEMINI_API_KEY"
        "HEYGEN_API_KEY"
    )

    missing_secrets=()

    for secret in "${required_secrets[@]}"; do
        if ! gcloud secrets describe $secret --project=$PROJECT_ID &> /dev/null; then
            missing_secrets+=($secret)
        fi
    done

    if [ ${#missing_secrets[@]} -ne 0 ]; then
        print_warning "Missing secrets in Secret Manager:"
        for secret in "${missing_secrets[@]}"; do
            echo "    - $secret"
        done
        echo ""
        echo "To create secrets, run:"
        echo "  echo -n 'your-secret-value' | gcloud secrets create SECRET_NAME --data-file=- --project=$PROJECT_ID"
        echo ""
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo "  ✓ All required secrets found"
    fi
}

deploy_to_cloud_run() {
    print_step "Deploying to Cloud Run..."

    gcloud run deploy $SERVICE_NAME \
        --image=${IMAGE_NAME}:${IMAGE_TAG} \
        --platform=managed \
        --region=$REGION \
        --project=$PROJECT_ID \
        --allow-unauthenticated \
        --min-instances=$MIN_INSTANCES \
        --max-instances=$MAX_INSTANCES \
        --memory=$MEMORY \
        --cpu=$CPU \
        --timeout=${TIMEOUT}s \
        --concurrency=$CONCURRENCY \
        --cpu-boost \
        --no-cpu-throttling \
        --set-env-vars="ENVIRONMENT=${ENVIRONMENT}" \
        --set-secrets="API_SECRET_KEY=API_SECRET_KEY:latest,STREAM_API_KEY=STREAM_API_KEY:latest,STREAM_API_SECRET=STREAM_API_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,HEYGEN_API_KEY=HEYGEN_API_KEY:latest" \
        --quiet

    echo "  ✓ Deployed to Cloud Run"
}

get_service_url() {
    print_step "Getting service URL..."

    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format='value(status.url)')

    echo "  ✓ Service URL: $SERVICE_URL"
}

test_health_endpoint() {
    print_step "Testing health endpoint..."

    if curl -s "${SERVICE_URL}/health" > /dev/null; then
        echo "  ✓ Health check passed"
        echo ""
        echo "Response:"
        curl -s "${SERVICE_URL}/health" | jq .
    else
        print_warning "Health check failed - service may still be starting up"
    fi
}

print_next_steps() {
    print_header "Deployment Complete! 🎉"
    echo ""
    echo "Service URL: $SERVICE_URL"
    echo ""
    echo "Next steps:"
    echo "  1. Update Next.js environment variables:"
    echo "     AGENT_API_URL=${SERVICE_URL}"
    echo "     AGENT_API_KEY=<value-from-secret-manager>"
    echo ""
    echo "  2. Configure Firebase Hosting rewrites in firebase.json:"
    echo "     {\"source\": \"/python-api/**\", \"run\": {\"serviceId\": \"${SERVICE_NAME}\"}}"
    echo ""
    echo "  3. Test the API:"
    echo "     curl -H \"X-API-Key: YOUR_API_KEY\" ${SERVICE_URL}/"
    echo ""
    echo "  4. View logs:"
    echo "     gcloud logs tail --project=$PROJECT_ID --service=$SERVICE_NAME"
    echo ""
}

# =============================================================================
# Main Deployment Flow
# =============================================================================

main() {
    print_header "SyncHire FastAPI Agent - Cloud Run Deployment"

    load_env_production
    check_prerequisites
    enable_apis
    setup_secrets_from_env
    create_artifact_registry
    configure_docker
    build_and_push_image
    deploy_to_cloud_run
    get_service_url
    test_health_endpoint
    print_next_steps
}

# Run main function
main
