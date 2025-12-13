# SyncHire Deployment Guide

## Architecture

```
Firebase App Hosting (synchire--synchire-hackathon.asia-southeast1.hosted.app)
    │
    └── Next.js SSR + API routes
            │
            └── calls → Cloud Run (sync-hire-agent)
```

**Stack:**
- **Next.js** → Firebase App Hosting (auto-deploy on GitHub push)
- **Python Agent** → Cloud Run (manual deploy via script)
- **Secrets** → Google Secret Manager

## Prerequisites

```bash
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
./deploy-cloud-run.sh production
```

### 2. Next.js Web (App Hosting)

**First time setup:**
```bash
cd apps/web
./setup-apphosting.sh                    # Set up secrets
firebase apphosting:backends:create      # Connect GitHub repo
```

**Deploy:** Push to GitHub → auto-deploys
```bash
git push origin main
```

**Manual rollout:**
```bash
firebase apphosting:rollouts:create synchire --git-branch main
```

### 3. Verify

```bash
# App Hosting
curl https://synchire--synchire-hackathon.asia-southeast1.hosted.app

# Python Agent health
curl https://sync-hire-agent-297349712190.asia-southeast1.run.app/health
```

## Configuration

### Next.js (`apps/web/apphosting.yaml`)

Environment variables and secrets are configured in `apphosting.yaml`:

| Variable | Type | Availability |
|----------|------|--------------|
| `NEXT_PUBLIC_STREAM_API_KEY` | value | BUILD + RUNTIME |
| `PYTHON_AGENT_URL` | value | RUNTIME |
| `API_SECRET_KEY` | secret | RUNTIME |
| `STREAM_API_SECRET` | secret | RUNTIME |
| `GEMINI_API_KEY` | secret | RUNTIME |

### Python Agent (`apps/agent/.env.production`)

| Variable | Source |
|----------|--------|
| `API_SECRET_KEY` | Secret Manager |
| `STREAM_API_KEY` | Secret Manager |
| `STREAM_API_SECRET` | Secret Manager |
| `GEMINI_API_KEY` | Secret Manager |
| `HEYGEN_API_KEY` | Secret Manager |

## Useful Commands

### App Hosting
```bash
# List backends
firebase apphosting:backends:list

# View rollouts
firebase apphosting:rollouts:list synchire

# Trigger manual rollout
firebase apphosting:rollouts:create synchire --git-branch main

# Set secret
firebase apphosting:secrets:set SECRET_NAME

# Grant backend access to secret
firebase apphosting:secrets:grantaccess SECRET_NAME --backend synchire
```

### Cloud Run
```bash
# View logs
gcloud logs tail --service=sync-hire-agent

# List revisions
gcloud run revisions list --service=sync-hire-agent --region=asia-southeast1

# Rollback
gcloud run services update-traffic sync-hire-agent \
  --region=asia-southeast1 \
  --to-revisions=REVISION_NAME=100
```

## Troubleshooting

**App Hosting build fails with secret error**
```bash
firebase apphosting:secrets:grantaccess SECRET_NAME --backend synchire
```

**"Invalid API key" errors**
- Verify `API_SECRET_KEY` matches in both services

**Cold start delays**
- Python agent: Set `--min-instances=1` in deploy script
- App Hosting: Set `minInstances: 1` in apphosting.yaml

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Cloud Run (Python agent) | ~$15-20 |
| App Hosting (Next.js) | ~$5-15 |
| Secret Manager | <$1 |
| **Total** | **~$20-35** |
