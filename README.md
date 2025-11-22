# SyncHire - AI-Powered Interview Platform

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

## Project Status

### ✅ Completed
- Monorepo foundation (Turborepo + PNPM)
- Next.js 16 application with TypeScript
- Python FastAPI agent with minimal endpoints
- API route for Next.js ↔ Python communication
- Docker Compose configuration

### 🚧 In Progress
- Vision-Agents integration
- Database setup (Prisma + Cloud SQL)
- Authentication (NextAuth.js v5)
- Firebase Cloud Storage

### 📋 Planned
- AI interview functionality
- Real-time WebRTC video
- Question generation (Gemini 2.5 Flash)
- CV analysis
- Interview summaries

## Environment Variables

### apps/web/.env.local
```env
PYTHON_AGENT_URL=http://localhost:8080
```

### apps/agent/.env
```env
PORT=8080
ENVIRONMENT=development
```

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

## Next Steps

1. **Test the connection** using the methods above
2. **Add Vision-Agents** to the Python agent for AI interview capabilities
3. **Set up database** (Prisma + PostgreSQL)
4. **Add authentication** (NextAuth.js v5)
5. **Integrate AI models** (Gemini 2.5 Flash, OpenAI gpt-realtime)

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System architecture and design decisions
- [API Specification](./docs/API_SPEC.md) - API endpoints and data models
- [Vision-Agents Integration](./docs/VISION_AGENTS_INTEGRATION.md) - Python agent setup
- [HeyGen Avatar Setup](./apps/agent/HEYGEN_SETUP.md) - Interactive avatar configuration

## Support

For issues or questions, please check the documentation or create an issue in the repository.
