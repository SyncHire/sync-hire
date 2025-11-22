# Google Cloud Platform Deployment Plan

This document outlines the strategy for deploying sync-hire to Google Cloud Platform.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                        │
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │  Cloud Run   │         │  Cloud Run   │                     │
│  │  (Next.js)   │◄───────►│  (FastAPI)   │                     │
│  │  Port 8080   │         │  Port 8080   │                     │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                              │
│         │    ┌───────────────────┴────────────┐                │
│         │    │                                │                │
│  ┌──────▼────▼──┐    ┌─────────────┐   ┌─────▼─────┐          │
│  │   Secret     │    │  Artifact   │   │  Cloud    │          │
│  │   Manager    │    │  Registry   │   │  Build    │          │
│  └──────────────┘    └─────────────┘   └───────────┘          │
│                                                                 │
│  ┌──────────────┐    (Future)                                  │
│  │  Cloud SQL   │    - PostgreSQL database                     │
│  │  (Postgres)  │    - Prisma ORM integration                  │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘

External Services:
- Stream.io (Video SDK)
- Gemini/OpenAI (LLM APIs)
- HeyGen (Avatar - optional)
- Deepgram (Speech - optional)
```

## Service Mapping

| Component | GCP Service | Port | Notes |
|-----------|-------------|------|-------|
| Next.js Web App | Cloud Run | 8080 | Serverless, auto-scaling |
| FastAPI Agent | Cloud Run | 8080 | AI interview agent |
| Container Images | Artifact Registry | - | Docker image storage |
| Secrets/API Keys | Secret Manager | - | Secure credential storage |
| CI/CD Pipeline | Cloud Build | - | GitHub integration |
| Database (future) | Cloud SQL | 5432 | PostgreSQL with Prisma |

## Phase 1: Prepare Production Dockerfiles

### 1.1 Create Next.js Production Dockerfile

Create `apps/web/Dockerfile`:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN corepack enable pnpm && pnpm build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
```

### 1.2 Update Next.js Config

Update `apps/web/next.config.ts` to add standalone output:

```typescript
const nextConfig = {
  output: 'standalone',
  // ... existing config
};
```

### 1.3 Verify FastAPI Dockerfile

The existing `apps/agent/Dockerfile` is already production-ready:
- Uses Python 3.11-slim with multi-stage build
- Uses `uv` for fast dependency installation
- Exposes port 8080
- No changes needed

## Phase 2: Cloud Build Configuration

### 2.1 Root Cloud Build Config

Create `cloudbuild.yaml` at project root:

```yaml
steps:
  # Build and push Next.js web app
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/sync-hire-web:${SHORT_SHA}'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/sync-hire-web:latest'
      - '-f'
      - 'apps/web/Dockerfile'
      - 'apps/web'
    id: 'build-web'

  # Build and push FastAPI agent
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/sync-hire-agent:${SHORT_SHA}'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/sync-hire-agent:latest'
      - '-f'
      - 'apps/agent/Dockerfile'
      - 'apps/agent'
    id: 'build-agent'

  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/sync-hire-web']
    waitFor: ['build-web']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/sync-hire-agent']
    waitFor: ['build-agent']

  # Deploy agent first
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'sync-hire-agent'
      - '--image'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/sync-hire-agent:${SHORT_SHA}'
      - '--region'
      - '${_REGION}'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--memory'
      - '1Gi'
      - '--cpu'
      - '1'
      - '--min-instances'
      - '0'
      - '--max-instances'
      - '10'
    id: 'deploy-agent'

  # Deploy web app
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'sync-hire-web'
      - '--image'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/sync-hire-web:${SHORT_SHA}'
      - '--region'
      - '${_REGION}'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--memory'
      - '512Mi'
      - '--cpu'
      - '1'
      - '--min-instances'
      - '0'
      - '--max-instances'
      - '10'
    id: 'deploy-web'
    waitFor: ['deploy-agent']

substitutions:
  _REGION: us-central1
  _REPO: sync-hire

options:
  logging: CLOUD_LOGGING_ONLY
```

## Phase 3: GCP Project Setup

### 3.1 Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 3.2 Create Artifact Registry Repository

```bash
gcloud artifacts repositories create sync-hire \
  --repository-format=docker \
  --location=us-central1 \
  --description="sync-hire Docker images"
```

### 3.3 Configure Secret Manager

Create secrets for all sensitive environment variables:

```bash
# Stream.io
echo -n "your-stream-api-key" | gcloud secrets create STREAM_API_KEY --data-file=-
echo -n "your-stream-api-secret" | gcloud secrets create STREAM_API_SECRET --data-file=-

# LLM APIs
echo -n "your-gemini-api-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your-openai-api-key" | gcloud secrets create OPENAI_API_KEY --data-file=-

# Optional services
echo -n "your-heygen-api-key" | gcloud secrets create HEYGEN_API_KEY --data-file=-
echo -n "your-deepgram-api-key" | gcloud secrets create DEEPGRAM_API_KEY --data-file=-
```

