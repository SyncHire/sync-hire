# SyncHire MVP Readiness Plan (3-4 Weeks)

## Executive Summary

**Objective**: Transform SyncHire from demo to production-ready MVP with database, authentication, cloud storage, comprehensive testing, and production-grade monitoring.

**Current State**:
- AI-powered video interview platform (Next.js 16 + Python FastAPI + Gemini AI)
- File-based JSON storage in `/data` directory
- No authentication (hardcoded demo users)
- Zero test coverage
- 100+ console.log statements
- Hardcoded API key in source code

**Target State**: Production MVP with:
- PostgreSQL database (Prisma ORM)
- NextAuth.js authentication (Google OAuth + Email)
- Supabase cloud storage for files
- 350+ tests (75% coverage)
- Structured logging + Sentry monitoring
- Rate limiting + caching
- Production deployment ready

**Timeline**: 3-4 weeks (balanced approach)

---

## Week 1: Critical Security Fixes + Database Foundation

### Phase 1A: Immediate Security Fixes (Days 1-2)

#### 1. Remove Hardcoded API Key
**File**: `/apps/web/src/lib/logo-utils.ts`
- Remove hardcoded key on line 7: `pk_FgUgq-__SdOal0JNAYVqJQ`
- Use `process.env.NEXT_PUBLIC_LOGO_DEV_KEY` only
- Add validation with warning if missing

**File**: `/apps/web/.env.example`
- Add all required environment variables

#### 2. Webhook Security
**File**: `/apps/web/src/app/api/webhooks/interview-complete/route.ts`
- Implement HMAC signature verification
- Create `/apps/web/src/lib/webhook-verification.ts` helper

#### 3. Input Validation
**Create**: `/apps/web/src/lib/validators/api-schemas.ts`
- Zod schemas for all API request bodies
- Apply to all 20+ API routes

**Priority Routes**:
- `/apps/web/src/app/api/jobs/apply/route.ts`
- `/apps/web/src/app/api/jobs/create/route.ts`
- `/apps/web/src/app/api/cv/extract/route.ts`
- `/apps/web/src/app/api/start-interview/route.ts`

### Phase 1B: Database Migration (Days 3-5)

#### 1. Prisma Setup
**Create Files**:
- `/apps/web/prisma/schema.prisma` - Full schema with 11 models:
  - User, Account, Session, VerificationToken (NextAuth)
  - CVUpload, Job, JobQuestion
  - CandidateApplication, Interview
  - Notification, InterviewCall (replaces in-memory Map)

**Add Dependencies** (`/apps/web/package.json`):
```json
{
  "dependencies": {
    "prisma": "^6.2.0",
    "@prisma/client": "^6.2.0"
  }
}
```

#### 2. Database Storage Implementation
**Create Files**:
- `/apps/web/src/lib/prisma.ts` - Prisma client singleton
- `/apps/web/src/lib/storage/database-storage.ts` - Implements `StorageInterface`

**Update**: `/apps/web/src/lib/storage/storage-factory.ts`
- Switch to `DatabaseStorage` when `USE_DATABASE=true`

#### 3. Migration Script
**Create**: `/apps/web/scripts/migrate-data.ts`
- Migrate JSON files from `/data` to PostgreSQL
- Preserve all existing data

**Environment Variables**:
```bash
DATABASE_URL="postgresql://..."
USE_DATABASE=true
```

---

## Week 2: Authentication + Testing Infrastructure

### Phase 2A: NextAuth.js Implementation (Days 1-3)

#### 1. Auth Configuration
**Create Files**:
- `/apps/web/src/lib/auth.ts` - NextAuth config with Google + Credentials providers
- `/apps/web/src/app/api/auth/[...nextauth]/route.ts` - Auth handlers
- `/apps/web/src/middleware.ts` - Page protection middleware
- `/apps/web/src/lib/api-auth.ts` - API route auth helpers

