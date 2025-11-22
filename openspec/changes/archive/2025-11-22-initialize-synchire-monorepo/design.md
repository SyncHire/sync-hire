# Design Document: SyncHire Initial Setup

**Change ID:** `initialize-synchire-monorepo`
**Last Updated:** 2025-01-08

## Architecture Overview

SyncHire uses a hybrid architecture combining Next.js (frontend + API) with a Python microservice (real-time AI agent), managed as a Turborepo monorepo.

```
┌─────────────────────────────────────────────────────────────┐
│                        MONOREPO ROOT                        │
│  Turborepo + PNPM Workspaces                               │
└──────────────────┬──────────────────┬───────────────────────┘
                   │                  │
        ┌──────────▼──────────┐  ┌───▼────────────┐
        │   apps/web/         │  │  apps/agent/   │
        │   (Next.js 15.1)    │  │  (Python 3.11) │
        └──────────┬──────────┘  └───┬────────────┘
                   │                  │
     ┌─────────────┼──────────────────┼─────────────┐
     │             │                  │             │
┌────▼────┐   ┌───▼───┐         ┌───▼───┐    ┌────▼─────┐
│ NextAuth│   │Prisma │         │Vision │    │ Firebase │
│  v5     │   │  ORM  │         │Agents │    │ Storage  │
└─────────┘   └───┬───┘         └───────┘    └──────────┘
                  │
            ┌─────▼──────┐
            │  Cloud SQL │
            │ PostgreSQL │
            └────────────┘
```

## Key Architectural Decisions

### 1. Monorepo Management: Turborepo

**Decision:** Use Turborepo with PNPM workspaces

**Rationale:**
- **Caching**: Turborepo caches build outputs, dramatically speeding up subsequent builds
- **Task Orchestration**: Single `turbo dev` command runs both Next.js and Python servers
- **Dependency Management**: PNPM workspaces efficiently handle shared packages
- **Scalability**: Easy to add more apps/packages as project grows

**Alternatives Considered:**
- **Simple folders**: Too manual, no caching, slower builds
- **Nx**: More complex, overkill for our needs
- **Lerna**: Outdated, Turborepo is modern successor

**Trade-offs:**
- ✅ **Pro**: Fast builds, great DX, scalable
- ❌ **Con**: Learning curve, requires PNPM knowledge

### 2. Authentication: NextAuth.js v5 (over Firebase Auth)

**Decision:** Use NextAuth.js v5 with Prisma adapter

