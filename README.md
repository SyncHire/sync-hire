# SyncHire - AI-Powered Interview Platform

> Hiring is broken. Companies spend 40+ hours per role on screening calls, while great candidates slip through the cracks. SyncHire fixes this.

## What is SyncHire?

SyncHire is an AI-powered interview platform that conducts preliminary video interviews 24/7. Candidates interview on their schedule with our AI interviewer. Every response is transcribed, scored, and analyzed. Recruiters review only the best matches.

## Why SyncHire?

- **Always-on interviews** — Candidates interview anytime, anywhere. No scheduling headaches.
- **AI-generated questions** — Upload a job description, get tailored interview questions instantly.
- **Smart CV matching** — 70-95% match scores based on skills, experience, and role fit.
- **Structured scoring** — Every candidate scored on technical skills, communication, problem-solving, and experience relevance.
- **Real-time transcription** — Live captions and full transcripts for every interview.
- **Two-sided platform** — Works for both employers posting jobs AND candidates finding opportunities.

---

## Tech Stack

Real-time AI interview platform using Next.js, Python Vision-Agents, and Google Cloud Platform.

## Project Structure

```
sync-hire/
├── apps/
│   ├── web/          # Next.js 16 application (frontend + API)
│   └── agent/        # Python FastAPI agent (AI interview service)
├── packages/         # Shared packages (future)
├── docs/             # Documentation
├── openspec/         # OpenSpec specifications
└── docker-compose.yml
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind v4
- **Backend:** Python 3.11, FastAPI
- **Package Manager:** PNPM (monorepo management), uv (Python)
- **Monorepo:** Turborepo
- **Development:** Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PNPM 9+
- Docker Desktop (optional, for containerized development)

### Local Development (without Docker)

1. **Install dependencies:**
   ```bash
   # Install PNPM globally if needed
   npm install -g pnpm@9.15.0

   # Install all workspace dependencies
   pnpm install
   ```

2. **Start Python agent:**
   ```bash
   cd apps/agent

   # Install Python dependencies (using uv for speed)
   pip install -r requirements.txt
   # Or with uv: uv pip install -r requirements.txt

   # Start the agent
   python main.py
   ```
   Agent will run on http://localhost:8080

3. **Start Next.js app** (in a new terminal):
   ```bash
   cd apps/web

   # Start development server
   npm run dev
   ```
   Web app will run on http://localhost:3000

4. **Test the connection:**
   - Open http://localhost:3000/api/test-agent
   - You should see a successful response from the Python agent

### Docker Development

```bash
# Build and start all services
docker-compose up --build

# Services will be available at:
# - Next.js: http://localhost:3000
# - Python Agent: http://localhost:8080
# - Test endpoint: http://localhost:3000/api/test-agent
```

### Testing the Connection

**Method 1: Browser**
- Navigate to http://localhost:3000/api/test-agent
- Should return JSON with `success: true` and agent response

**Method 2: cURL**
```bash
# Health check
curl http://localhost:3000/api/test-agent

# POST request
curl -X POST http://localhost:3000/api/test-agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from Next.js", "data": {"test": true}}'
```

**Method 3: Direct Python agent**
```bash
# Health check
curl http://localhost:8080/health

# Process endpoint
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{"message": "Direct test", "data": {"source": "curl"}}'
```

## Turborepo Commands

```bash
# Run all dev servers (Next.js + Python agent)
pnpm dev

# Build all applications
pnpm build

# Lint all code
pnpm lint

# Clean all build artifacts
pnpm clean
```

## Infrastructure Scripts

| Script | Description |
|--------|-------------|
| `apps/web/scripts/setup-database.sh` | Create Cloud SQL instance, VPC, and secrets |
| `apps/web/scripts/setup-apphosting.sh` | Set up GCS bucket and App Hosting secrets |
| `packages/database/scripts/migrate-cloud.sh` | Run migrations via Cloud SQL Proxy |
| `packages/database/scripts/migrate-production.sh` | Run migrations (direct connection) |

Setup scripts run in dry-run mode by default; pass `--create` to execute.

## Project Status

**Currently in Open Beta** — [Try it free](https://synchire.com)

### ✅ Completed
- Monorepo foundation (Turborepo + PNPM)
- Next.js 16 application with TypeScript
- Python FastAPI agent with AI interview capabilities
- Database setup (Prisma + Cloud SQL with VPC)
- Authentication (Better Auth with Google OAuth)
- Cloud Storage (GCS for CV uploads)
- CV parsing and analysis (Gemini AI)
- Question generation from job descriptions
- HR dashboard with job management
- Real-time AI video interviews (Stream Video + Deepgram)
- Interview scoring and AI evaluation
- Candidate job matching with scores

### 📋 Planned
- Email notifications
- Advanced analytics dashboard

## Environment Variables

Copy the example files and fill in your values:

```bash
# Web app
cp apps/web/.env.example apps/web/.env.local

# Python agent
cp apps/agent/.env.example apps/agent/.env
```

See `apps/web/.env.example` for all required variables including:
- Database connection (`DATABASE_URL`)
- Authentication (`BETTER_AUTH_SECRET`, Google OAuth)
- AI services (`GEMINI_API_KEY`, `STREAM_API_SECRET`)
- Cloud Storage (`GCS_BUCKET`)

## Architecture

```
┌─────────────────┐         HTTP          ┌──────────────────┐
│   Next.js App   │ ◄─────────────────► │  Python Agent    │
│   (port 3000)   │    JSON API          │   (port 8080)    │
│                 │                       │                  │
│  - Frontend     │                       │  - FastAPI       │
│  - API Routes   │                       │  - Vision-Agents │
│  - TypeScript   │                       │  - AI Logic      │
└─────────────────┘                       └──────────────────┘
```

## Development Workflow

1. **Start local development**: `pnpm dev`
2. **Run database migrations**: `pnpm db:migrate`
3. **Check types**: `pnpm typecheck`
4. **Deploy**: Push to `main` branch (Firebase App Hosting auto-deploys)

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System architecture and design decisions
- [API Specification](./docs/API_SPEC.md) - API endpoints and data models
- [Vision-Agents Integration](./docs/VISION_AGENTS_INTEGRATION.md) - Python agent setup
- [HeyGen Avatar Setup](./apps/agent/HEYGEN_SETUP.md) - Interactive avatar configuration

## Support

For issues or questions, please check the documentation or create an issue in the repository.