**Auth Middleware Functions**:
- `requireAuth(req)` - Verify session exists
- `requireRole(req, 'EMPLOYER' | 'CANDIDATE')` - Role-based access

#### 2. Protect All API Routes
**Update 24 Routes** with auth checks:

**Employer-only**:
- `/apps/web/src/app/api/jobs/create/route.ts`
- `/apps/web/src/app/api/jobs/[id]/route.ts` (PUT/DELETE)
- `/apps/web/src/app/api/jobs/[id]/applicants/route.ts`
- `/apps/web/src/app/api/jobs/[id]/match-candidates/route.ts`

**Candidate-only**:
- `/apps/web/src/app/api/cv/extract/route.ts`
- `/apps/web/src/app/api/jobs/apply/route.ts`
- `/apps/web/src/app/api/start-interview/route.ts`

**Environment Variables**:
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-random-32-chars"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### Phase 2B: Testing Infrastructure (Days 4-5)

#### 1. Framework Setup
**TypeScript - Vitest** (`/apps/web/package.json`):
```json
{
  "devDependencies": {
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "@testing-library/react": "^16.1.0",
    "msw": "^2.7.0",
    "happy-dom": "^15.11.7"
  }
}
```

**Python - pytest** (`/apps/agent/pyproject.toml`):
```toml
[project.optional-dependencies]
test = ["pytest>=8.3.0", "pytest-asyncio>=0.24.0", "pytest-cov>=6.0.0"]
```

**E2E - Playwright** (`/apps/web/package.json`):
```json
{
  "devDependencies": {
    "@playwright/test": "^1.49.0"
  }
}
```

#### 2. Configuration Files
**Create**:
- `/apps/web/vitest.config.ts`
- `/apps/web/src/test/setup.ts` - Global mocks
- `/apps/web/src/test/helpers.ts` - Test utilities
- `/apps/web/src/test/fixtures/` - Sample data
- `/apps/agent/pytest.ini`
- `/apps/agent/conftest.py`
- `/apps/web/playwright.config.ts`

#### 3. CI/CD Pipeline
**Create**: `.github/workflows/test.yml`
- Run unit tests (web + agent)
- Run integration tests
- Run E2E tests
- Upload coverage to Codecov

---

## Week 3: Cloud Storage + Core Testing

### Phase 3A: Supabase Storage (Days 1-2)

#### 1. Supabase Setup
**Create Files**:
- `/apps/web/src/lib/cloud-storage/storage-client.ts` - Supabase wrapper
- `/apps/web/src/lib/cloud-storage/upload-handler.ts` - Upload utilities

**Buckets to Create**:
- `cvs` (private) - CV PDFs
- `job-descriptions` (private) - JD uploads
- `interview-recordings` (private) - Interview transcripts

**Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

#### 2. Update Upload Routes
**Files to Modify**:
- `/apps/web/src/app/api/cv/extract/route.ts` - Upload to Supabase, store URL in DB
- `/apps/web/src/app/api/jobs/extract-jd/route.ts` - Same pattern

#### 3. File Migration Script
**Create**: `/apps/web/scripts/migrate-files-to-cloud.ts`
- Upload existing files from `/data/cv-uploads/` and `/data/jd-uploads/` to Supabase

### Phase 3B: Unit + Integration Tests (Days 3-5)

#### 1. Critical Unit Tests (150 tests)
**Priority Files**:
1. `/apps/web/src/lib/backend/cv-processor.test.ts` (25-30 tests)
   - Test all Zod transforms (lines 18-279)
   - Mock Gemini API responses
   - Test error handling for malformed PDFs

2. `/apps/web/src/lib/backend/question-generator.test.ts` (20-25 tests)
   - Test smart question merging logic
   - Test category mapping
   - Mock Gemini question generation

3. `/apps/web/src/lib/backend/jd-processor.test.ts` (20-25 tests)
   - Test PDF/Markdown/Text parsing
   - Test enum validation
   - Test caching logic

