# SyncHire Deployment Guide

## Architecture

```
Firebase Hosting (synchire-hackathon.web.app)
    │
    ├── Next.js SSR + API routes
    │
    └── /python-api/** → Cloud Run (sync-hire-agent)
```

**Why this pattern?**
- No CORS issues (same origin)
- Unified domain for frontend + backend
- Automatic SSL via Firebase

## Prerequisites

```bash
# Tools required
gcloud --version    # Google Cloud CLI
docker --version    # Docker
pnpm --version      # Package manager
uv --version        # Python package manager

# Authenticate
gcloud auth login
gcloud config set project synchire-hackathon
firebase login
```

## Quick Deploy

### 1. Python Agent (Cloud Run)

```bash
cd apps/agent
cp .env.production.example .env.production
# Edit .env.production with actual values

./deploy-cloud-run.sh production
```

### 2. Next.js Web (Firebase Hosting)

```bash
cd apps/web
cp .env.production.example .env.production
# Edit .env.production with actual values

./deploy.sh production
```

### 3. Verify

```bash
# Health check
curl https://synchire-hackathon.web.app/python-api/health

# Test agent proxy
curl https://synchire-hackathon.web.app/api/test-agent
```

## Environment Variables

### Python Agent (`apps/agent/.env.production`)

| Variable | Source | Required |
|----------|--------|----------|
| `API_SECRET_KEY` | Secret Manager | Yes |
| `STREAM_API_KEY` | Secret Manager | Yes |
| `STREAM_API_SECRET` | Secret Manager | Yes |
| `GEMINI_API_KEY` | Secret Manager | Yes |
| `HEYGEN_API_KEY` | Secret Manager | Yes |
| `NEXTJS_WEBHOOK_URL` | env | Yes |

### Next.js Web (`apps/web/.env.production`)

| Variable | Source | Required |
|----------|--------|----------|
| `GCP_PROJECT_ID` | env | Yes |
| `API_SECRET_KEY` | env | Yes |
| `NEXT_PUBLIC_STREAM_API_KEY` | env | Yes |
| `STREAM_API_SECRET` | env | Yes |
| `GEMINI_API_KEY` | env | Yes |

## Secret Manager Commands

```bash
# Create a secret
echo -n 'value' | gcloud secrets create SECRET_NAME --data-file=-

# Update a secret
echo -n 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=-

# Read a secret
gcloud secrets versions access latest --secret=SECRET_NAME

# Generate API key
openssl rand -base64 32
```

## Cloud Run Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Min instances | 1 | Avoid cold starts |
| Max instances | 10 | Handle concurrent load |
| Memory | 2Gi | WebRTC + LLM needs |
| CPU | 2 | Real-time processing |
| Timeout | 3600s | Long interviews |
| Region | asia-southeast1 | Low latency |

## IAM Permissions

```bash
# Grant public access to Cloud Run (required for Firebase proxy)
gcloud run services add-iam-policy-binding sync-hire-agent \
  --region=asia-southeast1 \
  --member="allUsers" \
  --role="roles/run.invoker"

# Grant Secret Manager access to Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe synchire-hackathon --format='value(projectNumber)')
gcloud projects add-iam-policy-binding synchire-hackathon \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Useful Commands

```bash
# View Cloud Run logs
gcloud logs tail --service=sync-hire-agent

# List Cloud Run revisions
gcloud run revisions list --service=sync-hire-agent --region=asia-southeast1

# Rollback to previous revision
gcloud run services update-traffic sync-hire-agent \
  --region=asia-southeast1 \
  --to-revisions=REVISION_NAME=100

# Firebase hosting status
firebase hosting:sites:list

# Re-authenticate Firebase
firebase login --reauth
```

## Troubleshooting

**403 Forbidden on API routes**
- Cloud Run needs public IAM access (see IAM commands above)

**502 Bad Gateway on /python-api/**
- Check Cloud Run service is running: `gcloud run services describe sync-hire-agent --region=asia-southeast1`
- Check logs: `gcloud logs tail --service=sync-hire-agent`

**"Invalid API key" errors**
- Verify `API_SECRET_KEY` matches in both services
- Check: `gcloud secrets versions access latest --secret=API_SECRET_KEY`

**Cold start delays (10-20s)**
- Set `--min-instances=1` to keep instance warm

**Firebase auth expired**
- Run: `firebase login --reauth`

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Cloud Run (1 always-on instance) | ~$15-20 |
| Firebase Hosting | ~$5-10 |
| Secret Manager | <$1 |
| Cloud SQL (db-f1-micro) | ~$10 |
| **Total** | **~$30-40** |

**To reduce costs:**
- Set `--min-instances=0` (adds cold start delay)
- Use `db-f1-micro` for Cloud SQL
- Monitor bandwidth usage
