#!/bin/bash
set -e

# Cloud SQL PostgreSQL Setup Script
# Creates a db-f1-micro instance in Singapore with VPC private IP connectivity
#
# Usage:
#   ./setup-database.sh              # Dry-run: show what would happen
#   ./setup-database.sh --create     # Actually create resources
#   ./setup-database.sh --dry-run    # Explicit dry-run (same as no args)
#
# Environment Variables:
#   USE_PRIVATE_IP    - Enable VPC private IP (default: true)
#   VPC_NETWORK       - VPC network name (default: synchire-network)
#   VPC_SUBNET        - VPC subnet name (default: synchire-subnet)

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Timeout for gcloud commands (in seconds)
GCLOUD_TIMEOUT="${GCLOUD_TIMEOUT:-20}"

# Cross-platform timeout function (works on macOS and Linux)
run_with_timeout() {
  "$@" &
  local pid=$!
  ( sleep "$GCLOUD_TIMEOUT" && kill -9 "$pid" 2>/dev/null ) &
  local killer=$!
  wait "$pid" 2>/dev/null
  local result=$?
  kill "$killer" 2>/dev/null
  wait "$killer" 2>/dev/null
  return $result
}

# Parse flags
DRY_RUN=true
for arg in "$@"; do
  if [ "$arg" = "--create" ]; then
    DRY_RUN=false
  fi
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=true
  fi
done

echo "🗄️  SyncHire - Cloud SQL Setup"
echo "=============================="

if [ "$DRY_RUN" = true ]; then
  echo "🔍 DRY-RUN MODE: No changes will be made"
  echo "   Pass --create to actually create resources"
  echo ""
fi

# Load .env.production if it exists (in parent directory - apps/web/)
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${APP_DIR}/.env.production"
if [ -f "$ENV_FILE" ]; then
  echo "📂 Loading .env.production..."
  set -a
  source "$ENV_FILE"
  set +a
  echo "  ✅ Loaded .env.production"
fi

# Check if GCP_PROJECT_ID is set
if [ -z "$GCP_PROJECT_ID" ]; then
  echo "❌ Error: GCP_PROJECT_ID is not set"
  echo "Please set it in .env.production or run: export GCP_PROJECT_ID='your-project-id'"
  exit 1
fi

# Configuration
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-asia-southeast1}"
INSTANCE_NAME="${DB_INSTANCE_NAME:-synchire-db}"
DATABASE_NAME="${DB_NAME:-synchire}"
DB_USER="${DB_USER:-synchire}"
DB_PASSWORD="${DB_PASSWORD:-}"

# VPC Configuration
USE_PRIVATE_IP="${USE_PRIVATE_IP:-true}"
VPC_NETWORK="${VPC_NETWORK:-synchire-network}"
VPC_SUBNET="${VPC_SUBNET:-synchire-subnet}"
VPC_SUBNET_RANGE="${VPC_SUBNET_RANGE:-10.0.0.0/24}"
PRIVATE_RANGE_NAME="google-managed-services-${VPC_NETWORK}"

echo "📋 Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "  Database: $DATABASE_NAME"
echo "  User: $DB_USER"
echo "  Private IP: $USE_PRIVATE_IP"
if [ "$USE_PRIVATE_IP" = "true" ]; then
  echo "  VPC Network: $VPC_NETWORK"
  echo "  VPC Subnet: $VPC_SUBNET"
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI is not installed"
  exit 1
fi

# Enable required APIs
echo ""
echo "🔧 Enabling required APIs..."
if [ "$DRY_RUN" = false ]; then
  gcloud services enable sqladmin.googleapis.com --project=$PROJECT_ID --quiet
  gcloud services enable sql-component.googleapis.com --project=$PROJECT_ID --quiet
  if [ "$USE_PRIVATE_IP" = "true" ]; then
    gcloud services enable compute.googleapis.com --project=$PROJECT_ID --quiet
    gcloud services enable servicenetworking.googleapis.com --project=$PROJECT_ID --quiet
  fi
  echo "  ✅ APIs enabled"