4. `/apps/web/src/lib/storage/database-storage.test.ts` (30-35 tests)
   - Test all CRUD operations
   - Use test database

#### 2. API Integration Tests (180 tests)
**Priority Routes**:
1. `/apps/web/src/app/api/cv/extract/route.test.ts` (12-15 tests)
2. `/apps/web/src/app/api/jobs/create/route.test.ts` (15-20 tests)
3. `/apps/web/src/app/api/jobs/[id]/match-candidates/route.test.ts` (12-15 tests)
4. `/apps/web/src/app/api/jobs/apply/route.test.ts` (10-12 tests)
5. `/apps/web/src/app/api/start-interview/route.test.ts` (15-18 tests)

**Mock Strategy**:
- Create `/apps/web/src/test/mocks/gemini.ts` - Mock Gemini AI
- Create `/apps/web/src/test/mocks/stream.ts` - Mock GetStream SDK
- Use MSW for HTTP mocking

#### 3. Python Agent Tests (50-60 tests)
**Files to Create**:
- `/apps/agent/tests/test_config.py` (8-10 tests)
- `/apps/agent/tests/test_main.py` (10-12 tests)
- `/apps/agent/tests/agents/test_agent_manager.py` (15-20 tests)

---

## Week 4: Production Hardening + E2E Tests

### Phase 4A: Logging & Monitoring (Days 1-2)

#### 1. Structured Logging
**Create Files**:
- `/apps/web/src/lib/logger/logger.ts` - Winston/Pino wrapper
- `/apps/web/src/lib/logger/log-levels.ts`
- `/apps/web/src/middleware.ts` (enhance) - Add request ID tracking

**Replace 100+ console.log** in:
- All 20 API route files
- `/apps/web/src/lib/backend/cv-processor.ts`
- `/apps/web/src/lib/backend/question-generator.ts`
- `/apps/web/src/lib/backend/jd-processor.ts`

#### 2. Error Monitoring (Sentry)
**Create Files**:
- `/apps/web/sentry.client.config.ts`
- `/apps/web/sentry.server.config.ts`
- `/apps/web/sentry.edge.config.ts`
- `/apps/web/src/lib/error-tracking.ts`

**Environment Variables**:
```bash
NEXT_PUBLIC_SENTRY_DSN="..."
SENTRY_AUTH_TOKEN="..."
NODE_ENV=production
```

#### 3. Error Handling System
**Create Files**:
- `/apps/web/src/lib/errors/error-codes.ts` - Centralized error codes
- `/apps/web/src/lib/errors/error-messages.ts` - User-friendly messages
- `/apps/web/src/lib/errors/error-handler.ts` - Error utilities

**Standard Error Format**:
```typescript
{
  success: false,
  error: {
    code: "CV_EXTRACT_002",
    message: "Unable to parse CV",
    userMessage: "We couldn't read your CV. Please upload a PDF.",
    requestId: "req_123abc"
  }
}
```

### Phase 4B: Performance Optimization (Day 3)

#### 1. Smart Polling (Replace 2-second intervals)
**Files to Update**:
- `/apps/web/src/lib/hooks/use-job-questions.ts` (lines 38, 73)
  - Exponential backoff: 2s → 4s → 8s → 15s max
- `/apps/web/src/lib/hooks/use-interview.ts` (line 133)
  - Same pattern

#### 2. Rate Limiting (Upstash Redis)
**Create Files**:
- `/apps/web/src/lib/rate-limit/rate-limiter.ts`
- `/apps/web/src/lib/rate-limit/limits.ts`

**Apply to Routes**:
- `/apps/web/src/app/api/cv/extract/route.ts` (10 req/min per user)
- `/apps/web/src/app/api/jobs/extract-jd/route.ts` (10 req/min)
- `/apps/web/src/app/api/jobs/[id]/match-candidates/route.ts` (5 req/hour)

