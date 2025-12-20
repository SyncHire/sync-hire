# Phase 7: Docker & Deployment

## Goal
Containerize the processor service and configure deployment.

## Prerequisites
- Phase 1-6 completed
- Full integration tested locally

## Deliverables

### New/Modified Files
```
apps/processor/
├── Dockerfile
├── .dockerignore
└── docker-compose.processor.yml    # Standalone compose for processor

sync-hire/
├── docker-compose.yml              # Updated with processor service
└── .env.example                    # Updated with processor vars
```

---

## Tasks

### 1. Create Dockerfile
```dockerfile
# apps/processor/Dockerfile

# ================================
# Stage 1: Dependencies
# ================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy package.json files for all packages
COPY apps/processor/package.json ./apps/processor/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ================================
# Stage 2: Builder
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/processor/node_modules ./apps/processor/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source
COPY packages/shared ./packages/shared
COPY apps/processor ./apps/processor
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Build shared package first
RUN pnpm --filter @sync-hire/shared build || echo "No build script"

# Build processor
RUN pnpm --filter @sync-hire/processor build

# ================================
# Stage 3: Production
# ================================
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S processor -u 1001 -G nodejs

# Copy built artifacts
COPY --from=builder /app/apps/processor/dist ./dist
COPY --from=builder /app/apps/processor/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R processor:nodejs /app

USER processor

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "dist/index.js"]
```

### 2. Create .dockerignore
```
# apps/processor/.dockerignore
node_modules
dist
.env
.env.local
*.log
.git
.gitignore
README.md
*.md
__tests__
coverage
.turbo
```

### 3. Update docker-compose.yml
```yaml
# docker-compose.yml (root level)
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PROCESSOR_SERVICE_URL=http://processor:3001
      - NEXT_PUBLIC_BASE_URL=http://localhost:3000
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - STREAM_API_SECRET=${STREAM_API_SECRET}
      - NEXT_PUBLIC_STREAM_API_KEY=${NEXT_PUBLIC_STREAM_API_KEY}
    depends_on:
      processor:
        condition: service_healthy
    volumes:
      - web-data:/app/data

  processor:
    build:
      context: .
      dockerfile: apps/processor/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=gemini-2.5-flash
      - CONFIDENCE_THRESHOLD=0.75
      - WEBHOOK_TIMEOUT_MS=30000
      - WEBHOOK_RETRY_ATTEMPTS=3
      # LangSmith (optional)
      - LANGCHAIN_TRACING_V2=${LANGCHAIN_TRACING_V2:-false}
      - LANGCHAIN_API_KEY=${LANGCHAIN_API_KEY:-}
      - LANGCHAIN_PROJECT=${LANGCHAIN_PROJECT:-sync-hire-processor}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  agent:
    build:
      context: .
      dockerfile: apps/agent/Dockerfile
    ports:
      - "8080:8080"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - STREAM_API_KEY=${NEXT_PUBLIC_STREAM_API_KEY}
      - STREAM_API_SECRET=${STREAM_API_SECRET}
      - NEXTJS_WEBHOOK_URL=http://web:3000
    depends_on:
      - web

volumes:
  web-data:
```

### 4. Create standalone docker-compose for processor
```yaml
# apps/processor/docker-compose.processor.yml
# For running processor service independently

version: '3.8'

services:
  processor:
    build:
      context: ../..
      dockerfile: apps/processor/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=gemini-2.5-flash
      - CONFIDENCE_THRESHOLD=0.75
      - LANGCHAIN_TRACING_V2=${LANGCHAIN_TRACING_V2:-false}
      - LANGCHAIN_API_KEY=${LANGCHAIN_API_KEY:-}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5. Update root .env.example
```bash
# .env.example

# ===========================================
# Shared
# ===========================================
GEMINI_API_KEY=your-gemini-api-key

# ===========================================
# Web App (Next.js)
# ===========================================
NEXT_PUBLIC_STREAM_API_KEY=your-stream-api-key
STREAM_API_SECRET=your-stream-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
PROCESSOR_SERVICE_URL=http://localhost:3001