**Rationale:**
- **Single Database**: All user data in PostgreSQL (no Firebase + Prisma sync complexity)
- **Prisma Integration**: Official `@auth/prisma-adapter` works seamlessly
- **Flexibility**: Easy to add custom fields (role, employer/candidate-specific data)
- **Developer Experience**: Cleaner code with single `auth()` function
- **Cost**: Completely free (vs Firebase's eventual usage costs)
- **Type Safety**: Excellent TypeScript support

**Alternatives Considered:**
- **Firebase Authentication**: Google product (good for hackathon branding), but requires dual database (Firebase + PostgreSQL)

**Trade-offs:**
- ✅ **Pro**: Simpler architecture, faster setup, better Prisma integration
- ❌ **Con**: Less "GCP native" than Firebase Auth
- **Mitigation**: Still showcase GCP via Cloud SQL, Firebase Storage, Gemini AI, Google OAuth

**Implementation Details:**
- JWT session strategy for stateless auth
- Prisma adapter creates tables: User, Account, Session, VerificationToken
- Google OAuth provider for social login
- Credentials provider for email/password with bcrypt

### 3. Database: Cloud SQL for PostgreSQL + Prisma

**Decision:** Use Cloud SQL for PostgreSQL (not Firestore) with Prisma ORM

**Rationale:**
- **Relational Data**: Job requirements naturally form relational graph (Jobs → Questions, Applications → Interviews)
- **Type Safety**: Prisma generates TypeScript types from schema
- **Complex Queries**: Need joins, aggregations (e.g., "get all interviews for applications on my jobs")
- **Transactions**: Ensure data consistency (e.g., create application + personalize questions atomically)
- **Familiar**: SQL is well-understood, easier to debug than NoSQL

**Alternatives Considered:**
- **Firestore**: Google's NoSQL database, but harder for complex queries and transactions
- **Supabase**: Excellent PostgreSQL hosting, but not native GCP (hackathon requirement)

**Trade-offs:**
- ✅ **Pro**: Type-safe queries, complex joins, transactions, migrations
- ❌ **Con**: Slightly higher latency than Firestore (acceptable for our use case)

**Schema Design Principles:**
- Soft deletes (status fields instead of hard deletes)
- Timestamps on all tables (createdAt, updatedAt)
- Foreign keys with cascade deletes where appropriate
- Indexes on frequently queried columns (userId, jobId, applicationId)

### 4. File Storage: Firebase Cloud Storage

**Decision:** Use Firebase Cloud Storage for CV uploads and interview recordings

**Rationale:**
- **GCP Native**: Part of Google Cloud Platform
- **Signed URLs**: Secure direct uploads from client to storage
- **CDN**: Global delivery for video playback
- **Simple API**: Firebase Admin SDK is straightforward
- **Cost-Effective**: Pay only for storage + bandwidth

**Alternatives Considered:**
- **Cloud Storage directly**: More configuration, Firebase wrapper is simpler
- **Supabase Storage**: Not GCP-native

**Trade-offs:**
- ✅ **Pro**: Simple, secure, GCP-native, good for large files
- ❌ **Con**: Another service to configure (but minimal complexity)

**Implementation Approach:**
- Store only file references (URLs) in PostgreSQL
- Generate signed URLs for secure uploads
- Separate buckets for CVs and recordings

### 5. Frontend: Next.js 15.1 + React 19 + Tailwind v4

**Decision:** Use latest stable versions of Next.js, React, and Tailwind

**Rationale:**
- **Next.js 15.1**: Latest stable, full React 19 support, Turbopack stable
- **React 19**: Latest stable, improved performance, better hooks
- **Tailwind v4**: 5x faster builds (Rust rewrite), CSS-first config, zero config

**Alternatives Considered:**
- **Tailwind v3**: More stable ecosystem, but slower builds
- **Older Next.js/React**: More stable, but missing latest features

**Trade-offs:**
- ✅ **Pro**: Latest features, fastest builds, future-proof
- ❌ **Con**: Potential breaking changes, some Shadcn components may need updates
- **Mitigation**: Pin versions, test thoroughly, use Tailwind v4 features carefully

**Breaking Changes to Handle:**
- Next.js 15: `cookies()` and `headers()` are now async
- Next.js 15: Caching defaults changed (opt-in instead of opt-out)
- React 19: `forwardRef` removed (Shadcn already updated)

### 6. Python Agent: Vision-Agents with uv

**Decision:** Use Vision-Agents framework with uv package manager

**Rationale:**
- **Time Savings**: Vision-Agents saves 44-65 hours of development (built-in STT/TTS/LLM pipeline)
- **Real-time**: Designed for real-time AI conversations
- **uv Speed**: 10-100x faster than pip for package installation
- **Minimal Code**: ~100 lines of Python vs 1000+ for manual implementation

**Alternatives Considered:**
- **Manual Implementation**: Full control, but 44-65 hours of work
- **pip**: Standard, but much slower than uv

**Trade-offs:**
- ✅ **Pro**: Massive time savings, proven framework, fast installs
- ❌ **Con**: Framework dependency, team has limited Python experience
- **Mitigation**: Minimal Python code (<200 lines), Markdown-based configuration, AI-assisted development

**Package Manager: uv**
- 10-100x faster than pip
- Global cache reduces disk usage
- Better dependency resolution
- Drop-in replacement for pip

### 7. AI Models: Gemini 2.5 Flash + OpenAI gpt-realtime

**Decision:** Use Gemini 2.5 Flash for async tasks, OpenAI gpt-realtime for real-time interviews

**Rationale:**
- **Gemini 2.5 Flash**: Cost-effective ($0.30/1M tokens), fast, good quality for question generation and CV analysis
- **OpenAI gpt-realtime**: Best-in-class for real-time conversation, lowest latency

**Alternatives Considered:**
- **Claude 3.5 Sonnet**: Excellent for CV vision analysis, but more expensive
- **Gemini Live**: Could replace OpenAI, but lower conversation quality
- **GPT-4o**: More capable but more expensive than Gemini for async tasks

**Trade-offs:**
- ✅ **Pro**: Optimal cost/performance for each use case
- ❌ **Con**: Multi-provider complexity
- **Mitigation**: Clear separation (Gemini = async, OpenAI = real-time)

**Model Selection:**
| Task | Model | Cost | Latency |
|------|-------|------|---------|
| Question Generation | Gemini 2.5 Flash | $0.30/1M | 30-60s |
| CV Analysis | Gemini 2.5 Flash | $0.30/1M | 20-30s |
| Interview Summary | Gemini 2.5 Flash | $0.30/1M | 30s |
| Real-time Interview | OpenAI gpt-realtime | $32/1M audio | <2s |

### 8. Development Environment: Docker Compose

**Decision:** Use Docker Compose for local development

**Rationale:**
- **Consistency**: Same environment for all developers
- **Simplicity**: Single `docker-compose up` command
- **Isolation**: Services run in containers (no global installs)
- **Production Parity**: Local setup mirrors production architecture

**Alternatives Considered:**
- **Manual Setup**: Each developer installs PostgreSQL, Python, Node.js manually (error-prone)
- **Kubernetes**: Overkill for local development

**Trade-offs:**
- ✅ **Pro**: Consistent, easy setup, production-like
- ❌ **Con**: Requires Docker Desktop, slower startup than native
- **Mitigation**: Volume mounts for hot-reload, minimal performance impact

**Services:**
- `web`: Next.js dev server (port 3000)
- `agent`: Python agent (port 8080)
- `postgres`: PostgreSQL 16 (port 5432)

## Data Flow

### Authentication Flow

```
1. User clicks "Sign in with Google"
   ↓
2. NextAuth.js redirects to Google OAuth
   ↓
3. Google authenticates user
   ↓
4. Callback to /api/auth/callback/google
   ↓
5. NextAuth.js creates/updates user in PostgreSQL (via Prisma)
   ↓
6. NextAuth.js creates session (JWT stored in HTTP-only cookie)
   ↓
7. User redirected to /dashboard
```

### File Upload Flow

```
1. User selects CV file
   ↓
2. Client requests signed upload URL from Next.js API
   POST /api/upload/request-url { filename, contentType }
   ↓
3. Next.js generates signed URL via Firebase Admin SDK
   ↓
4. Client uploads directly to Firebase Cloud Storage using signed URL
   ↓
5. Client notifies Next.js of successful upload
   POST /api/applications { cvUrl }
   ↓
6. Next.js stores file reference in PostgreSQL
```

### AI Interview Flow

```
1. HR approves application
   ↓
2. Next.js creates Stream call and invites Python agent
   POST {PYTHON_URL}/join-interview
   ↓
3. Python agent joins Stream call via Vision-Agents
   ↓
4. Candidate joins call via Next.js frontend
   ↓
5. Real-time conversation (STT → LLM → TTS)
   ↓
6. Interview ends, Python agent sends webhook to Next.js
   POST /api/webhooks/interview-complete { transcript, duration }
   ↓
7. Next.js generates summary via Gemini 2.5 Flash
   ↓
8. Results stored in PostgreSQL
```

## Security Considerations

### Authentication
- JWT tokens in HTTP-only cookies (prevents XSS)
- Secure flag enabled in production (HTTPS only)
- SameSite=lax (CSRF protection)
- Token rotation on refresh

### Database
- Prepared statements via Prisma (SQL injection prevention)
- Row-level security can be added later
- Environment variables for connection strings
- No direct database exposure to internet

### File Storage
- Signed URLs with expiration (1 hour for uploads, 24 hours for downloads)
- Content-Type validation
- File size limits (5MB for CVs, 500MB for recordings)
- Separate buckets for different file types

### API Routes
- Middleware authentication checks
- Role-based access control
- Rate limiting (future: add Upstash Redis)
- Input validation with Zod

## Performance Considerations

### Build Performance
- **Turborepo Caching**: Build outputs cached, rebuilds only changed packages
- **Tailwind v4**: 5x faster than v3 (Rust rewrite)
- **PNPM**: Faster installs than npm/yarn via hardlinks

### Runtime Performance
- **Next.js 15**: Turbopack dev server (faster than Webpack)
- **Server Components**: Render on server, reduce client bundle
- **Database**: Connection pooling via Prisma (10 connections max)
- **CDN**: Static assets served from Vercel Edge Network

### Scalability Targets
- **Concurrent Interviews**: 100+ (Cloud Run auto-scaling)
- **Database Queries**: <100ms (indexes on frequently queried columns)
- **API Response Time**: <500ms (serverless edge functions)

## Testing Strategy

### Unit Tests
- Jest + React Testing Library for components
- Vitest for utility functions
- pytest for Python agent
- 80% coverage target for business logic

### Integration Tests
- Playwright for E2E tests
- Test critical flows: auth, job creation, interview
- Run in CI on every PR

### Database Tests
- Use test database (separate from dev)
- Prisma seed for consistent test data
- Clean up after each test

## Deployment Strategy (Future)

While not part of this initial setup, here's the planned deployment:

- **Next.js**: Vercel (automatic deployments on git push)
- **Python Agent**: Google Cloud Run (Docker container)
- **Database**: Cloud SQL for PostgreSQL (managed service)
- **Storage**: Firebase Cloud Storage (managed service)
- **Monitoring**: Sentry for errors, Vercel Analytics for metrics

## Open Design Questions

None - all architectural decisions have been finalized through user collaboration.

## Future Enhancements (Out of Scope)

- Email verification flow (requires email service)
- Multi-factor authentication (future security enhancement)
- Redis caching layer (for performance optimization)
- Background job queue (for async processing)
- Monitoring and alerting (Sentry, Datadog)
- CI/CD pipelines (GitHub Actions)
- Production deployment scripts
- Mobile applications (React Native with same backend)

## References

- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [NextAuth.js v5 Documentation](https://authjs.dev/getting-started/migrating-to-v5)
- [Tailwind v4 Documentation](https://tailwindcss.com/docs)
- [Turborepo Handbook](https://turbo.build/repo/docs/handbook)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Vision-Agents GitHub](https://github.com/GetStream/Vision-Agents)
- [uv Documentation](https://github.com/astral-sh/uv)
