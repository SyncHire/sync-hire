# SyncHire MVP Readiness Plan (3-4 Weeks)

## Executive Summary

**Objective**: Transform SyncHire from demo to production-ready MVP with database, authentication, cloud storage, comprehensive testing, and production-grade monitoring.

**Current State**:
- AI-powered video interview platform (Next.js 16 + Python FastAPI + Gemini AI)
- PostgreSQL database with Prisma 7 ORM ✅
- GCP Cloud Storage for files ✅
- Better Auth with organization support ✅
- Sentry monitoring configured ✅
- Zero test coverage

**Target State**: Production MVP with:
- PostgreSQL database (Prisma ORM on GCP Cloud SQL) ✅
- Better Auth authentication (Google OAuth + Email) ✅
- GCP Cloud Storage for files ✅
- Firebase App Hosting for deployment
- 350+ tests (75% coverage)
- Structured logging + Sentry monitoring
- Rate limiting + caching
- Production deployment ready

**Timeline**: 3-4 weeks (balanced approach)

---

## Progress Tracking

| Week | Phase | Status | Notes |
|------|-------|--------|-------|
| Week 1 | Security + Database Foundation | **COMPLETE** | Prisma 7 + PostgreSQL + Sentry |
| Week 2 | Authentication + Testing | **COMPLETE** | Better Auth + Organization support |
| Week 3 | Cloud Storage + Core Testing | **COMPLETE** | GCP Cloud Storage implementation |
| Week 4 | Production Hardening | **IN PROGRESS** | Email verification, testing |

### Completed Items
- [x] Prisma 7 schema with all MVP models (User, Job, CVUpload, CandidateApplication, Interview, etc.)
- [x] Database storage implementation (`DatabaseStorage` class)
- [x] Storage factory pattern for switching between file/database storage
- [x] Sentry error monitoring configuration
- [x] Python agent deployment setup
- [x] GCP Cloud Storage integration for CV and JD file uploads
- [x] Better Auth implementation with Prisma adapter
- [x] Google OAuth authentication
- [x] Email/password authentication with verification flow
- [x] Organization plugin with custom roles (owner, admin, recruiter, hiring_manager, viewer)
- [x] Auth pages: login, signup, verify-email, forgot-password, reset-password, select-organization
- [x] Route protection via proxy.ts + page-level validation
- [x] Session management with cookie caching
- [x] Storage layer using authenticated user (replaced hardcoded demo-user)
- [x] `getOrCreateApplication()` for new users applying to jobs
- [x] Centralized storage configuration

### In Progress
- [ ] Email sending integration (Resend/SendGrid) for verification emails
- [ ] Unit and integration tests
- [ ] E2E tests with Playwright

### Pending
- [ ] Rate limiting with Upstash Redis
- [ ] Production deployment to Firebase App Hosting

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

#### 4. Database Setup

**Development (Local PostgreSQL)**:
```bash
# Option 1: Docker
docker run --name synchire-postgres \
  -e POSTGRES_PASSWORD=synchire \
  -e POSTGRES_DB=synchire \
  -p 5432:5432 \
  -d postgres:16

# Option 2: Local PostgreSQL installation
# Install via Homebrew (macOS): brew install postgresql@16
# Or use existing PostgreSQL installation
```

**Environment Variables**: See `apps/web/.env.example` for database configuration.

**Prisma Commands**:
```bash
# Development
pnpm prisma db push          # Push schema to local DB
pnpm prisma studio           # Open Prisma Studio UI
pnpm data:migrate            # Migrate JSON to local DB

# Production
pnpm prisma migrate deploy   # Run migrations on Cloud SQL
```

---

## Week 2: Authentication + Testing Infrastructure ✅ COMPLETE

### Phase 2A: Better Auth Implementation (Days 1-3) ✅

#### 1. Auth Configuration ✅
**Created Files**:
- `/apps/web/src/lib/auth.ts` - Better Auth config with Prisma adapter + organization plugin
- `/apps/web/src/lib/auth-client.ts` - Type-safe client hooks
- `/apps/web/src/lib/auth-server.ts` - Server-side session helpers
- `/apps/web/src/app/api/auth/[...all]/route.ts` - Auth API handlers
- `/apps/web/src/proxy.ts` - Route protection (Next.js 16 middleware)

**Auth Helper Functions**:
- `getServerSession()` - Get session with cookie caching
- `getValidatedSession()` - Get session with forced DB validation
- `requireAuth()` - Require authenticated session
- `requireOrgMembership()` - Require active organization