else
  echo "  [DRY-RUN] Would enable: sqladmin.googleapis.com, sql-component.googleapis.com"
  if [ "$USE_PRIVATE_IP" = "true" ]; then
    echo "  [DRY-RUN] Would enable: compute.googleapis.com, servicenetworking.googleapis.com"
  fi
fi

# Setup VPC Network (if private IP enabled)
if [ "$USE_PRIVATE_IP" = "true" ]; then
  echo ""
  echo "🌐 Checking VPC network..."

  if [ "$DRY_RUN" = true ]; then
    # Dry-run: check what exists (with timeout to avoid hanging)
    if run_with_timeout gcloud compute networks describe "$VPC_NETWORK" --project="$PROJECT_ID" &>/dev/null; then
      echo "  ✅ VPC network '$VPC_NETWORK' exists"
    else
      echo "  [DRY-RUN] Would create VPC network: $VPC_NETWORK"
    fi

    if run_with_timeout gcloud compute networks subnets describe "$VPC_SUBNET" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
      echo "  ✅ Subnet '$VPC_SUBNET' exists"
    else
      echo "  [DRY-RUN] Would create subnet: $VPC_SUBNET ($VPC_SUBNET_RANGE)"
    fi

    echo ""
    echo "🔗 Checking Private Service Connection..."
    if run_with_timeout gcloud compute addresses describe "$PRIVATE_RANGE_NAME" --global --project="$PROJECT_ID" &>/dev/null; then
      echo "  ✅ Private IP range '$PRIVATE_RANGE_NAME' allocated"
    else
      echo "  [DRY-RUN] Would allocate private IP range: $PRIVATE_RANGE_NAME"
    fi

    PEERING_OUTPUT=$(run_with_timeout gcloud services vpc-peerings list --network="$VPC_NETWORK" --project="$PROJECT_ID" 2>/dev/null || echo "")
    if echo "$PEERING_OUTPUT" | grep -q "servicenetworking.googleapis.com"; then
      echo "  ✅ Private service connection exists"
    else
      echo "  [DRY-RUN] Would create private service connection"
    fi
  else
    # Create mode: actually create resources
    if gcloud compute networks describe "$VPC_NETWORK" --project="$PROJECT_ID" &>/dev/null; then
      echo "  ✅ VPC network '$VPC_NETWORK' already exists"
    else
      echo "  📦 Creating VPC network: $VPC_NETWORK"
      gcloud compute networks create "$VPC_NETWORK" \
        --project="$PROJECT_ID" \
        --subnet-mode=custom
      echo "  ✅ VPC network created"
    fi

    # Check/create subnet
    if gcloud compute networks subnets describe "$VPC_SUBNET" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
      echo "  ✅ Subnet '$VPC_SUBNET' already exists"
    else
      echo "  📦 Creating subnet: $VPC_SUBNET"
      gcloud compute networks subnets create "$VPC_SUBNET" \
        --project="$PROJECT_ID" \
        --network="$VPC_NETWORK" \
        --region="$REGION" \
        --range="$VPC_SUBNET_RANGE"
      echo "  ✅ Subnet created"
    fi

    # Setup Private Service Connection for Cloud SQL
    echo ""
    echo "🔗 Setting up Private Service Connection..."
    if gcloud compute addresses describe "$PRIVATE_RANGE_NAME" --global --project="$PROJECT_ID" &>/dev/null; then
      echo "  ✅ Private IP range '$PRIVATE_RANGE_NAME' already allocated"
    else
      echo "  📦 Allocating private IP range for Cloud SQL..."
      gcloud compute addresses create "$PRIVATE_RANGE_NAME" \
        --global \
        --purpose=VPC_PEERING \
        --prefix-length=16 \
        --network="$VPC_NETWORK" \
        --project="$PROJECT_ID"
      echo "  ✅ Private IP range allocated"
    fi

    # Check/create VPC peering
    PEERING_EXISTS=$(gcloud services vpc-peerings list --network="$VPC_NETWORK" --project="$PROJECT_ID" 2>/dev/null | grep -c "servicenetworking.googleapis.com" || true)
    if [ "$PEERING_EXISTS" -gt 0 ]; then
      echo "  ✅ Private service connection already exists"
    else
      echo "  📦 Creating private service connection (this may take a few minutes)..."
      gcloud services vpc-peerings connect \
        --service=servicenetworking.googleapis.com \
        --ranges="$PRIVATE_RANGE_NAME" \
        --network="$VPC_NETWORK" \
        --project="$PROJECT_ID"
      echo "  ✅ Private service connection created"
    fi
  fi
