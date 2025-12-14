#!/bin/bash
set -e

# Cloud SQL PostgreSQL Setup Script
# Creates a db-f1-micro instance in Singapore if it doesn't exist
#
# Usage:
#   ./setup-database.sh              # Dry-run: show what would happen
#   ./setup-database.sh --create     # Actually create resources
#   ./setup-database.sh --dry-run    # Explicit dry-run (same as no args)

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

echo "📋 Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "  Database: $DATABASE_NAME"
echo "  User: $DB_USER"

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
  echo "  ✅ APIs enabled"
else
  echo "  [DRY-RUN] Would enable: sqladmin.googleapis.com, sql-component.googleapis.com"
fi

# Check for pending Cloud SQL operations
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

# Check if instance exists and its status
echo ""
echo "🔍 Checking Cloud SQL instance..."
INSTANCE_EXISTS=false
INSTANCE_READY=false
if gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
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

    gcloud sql instances create $INSTANCE_NAME \
      --database-version=POSTGRES_16 \
      --tier=db-f1-micro \
      --region=$REGION \
      --edition=ENTERPRISE \
      --storage-type=HDD \
      --storage-size=10GB \
      --storage-auto-increase \
      --backup \
      --project=$PROJECT_ID

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
if gcloud secrets describe DATABASE_URL --project=$PROJECT_ID &> /dev/null; then
  echo "  ✅ Secret 'DATABASE_URL' already exists"
else
  echo "  ❌ Secret 'DATABASE_URL' does NOT exist"
  if [ "$DRY_RUN" = false ] && [ "$INSTANCE_READY" = true ]; then
    # Build connection string
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DATABASE_NAME}?host=/cloudsql/${CONNECTION_NAME}"
    echo "  📦 Creating secret..."
    echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=- --project=$PROJECT_ID --quiet
    echo "  ✅ DATABASE_URL stored in Secret Manager"
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
  echo ""
  echo "🔗 To connect locally:"
  echo "  gcloud sql connect $INSTANCE_NAME --user=$DB_USER --database=$DATABASE_NAME"
  echo ""
  echo "📌 For Cloud Run, add this flag to your deploy command:"
  echo "  --add-cloudsql-instances=$CONNECTION_NAME"
fi
echo ""