# ===========================================
# Processor Service
# ===========================================
# PORT=3001  (default)
GEMINI_MODEL=gemini-2.5-flash
CONFIDENCE_THRESHOLD=0.75
WEBHOOK_TIMEOUT_MS=30000
WEBHOOK_RETRY_ATTEMPTS=3

# LangSmith (optional monitoring)
LANGCHAIN_TRACING_V2=false
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=sync-hire-processor

# ===========================================
# Agent Service (Python)
# ===========================================
# See apps/agent/.env.example
```

### 6. Create deployment scripts
```bash
# scripts/build-processor.sh
#!/bin/bash
set -e

echo "Building processor service..."

# Build from root context
docker build \
  -f apps/processor/Dockerfile \
  -t sync-hire-processor:latest \
  .

echo "Build complete!"
```

```bash
# scripts/run-processor.sh
#!/bin/bash
set -e

# Load env vars
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

docker run -d \
  --name sync-hire-processor \
  -p 3001:3001 \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e GEMINI_MODEL="gemini-2.5-flash" \
  -e CONFIDENCE_THRESHOLD="0.75" \
  sync-hire-processor:latest

echo "Processor service started on port 3001"
```

### 7. Add turbo.json docker commands
```json
// turbo.json - add to pipeline
{
  "pipeline": {
    "docker:build": {
      "cache": false
    },
    "@sync-hire/processor#docker:build": {
      "dependsOn": ["@sync-hire/shared#build"]
    }
  }
}
```

### 8. Add npm scripts
```json
// apps/processor/package.json - add scripts
{
  "scripts": {
    "docker:build": "docker build -f Dockerfile -t sync-hire-processor:latest ../..",
    "docker:run": "docker run -p 3001:3001 --env-file .env sync-hire-processor:latest"
  }
}
```

---

## LangSmith Integration

### Enable Tracing
Set environment variables:
```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=sync-hire-processor
```

### What Gets Traced
- All LangGraph node executions
- Gemini API calls
- State transitions
- Processing durations
- Confidence scores

### Viewing Traces
1. Go to https://smith.langchain.com
2. Select project "sync-hire-processor"
3. View individual runs and their steps

---

## Health Monitoring

### Health Endpoint Response
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 3600,
  "environment": "production",
  "dependencies": {
    "gemini": "configured",
    "langsmith": "enabled"
  }
}
```

### Docker Health Check
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3
- Start period: 10 seconds (grace period)

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables set
- [ ] GEMINI_API_KEY is valid
- [ ] Webhook URL is accessible from processor
- [ ] Health endpoint responds

### Build & Deploy
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f processor

# Check health
curl http://localhost:3001/health
```

### Post-Deployment Verification
- [ ] Health endpoint returns "healthy"
- [ ] Can upload JD from web app
- [ ] Webhook is received
- [ ] Results appear in web app
- [ ] LangSmith shows traces (if enabled)

---

## Troubleshooting

### Processor won't start
```bash
# Check logs
docker logs sync-hire-processor

# Common issues:
# - Missing GEMINI_API_KEY
# - Port 3001 already in use
# - Build failed
```

### Webhook not received
```bash
# Check processor can reach web app
docker exec sync-hire-processor wget -q -O - http://web:3000/health

# Common issues:
# - Incorrect NEXT_PUBLIC_BASE_URL
# - Network isolation
# - Web app not running
```

### LangSmith traces not appearing
```bash
# Verify environment
docker exec sync-hire-processor env | grep LANGCHAIN

# Common issues:
# - LANGCHAIN_TRACING_V2 not set to "true"
# - Invalid LANGCHAIN_API_KEY
```

---

## Success Criteria
- [ ] Dockerfile builds successfully
- [ ] Container starts and health check passes
- [ ] docker-compose.yml brings up all services
- [ ] End-to-end flow works in Docker
- [ ] LangSmith integration works (optional)
- [ ] Documentation is complete