fi

# Check for pending Cloud SQL operations (skip in dry-run)
if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "🔍 Checking for pending operations..."
  PENDING_OPS=$(gcloud sql operations list --instance=$INSTANCE_NAME --project=$PROJECT_ID --filter="status!=DONE" --format="value(name)" 2>/dev/null || echo "")
  if [ -n "$PENDING_OPS" ]; then
    echo "  ⏳ Operation in progress for '$INSTANCE_NAME':"
    gcloud sql operations list --instance=$INSTANCE_NAME --project=$PROJECT_ID --filter="status!=DONE" --format="table(name,operationType,status,startTime)"
    echo ""
    echo "  Please wait for the operation to complete before running this script again."
    echo "  You can check status with:"
    echo "    gcloud sql operations list --instance=$INSTANCE_NAME --project=$PROJECT_ID"
    exit 0
  fi
fi

# Check if instance exists and its status
echo ""
echo "🔍 Checking Cloud SQL instance..."
INSTANCE_EXISTS=false
INSTANCE_READY=false

if [ "$DRY_RUN" = true ]; then
  # Dry-run: check if instance exists (with timeout)
  if run_with_timeout gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
    INSTANCE_EXISTS=true
    INSTANCE_STATE=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format='value(state)' 2>/dev/null || echo "UNKNOWN")
    echo "  ✅ Instance '$INSTANCE_NAME' exists (state: $INSTANCE_STATE)"
    INSTANCE_READY=true
  else
    echo "  [DRY-RUN] Would create instance: $INSTANCE_NAME"
    echo "    Type: db-f1-micro PostgreSQL 16 (~\$10-12/month)"
    echo "    Region: $REGION"
    if [ "$USE_PRIVATE_IP" = "true" ]; then
      echo "    Network: $VPC_NETWORK (private IP)"
    fi
  fi
elif gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
  INSTANCE_EXISTS=true
  INSTANCE_STATE=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format='value(state)')

  if [ "$INSTANCE_STATE" = "RUNNABLE" ]; then
    INSTANCE_READY=true
    echo "  ✅ Instance '$INSTANCE_NAME' exists and is RUNNABLE"
  elif [ "$INSTANCE_STATE" = "PENDING_CREATE" ]; then
    echo "  ⏳ Instance '$INSTANCE_NAME' is being created (PENDING_CREATE)"
    echo "     This can take 5-10 minutes. Please wait and run this script again."
    exit 0
  elif [ "$INSTANCE_STATE" = "MAINTENANCE" ]; then
    echo "  🔧 Instance '$INSTANCE_NAME' is under MAINTENANCE"
    echo "     Please wait for maintenance to complete."
    exit 0
  else
    echo "  ⚠️  Instance '$INSTANCE_NAME' exists but state is: $INSTANCE_STATE"
    echo "     You may need to check the instance in GCP Console."
    exit 1
  fi