**Environment Variables**:
```bash
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

#### 3. Bundle Optimization
**Update**: `/apps/web/next.config.ts`
```typescript
const nextConfig = {
  reactCompiler: true,
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/*'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  swcMinify: true,
};
```

### Phase 4C: UX Polish (Day 4)

#### 1. Loading States
**Create**: `/apps/web/src/components/ui/skeleton-loader.tsx`
**Update Components**:
- `/apps/web/src/app/candidate/jobs/page.tsx`
- `/apps/web/src/app/hr/jobs/[id]/applicants/page.tsx`

#### 2. Empty & Error States
**Create**:
- `/apps/web/src/components/ui/empty-state.tsx`
- `/apps/web/src/components/ui/error-state.tsx`
- `/apps/web/src/app/error.tsx` - Global error boundary

#### 3. Demo Data Management
**Create**: `/apps/web/src/lib/feature-flags/flags.ts`
**Environment Variables**:
```bash
NEXT_PUBLIC_DEMO_MODE=false  # Disable in production
```

**Update**: `/apps/web/src/lib/mock-data.ts`
- Wrap demo data in feature flag checks

### Phase 4D: E2E Tests (Day 5)

#### 1. Critical User Journeys (8 flows)
**Create Test Files**:
1. `/apps/web/e2e/cv-upload-and-matching.spec.ts` (5-7 tests)
   - Upload CV → Extract → See matched jobs
2. `/apps/web/e2e/job-creation.spec.ts` (6-8 tests)
   - Create job → Extract JD → Auto-match candidates
3. `/apps/web/e2e/application-flow.spec.ts` (5-7 tests)
   - View job → Apply → Generate questions
4. `/apps/web/e2e/interview-flow.spec.ts` (4-6 tests)
   - Start interview → Join call → Complete → Results

#### 2. Test Data Management
**Create**: `/apps/web/e2e/seed-data.ts`
- Pre-generate sample CVs, jobs, applications

---

## Type Safety Improvements (Throughout)

### Eliminate 42 `any` Types
**Primary File**: `/apps/web/src/lib/backend/cv-processor.ts` (25 occurrences)
- Replace `.any()` transforms with proper Zod schemas
- Lines 16-279: Define strict schemas for AI responses

**Also Update**:
- `/apps/web/src/lib/backend/question-generator.ts` (3 occurrences)
- `/apps/web/src/lib/backend/jd-processor.ts` (3 occurrences)

**Create**: `/apps/web/src/lib/types/guards.ts` - Type guards for runtime checks

---

## Environment Variables (Complete List)

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/synchire"
USE_DATABASE=true

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-random-32-chars"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Cloud Storage
NEXT_PUBLIC_SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# AI Services
GEMINI_API_KEY="..."
AGENT_API_URL="http://localhost:8080"

# Video
NEXT_PUBLIC_STREAM_API_KEY="..."
STREAM_API_SECRET="..."

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="..."
SENTRY_AUTH_TOKEN="..."

# Rate Limiting & Cache
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Feature Flags
NEXT_PUBLIC_DEMO_MODE=false
NODE_ENV=production

# Misc
NEXT_PUBLIC_LOGO_DEV_KEY="..."
WEBHOOK_SECRET="generate-random-string"
```

---

## Critical Files by Priority

### Immediate (Week 1)
1. `/apps/web/src/lib/logo-utils.ts` - Remove hardcoded API key (line 7)
2. `/apps/web/prisma/schema.prisma` - Database schema (11 models)
3. `/apps/web/src/lib/storage/database-storage.ts` - Storage implementation
4. `/apps/web/src/app/api/webhooks/interview-complete/route.ts` - Add signature verification

### Week 2
5. `/apps/web/src/lib/auth.ts` - NextAuth config
6. `/apps/web/src/lib/api-auth.ts` - Auth middleware
7. `/apps/web/src/lib/validators/api-schemas.ts` - Input validation
8. `/apps/web/vitest.config.ts` + test files

### Week 3
9. `/apps/web/src/lib/cloud-storage/storage-client.ts` - Supabase integration
10. `/apps/web/src/lib/backend/cv-processor.test.ts` - Critical unit tests
11. `/apps/web/src/app/api/cv/extract/route.test.ts` - Integration tests

### Week 4
12. `/apps/web/src/lib/logger/logger.ts` - Structured logging
13. `/apps/web/sentry.client.config.ts` - Error monitoring
14. `/apps/web/src/lib/rate-limit/rate-limiter.ts` - Rate limiting
15. `/apps/web/e2e/*.spec.ts` - E2E tests

---

## Success Metrics

### Week 1 Checkpoint
- ✅ Zero hardcoded secrets in code
- ✅ Database schema defined + migrated
- ✅ All API inputs validated with Zod
- ✅ Webhook secured with HMAC

### Week 2 Checkpoint
- ✅ Authentication working (Google + Email)
- ✅ All 24 API routes protected with auth
- ✅ 100+ unit tests written (50% coverage)
- ✅ CI/CD pipeline running

### Week 3 Checkpoint
- ✅ Files migrated to Supabase
- ✅ 250+ tests total (75% coverage)
- ✅ Database storage fully functional
- ✅ Python agent tested

### Week 4 Checkpoint (MVP READY)
- ✅ Zero console.log in production
- ✅ All errors tracked in Sentry
- ✅ Rate limiting active
- ✅ 350+ tests (75%+ coverage)
- ✅ E2E tests passing
- ✅ Production deployment successful

---

## Third-Party Services Required

### Week 1
- **PostgreSQL Database**: Supabase (free tier) or Railway ($5/mo)

### Week 2
- **Google OAuth**: Free (setup in Google Cloud Console)

### Week 3
- **Supabase Storage**: Free tier (1GB)
- **Upstash Redis**: Free tier → $10/mo

### Week 4
- **Sentry**: Developer plan ($29/mo)
- **Better Stack**: Startup plan ($29/mo) - Optional

**Total Monthly Cost**: ~$40-70/mo

---

## Risk Mitigation

### High-Risk Areas
1. **Data Loss During Migration**
   - Backup JSON files before migration
   - Test in staging environment first
   - Keep `USE_DATABASE` flag for rollback

2. **Auth Breaking Workflows**
   - Implement incrementally
   - Keep demo mode available
   - Test all user journeys

3. **Test Coverage Taking Too Long**
   - Focus on critical paths first
   - Run tests in parallel in CI
   - Defer E2E tests if needed

### Rollback Strategy
- Feature flags allow instant rollback (`USE_DATABASE=false`)
- Keep file storage code intact for 1 month
- Database backup before each migration

---

## Post-MVP (Future Enhancements)

### Month 2
- Advanced analytics dashboard
- Email notifications (SendGrid)
- Bulk candidate operations
- Video recording storage

### Month 3
- Payment integration (Stripe)
- Multi-tenancy support
- Advanced AI features
- Mobile responsive improvements

---

## Implementation Order Summary

```
Week 1: Security First
├── Day 1-2: Remove secrets, validate inputs, secure webhooks
└── Day 3-5: Database schema + migration + storage implementation

Week 2: Authentication + Testing Foundation
├── Day 1-3: NextAuth setup + protect all routes
└── Day 4-5: Test frameworks + CI/CD + first tests

Week 3: Cloud Storage + Core Testing
├── Day 1-2: Supabase setup + file migration
└── Day 3-5: Unit tests (150) + Integration tests (180)

Week 4: Production Hardening
├── Day 1-2: Logging + Sentry + error system
├── Day 3: Performance (polling, rate limiting, bundling)
├── Day 4: UX polish (loading, empty states, demo mode)
└── Day 5: E2E tests + deployment prep
```

**Total Estimated Work**: 3-4 weeks (1 developer, full-time)

**Key Success Factor**: Incremental deployment with feature flags allows continuous testing in production-like environment while maintaining demo functionality.