#### 2. Organization Support ✅
**Custom Roles Implemented**:
- `owner` - Full permissions
- `admin` - Org management + all job/member operations
- `recruiter` - Job management + member read
- `hiring_manager` - Job read + candidate management
- `viewer` - Read-only access

#### 3. Auth Pages Created ✅
- `/apps/web/src/app/(auth)/login/page.tsx` - Email/password + Google OAuth
- `/apps/web/src/app/(auth)/signup/page.tsx` - Registration with password strength
- `/apps/web/src/app/(auth)/verify-email/page.tsx` - Email verification handling
- `/apps/web/src/app/(auth)/forgot-password/page.tsx` - Password reset request
- `/apps/web/src/app/(auth)/reset-password/page.tsx` - Password reset form
- `/apps/web/src/app/(auth)/select-organization/page.tsx` - Organization selection

**Environment Variables**: See `apps/web/.env.example` for Better Auth and Google OAuth configuration.

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

## Week 3: Cloud Storage + Core Testing ✅ COMPLETE

### Phase 3A: GCP Cloud Storage (Days 1-2) ✅

#### 1. GCP Cloud Storage Setup ✅
**Created Files**:
- `/apps/web/src/lib/storage/gcs-client.ts` - GCP Storage client singleton
- `/apps/web/src/lib/storage/cloud/cloud-storage-provider.ts` - Provider interface
- `/apps/web/src/lib/storage/cloud/gcs-storage-provider.ts` - GCS implementation
- `/apps/web/src/lib/storage/cloud/local-storage-provider.ts` - Local dev implementation
- `/apps/web/src/lib/storage/cloud/storage-provider-factory.ts` - Factory pattern
- `/apps/web/src/lib/storage/storage-config.ts` - Centralized configuration

**Architecture**:
- Single bucket with path prefixes: `cv/`, `jd/`
- Files stored privately with signed URLs for time-limited access
- Local filesystem fallback for development

**Environment Variables**: See `apps/web/.env.example` for GCS configuration.

#### 2. Storage Provider Pattern ✅
```typescript
// CloudStorageProvider interface
interface CloudStorageProvider {
  uploadCV(hash: string, buffer: Buffer): Promise<string>;
  uploadJobDescription(hash: string, buffer: Buffer): Promise<string>;
  getSignedUrl(type: 'cv' | 'jd', path: string): Promise<string>;
  deleteCV(hash: string): Promise<void>;
  deleteJobDescription(hash: string): Promise<void>;
  cvExists(hash: string): Promise<boolean>;
  jobDescriptionExists(hash: string): Promise<boolean>;
}
```

#### 3. Processor Integration ✅
- `CVProcessor` - Handles CV upload + extraction with caching
- `JDProcessor` - Handles JD upload + extraction with caching
- Both use `CloudStorageProvider` for file operations
- Both use `StorageInterface` for metadata storage

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

#### 2. Error Monitoring (Sentry) ✅ CONFIGURED
Sentry is already configured. See `apps/web/.env.example` for Sentry configuration.

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

## Environment Variables

See `apps/web/.env.example` for the complete list of environment variables with documentation.

---

## Critical Files by Priority

### Week 1 ✅ COMPLETE
1. ✅ `/packages/database/prisma/schema.prisma` - Database schema (all models)
2. ✅ `/apps/web/src/lib/storage/database-storage.ts` - Storage implementation
3. ✅ `/apps/web/src/lib/logo-utils.ts` - Environment variable for API key

### Week 2 ✅ COMPLETE
4. ✅ `/apps/web/src/lib/auth.ts` - Better Auth config with organization plugin
5. ✅ `/apps/web/src/lib/auth-client.ts` - Type-safe client hooks
6. ✅ `/apps/web/src/lib/auth-server.ts` - Server-side session helpers
7. ✅ `/apps/web/src/proxy.ts` - Route protection middleware
8. ✅ `/apps/web/src/app/(auth)/*.tsx` - Auth pages (login, signup, verify-email, etc.)

### Week 3 ✅ COMPLETE
9. ✅ `/apps/web/src/lib/storage/gcs-client.ts` - GCP Storage client
10. ✅ `/apps/web/src/lib/storage/cloud/gcs-storage-provider.ts` - GCS implementation
11. ✅ `/apps/web/src/lib/storage/cloud/local-storage-provider.ts` - Local dev fallback
12. ✅ `/apps/web/src/lib/storage/storage-config.ts` - Centralized config