else
  echo "  ❌ Instance '$INSTANCE_NAME' does NOT exist"
  if [ "$DRY_RUN" = false ]; then
    echo "  📦 Creating Cloud SQL instance (this takes 5-10 minutes)..."

    # Generate password if not provided
    if [ -z "$DB_PASSWORD" ]; then
      DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)
      GENERATED_PASSWORD=true
      echo "  🔐 Generated database password"
    fi

    # Build instance creation command
    CREATE_CMD="gcloud sql instances create $INSTANCE_NAME \
      --database-version=POSTGRES_16 \
      --tier=db-f1-micro \
      --region=$REGION \
      --edition=ENTERPRISE \
      --storage-type=HDD \
      --storage-size=10GB \
      --storage-auto-increase \
      --backup \
      --project=$PROJECT_ID"

    # Add private IP configuration if enabled
    if [ "$USE_PRIVATE_IP" = "true" ]; then
      CREATE_CMD="$CREATE_CMD --network=projects/$PROJECT_ID/global/networks/$VPC_NETWORK --no-assign-ip"
      echo "  🔒 Configuring with private IP only (VPC: $VPC_NETWORK)"
    fi

    eval $CREATE_CMD

    echo "  ✅ Instance created"
    INSTANCE_EXISTS=true
    INSTANCE_READY=true
  else
    echo "  [DRY-RUN] Would create: db-f1-micro PostgreSQL 16 in $REGION (~\$10-12/month)"
  fi
fi

# Get instance connection name (only if instance is ready)
if [ "$INSTANCE_READY" = true ]; then
  CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format='value(connectionName)')
  echo "  📌 Connection name: $CONNECTION_NAME"

  # Enable private IP on existing instance if needed
  if [ "$USE_PRIVATE_IP" = "true" ]; then
    echo ""
    echo "🔍 Checking private IP configuration..."

    # Check if instance has private IP by looking at the network config
    PRIVATE_NETWORK=$(gcloud sql instances describe "$INSTANCE_NAME" \
      --project="$PROJECT_ID" \
      --format="value(settings.ipConfiguration.privateNetwork)" 2>/dev/null || echo "")

    if [ -z "$PRIVATE_NETWORK" ]; then
      echo "  ❌ Private IP not enabled on instance"
      if [ "$DRY_RUN" = false ]; then
        echo "  📦 Enabling private IP on Cloud SQL instance..."
        echo "  ⏳ This may take several minutes..."
        # Note: We keep public IP enabled (remove --no-assign-ip to keep both)
        gcloud sql instances patch "$INSTANCE_NAME" \
          --project="$PROJECT_ID" \
          --network="projects/$PROJECT_ID/global/networks/$VPC_NETWORK" \
          --quiet
        echo "  ✅ Private IP enabled"
      else
        echo "  [DRY-RUN] Would enable private IP on instance"
      fi
    else
      echo "  ✅ Private IP already enabled"
      echo "    Network: $PRIVATE_NETWORK"

      # Get the private IP address
      PRIVATE_IP=$(gcloud sql instances describe "$INSTANCE_NAME" \
        --project="$PROJECT_ID" \
        --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)" 2>/dev/null || echo "")
      if [ -n "$PRIVATE_IP" ]; then
        echo "    Private IP: $PRIVATE_IP"
      fi
    fi
  fi
else
  CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
  echo "  📌 Connection name (expected): $CONNECTION_NAME"
fi

# Check if database exists
echo ""
echo "🔍 Checking database..."
if [ "$INSTANCE_READY" = true ]; then
  if gcloud sql databases describe $DATABASE_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
    echo "  ✅ Database '$DATABASE_NAME' already exists"
  else
    echo "  ❌ Database '$DATABASE_NAME' does NOT exist"
    if [ "$DRY_RUN" = false ]; then
      echo "  📦 Creating database..."
      gcloud sql databases create $DATABASE_NAME \
        --instance=$INSTANCE_NAME \
        --project=$PROJECT_ID
      echo "  ✅ Database created"
    else
      echo "  [DRY-RUN] Would create database: $DATABASE_NAME"
    fi
  fi
else
  echo "  [DRY-RUN] Would create database: $DATABASE_NAME"
fi