### 3.4 Grant Cloud Run Access to Secrets

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding STREAM_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets...
```

## Phase 4: Manual Deployment Commands

### 4.1 Deploy FastAPI Agent

```bash
# Build and push
cd apps/agent
gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/sync-hire/sync-hire-agent

# Deploy
gcloud run deploy sync-hire-agent \
  --image us-central1-docker.pkg.dev/PROJECT_ID/sync-hire/sync-hire-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --set-secrets="STREAM_API_KEY=STREAM_API_KEY:latest,STREAM_API_SECRET=STREAM_API_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="ENVIRONMENT=production,PORT=8080"
```

### 4.2 Deploy Next.js Web App

```bash
# Get agent URL
AGENT_URL=$(gcloud run services describe sync-hire-agent --region us-central1 --format='value(status.url)')

# Build and push
cd apps/web
gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/sync-hire/sync-hire-web

# Deploy
gcloud run deploy sync-hire-web \
  --image us-central1-docker.pkg.dev/PROJECT_ID/sync-hire/sync-hire-web \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --set-secrets="STREAM_API_SECRET=STREAM_API_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NEXT_PUBLIC_STREAM_API_KEY=your-public-key,PYTHON_AGENT_URL=${AGENT_URL}"
```

### 4.3 Update Agent with Web URL

```bash
WEB_URL=$(gcloud run services describe sync-hire-web --region us-central1 --format='value(status.url)')

gcloud run services update sync-hire-agent \
  --region us-central1 \
  --set-env-vars="NEXTJS_WEBHOOK_URL=${WEB_URL}"
```

## Phase 5: GitHub Actions CI/CD (Optional)

### 5.1 Web App Workflow

Create `.github/workflows/deploy-web.yml`:

```yaml
name: Deploy Web to Cloud Run

on:
  push:
    branches: [master]
    paths:
      - 'apps/web/**'

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE: sync-hire-web

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev

      - name: Build and Push
        run: |
          docker build -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/sync-hire/${{ env.SERVICE }}:${{ github.sha }} -f apps/web/Dockerfile apps/web
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/sync-hire/${{ env.SERVICE }}:${{ github.sha }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE }} \
            --image ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/sync-hire/${{ env.SERVICE }}:${{ github.sha }} \
            --region ${{ env.REGION }} \
            --platform managed
```

### 5.2 Agent Workflow

Create `.github/workflows/deploy-agent.yml` with similar structure, adjusting paths and service name.

## Environment Variables Reference

### Next.js Web App (`apps/web`)

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_STREAM_API_KEY` | Public | Stream.io public API key |
| `STREAM_API_SECRET` | Secret | Stream.io secret key |
| `PYTHON_AGENT_URL` | Env | URL of deployed FastAPI agent |
| `NEXT_PUBLIC_DEMO_USER_NAME` | Public | Demo user name |
| `NEXT_PUBLIC_LOGO_DEV_KEY` | Public | Logo.dev API key |
| `GEMINI_API_KEY` | Secret | Google Gemini API key |

### FastAPI Agent (`apps/agent`)

| Variable | Type | Description |
|----------|------|-------------|
| `PORT` | Env | Server port (8080 for Cloud Run) |
| `ENVIRONMENT` | Env | `development` or `production` |
| `STREAM_API_KEY` | Secret | Stream.io API key |
| `STREAM_API_SECRET` | Secret | Stream.io secret key |
| `GEMINI_API_KEY` | Secret | Google Gemini API key |
| `OPENAI_API_KEY` | Secret | OpenAI API key (alternative to Gemini) |
| `GEMINI_USE_REALTIME` | Env | `true` for Gemini Live API |
| `HEYGEN_API_KEY` | Secret | HeyGen avatar API key (optional) |
| `DEEPGRAM_API_KEY` | Secret | Deepgram speech API key (optional) |
| `NEXTJS_WEBHOOK_URL` | Env | URL of deployed Next.js app |

## Cost Estimates

Cloud Run pricing (as of 2024):
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests
- **Free tier**: 2 million requests/month, 360,000 vCPU-seconds, 180,000 GiB-seconds

Estimated monthly cost for low-traffic usage: **< $10/month**

## Next Steps

1. [ ] Create production Dockerfile for Next.js
2. [ ] Update `next.config.ts` with standalone output
3. [ ] Create GCP project and enable APIs
4. [ ] Set up Artifact Registry
5. [ ] Configure Secret Manager with API keys
6. [ ] Deploy FastAPI agent
7. [ ] Deploy Next.js web app
8. [ ] Configure service URLs (circular dependency)
9. [ ] Set up CI/CD (optional)
10. [ ] Configure custom domain (optional)

## References

- [Deploy Next.js to Cloud Run](https://cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service)
- [Deploy FastAPI to Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-fastapi-service)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