### Week 4 (In Progress)
13. `/apps/web/src/lib/backend/cv-processor.test.ts` - Critical unit tests
14. `/apps/web/src/app/api/cv/extract/route.test.ts` - Integration tests
15. `/apps/web/src/lib/rate-limit/rate-limiter.ts` - Rate limiting
16. `/apps/web/e2e/*.spec.ts` - E2E tests

---

## Success Metrics

### Week 1 Checkpoint ✅ COMPLETE
- ✅ Zero hardcoded secrets in code
- ✅ Database schema defined + migrated (Prisma 7)
- ✅ Database storage fully functional
- ✅ Sentry monitoring configured

### Week 2 Checkpoint ✅ COMPLETE
- ✅ Better Auth working (Google OAuth + Email/Password)
- ✅ Organization plugin with custom roles
- ✅ Auth pages created (login, signup, verify-email, etc.)
- ✅ Route protection via proxy.ts + page-level validation
- ⏳ CI/CD pipeline (pending)

### Week 3 Checkpoint ✅ COMPLETE
- ✅ GCP Cloud Storage integration
- ✅ Local storage fallback for development
- ✅ Storage provider pattern implemented
- ✅ CV and JD processors using cloud storage
- ⏳ Unit tests (pending)

### Week 4 Checkpoint (IN PROGRESS)
- ⏳ Email sending for verification (Resend/SendGrid)
- ⏳ Unit and integration tests
- ⏳ E2E tests with Playwright
- ⏳ Rate limiting with Upstash Redis
- ⏳ Production deployment to Firebase App Hosting

---

## Third-Party Services Required

### Week 1 (Development)
- **Local PostgreSQL**: Free (Docker or local install)
- **GCP Project**: Setup only (no charges during development)

### Week 2
- **Google OAuth**: Free (setup in Google Cloud Console)
- **Firebase Hosting**: Free tier (10GB storage, 360MB/day transfer)

### Week 3
- **GCP Cloud Storage**: $0.02/GB/month (~$1-5/mo for MVP)
- **Upstash Redis**: Free tier → $10/mo

### Week 4
- **Sentry**: Developer plan ($29/mo)
- **Better Stack**: Startup plan ($29/mo) - Optional

**Development Costs**: ~$0-40/mo
- Local PostgreSQL: Free
- GCP Cloud Storage (dev): ~$0-1/mo
- Firebase Hosting (dev): Free
- Upstash Redis: Free tier
- Sentry (optional during dev): Free tier or $29/mo

**Production Costs** (with ~$2k GCP credits): ~$0-40/mo until credits expire
- GCP Cloud SQL: ~$10-25/mo (covered by credits)
- GCP Cloud Storage: $1-5/mo (covered by credits)
- Firebase Hosting: Free tier
- Upstash Redis: $0-10/mo
- Sentry: $29/mo
- Better Stack (optional): $29/mo

**Post-Credits Production**: ~$50-80/mo

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

---

## Firebase Hosting Deployment

### Setup (Week 2-3)

#### 1. Firebase CLI Installation
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

#### 2. Firebase Configuration
**Create**: `firebase.json`
```json
{
  "hosting": {
    "public": "apps/web/out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

#### 3. Next.js Static Export Configuration
**Update**: `/apps/web/next.config.ts`
```typescript
const nextConfig = {
  output: 'export', // Enable static export for Firebase
  images: {
    unoptimized: true, // Firebase doesn't support Next.js Image Optimization
  },
  // ... other config
};
```

#### 4. Build & Deploy Scripts
**Update**: `/apps/web/package.json`
```json
{
  "scripts": {
    "build": "next build",
    "export": "next export",
    "deploy": "pnpm build && firebase deploy --only hosting"
  }
}
```

#### 5. Deployment
```bash
# Build Next.js app
cd apps/web
pnpm build

# Deploy to Firebase
firebase deploy --only hosting
```

### Environment Variables in Firebase
Use Firebase App Hosting secrets or GitHub Actions secrets. See `apps/web/.env.example` for the complete list.

### CI/CD with GitHub Actions
**Create**: `.github/workflows/deploy.yml`
```yaml
name: Deploy to Firebase

on:
  push:
    branches: [master, main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build Next.js app
        run: cd apps/web && pnpm build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

---

## Post-MVP (Future Enhancements)

### Month 2
- Advanced analytics dashboard
- Email notifications (SendGrid)
- Bulk candidate operations
- Video recording storage
- Firebase Functions for serverless API routes

### Month 3
- Payment integration (Stripe)
- Multi-tenancy support
- Advanced AI features
- Mobile responsive improvements
- Cloud Run for Python agent

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