# Check if user exists
echo ""
echo "🔍 Checking database user..."
if [ "$INSTANCE_READY" = true ]; then
  if gcloud sql users list --instance=$INSTANCE_NAME --project=$PROJECT_ID | grep -q "^$DB_USER "; then
    echo "  ✅ User '$DB_USER' already exists"
  else
    echo "  ❌ User '$DB_USER' does NOT exist"
    if [ "$DRY_RUN" = false ]; then
      echo "  📦 Creating database user..."

      # Generate password if not set
      if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)
        GENERATED_PASSWORD=true
        echo "  🔐 Generated database password"
      fi

      gcloud sql users create $DB_USER \
        --instance=$INSTANCE_NAME \
        --password=$DB_PASSWORD \
        --project=$PROJECT_ID
      echo "  ✅ User created"

      # Store the generated password in Secret Manager
      if [ "$GENERATED_PASSWORD" = true ]; then
        echo "  📦 Storing DB_PASSWORD in Secret Manager..."
        if gcloud secrets describe DB_PASSWORD --project=$PROJECT_ID &> /dev/null; then
          echo -n "$DB_PASSWORD" | gcloud secrets versions add DB_PASSWORD --data-file=- --project=$PROJECT_ID --quiet
        else
          echo -n "$DB_PASSWORD" | gcloud secrets create DB_PASSWORD --data-file=- --project=$PROJECT_ID --quiet
        fi
        echo "  ✅ DB_PASSWORD stored"
      fi
    else
      echo "  [DRY-RUN] Would create user: $DB_USER"
      echo "  [DRY-RUN] Would store DB_PASSWORD in Secret Manager"
    fi
  fi
else
  echo "  [DRY-RUN] Would create user: $DB_USER"
  echo "  [DRY-RUN] Would store DB_PASSWORD in Secret Manager"
fi

# Check DATABASE_URL secret
echo ""
echo "🔍 Checking DATABASE_URL secret..."

# Build the appropriate DATABASE_URL based on connection type
build_database_url() {
  if [ "$USE_PRIVATE_IP" = "true" ] && [ "$INSTANCE_READY" = true ]; then
    # Get private IP address
    PRIVATE_IP=$(gcloud sql instances describe "$INSTANCE_NAME" \
      --project="$PROJECT_ID" \
      --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)" 2>/dev/null || echo "")

    if [ -n "$PRIVATE_IP" ]; then
      echo "postgresql://${DB_USER}:${DB_PASSWORD}@${PRIVATE_IP}:5432/${DATABASE_NAME}"
    else
      # Fallback to socket format if private IP not available yet
      echo "postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DATABASE_NAME}?host=/cloudsql/${CONNECTION_NAME}"
    fi
  else
    # Use Cloud SQL socket format (for Cloud SQL Proxy)
    echo "postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DATABASE_NAME}?host=/cloudsql/${CONNECTION_NAME}"
  fi
}

if gcloud secrets describe DATABASE_URL --project=$PROJECT_ID &> /dev/null; then
  echo "  ✅ Secret 'DATABASE_URL' already exists"

  # Check if we need to update to private IP format
  if [ "$USE_PRIVATE_IP" = "true" ] && [ "$INSTANCE_READY" = true ] && [ "$DRY_RUN" = false ]; then
    CURRENT_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL --project=$PROJECT_ID 2>/dev/null || echo "")
    if echo "$CURRENT_URL" | grep -q "host=/cloudsql/"; then
      PRIVATE_IP=$(gcloud sql instances describe "$INSTANCE_NAME" \
        --project="$PROJECT_ID" \
        --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)" 2>/dev/null || echo "")

      if [ -n "$PRIVATE_IP" ]; then
        echo "  🔄 Updating DATABASE_URL to use private IP..."
        NEW_URL=$(build_database_url)
        echo -n "$NEW_URL" | gcloud secrets versions add DATABASE_URL --data-file=- --project=$PROJECT_ID --quiet
        echo "  ✅ DATABASE_URL updated to private IP format"
      fi
    fi
  fi
else
  echo "  ❌ Secret 'DATABASE_URL' does NOT exist"
  if [ "$DRY_RUN" = false ] && [ "$INSTANCE_READY" = true ]; then
    DATABASE_URL=$(build_database_url)
    echo "  📦 Creating secret..."
    echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=- --project=$PROJECT_ID --quiet
    echo "  ✅ DATABASE_URL stored in Secret Manager"

    if [ "$USE_PRIVATE_IP" = "true" ]; then
      # Verify the URL format
      if echo "$DATABASE_URL" | grep -q "@10\."; then
        echo "  🔒 Using private IP format"
      else
        echo "  ⚠️  Private IP may not be ready yet. Run script again after instance is fully configured."
      fi
    fi
  else
    echo "  [DRY-RUN] Would create secret: DATABASE_URL"
  fi
fi

# IAM permissions
echo ""
echo "🔍 Checking IAM permissions..."
if [ "$DRY_RUN" = false ]; then
  PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

  # Grant Secret Manager access
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || true

  # Grant Cloud SQL Client access
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/cloudsql.client" \
    --quiet 2>/dev/null || true

  echo "  ✅ IAM permissions configured"
else
  echo "  [DRY-RUN] Would grant: roles/secretmanager.secretAccessor, roles/cloudsql.client"
fi

echo ""
if [ "$DRY_RUN" = true ]; then
  echo "📋 DRY-RUN Summary:"
  if [ "$INSTANCE_READY" = true ]; then
    echo "  Instance: $INSTANCE_NAME (exists, RUNNABLE)"
  elif [ "$INSTANCE_EXISTS" = true ]; then
    echo "  Instance: $INSTANCE_NAME (exists, state: $INSTANCE_STATE)"
  else
    echo "  Instance: $INSTANCE_NAME (would create)"
  fi
  echo "  Region: $REGION"
  echo "  Database: $DATABASE_NAME"
  echo "  User: $DB_USER"
  echo "  Tier: db-f1-micro (~\$10-12/month)"
  if [ "$USE_PRIVATE_IP" = "true" ]; then
    echo "  VPC Network: $VPC_NETWORK"
    echo "  VPC Subnet: $VPC_SUBNET"
    echo "  Connection: Private IP (VPC)"
  fi
  echo ""
  echo "To create these resources, run:"
  echo "  ./setup-database.sh --create"
else
  echo "✅ Cloud SQL setup completed!"
  echo ""
  echo "📋 Summary:"
  echo "  Instance: $INSTANCE_NAME"
  echo "  Region: $REGION"
  echo "  Database: $DATABASE_NAME"
  echo "  User: $DB_USER"
  echo "  Connection: $CONNECTION_NAME"

  if [ "$USE_PRIVATE_IP" = "true" ]; then
    PRIVATE_IP=$(gcloud sql instances describe "$INSTANCE_NAME" \
      --project="$PROJECT_ID" \
      --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)" 2>/dev/null || echo "")
    if [ -n "$PRIVATE_IP" ]; then
      echo "  Private IP: $PRIVATE_IP"
      echo "  VPC Network: $VPC_NETWORK"
    fi
  fi

  echo ""
  echo "🔗 To connect locally (via Cloud SQL Proxy):"
  echo "  gcloud sql connect $INSTANCE_NAME --user=$DB_USER --database=$DATABASE_NAME"

  if [ "$USE_PRIVATE_IP" = "true" ]; then
    echo ""
    echo "📌 For Firebase App Hosting, ensure apphosting.yaml has:"
    echo "  runConfig:"
    echo "    vpcAccess:"
    echo "      egress: PRIVATE_RANGES_ONLY"
    echo "      networkInterfaces:"
    echo "        - network: $VPC_NETWORK"
    echo "          subnetwork: $VPC_SUBNET"
  else
    echo ""
    echo "📌 For Cloud Run, add this flag to your deploy command:"
    echo "  --add-cloudsql-instances=$CONNECTION_NAME"
  fi
fi
echo ""
