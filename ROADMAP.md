# SyncHire Product Roadmap

> **Current Status:** MVP Complete - Open Beta
> **Last Updated:** December 2024

---

## MVP Features (Complete)

### Core Platform
- [x] Monorepo setup (Turborepo + PNPM)
- [x] Next.js 16 with TypeScript
- [x] Python FastAPI agent
- [x] PostgreSQL database (Prisma 7)

### Authentication & Authorization
- [x] Email/password with validation
- [x] Google OAuth
- [x] Email verification (Resend)
- [x] Password reset flow
- [x] Organization management with roles
- [x] Team invitations
- [x] Role-based API access control
- [x] Membership caching (Redis + memory fallback)

### HR Features
- [x] Job posting and management
- [x] AI-generated interview questions
- [x] Applicant dashboard with scoring
- [x] Interview results review
- [x] Accept/reject candidates
- [x] AI usage quota tracking
- [x] Quota usage dashboard

### Candidate Features
- [x] CV upload and AI parsing
- [x] Job discovery with match scores
- [x] Application tracking
- [x] AI video interviews
- [x] Real-time transcription
- [x] Device error feedback (camera/mic)

### AI & Video
- [x] Gemini AI integration (CV parsing, question generation, scoring)
- [x] Stream Video SDK (WebRTC)
- [x] Deepgram STT (transcription)
- [x] Interview evaluation and feedback
- [x] AI-powered candidate matching

### Infrastructure
- [x] Cloud SQL (PostgreSQL)
- [x] GCS file storage
- [x] Firebase App Hosting
- [x] Sentry monitoring
- [x] Rate limiting (Upstash Redis)
- [x] Structured logging with Sentry integration

---

## Phase 1: Hardening (In Progress)

> Goal: Production-ready stability and maintainability

### CI/CD Pipeline
- [x] GitHub Actions workflow for CI (lint, typecheck, test)
- [ ] Automated deployment to Firebase
- [ ] PR preview deployments
- [ ] Database migration safety checks

### Test Coverage
- [ ] Unit tests for auth-middleware.ts (security-critical)
- [ ] Unit tests for membership-cache.ts (security-critical)
- [ ] Cross-organization access prevention tests
- [ ] API route input validation tests
- [ ] E2E tests for critical user flows

### Error Handling
- [ ] Redis failure graceful degradation with metrics
- [ ] React Query hooks use handleResponseError consistently
- [ ] All mutations have onError handlers with user feedback
- [ ] Background task failure visibility for HR users

### Code Quality
- [x] Theme-aware colors in settings/quota components
- [ ] Theme-aware colors throughout codebase (50+ instances remaining)
- [x] Logger abstraction used consistently (no console.*)
- [ ] Type design improvements (AuthResult discriminated union)

---

## Phase 2: User Experience

> Goal: Better communication and engagement

### Email Notifications
- [ ] Interview scheduled notification
- [ ] Interview completed notification
- [ ] Application status updates (accepted/rejected)
- [ ] Quota warning notifications
- [ ] Weekly digest for HR (new applicants, pending interviews)

### Analytics Dashboard (HR)
- [ ] Interview completion rates
- [ ] Average scores by job
- [ ] Time-to-hire metrics
- [ ] Source tracking (where candidates come from)
- [ ] AI usage trends

### Candidate Experience
- [ ] Interview preparation tips
- [ ] Practice mode before real interview
- [ ] Feedback visibility after interview
- [ ] Application timeline view

---

## Phase 3: Scale & Efficiency

> Goal: Handle more users, reduce manual work

### Bulk Operations
- [ ] Bulk invite candidates
- [ ] Bulk status updates
- [ ] Bulk export (CSV/PDF)
- [ ] Bulk archive jobs

### Advanced Search & Filters
- [ ] Full-text search across candidates
- [ ] Filter by skills, experience, score
- [ ] Saved search queries
- [ ] Smart candidate recommendations

### Custom Templates
- [ ] Custom interview question templates
- [ ] Custom evaluation criteria
- [ ] Custom email templates
- [ ] Custom scoring rubrics

---

## Phase 4: Integrations

> Goal: Fit into existing workflows

### API & Webhooks
- [ ] Public REST API
- [ ] Webhook events (application, interview, status change)
- [ ] API key management
- [ ] Rate limiting per API key

### ATS Integrations
- [ ] Greenhouse integration
- [ ] Lever integration
- [ ] Workday integration
- [ ] Generic webhook for custom ATS

### Calendar Integrations
- [ ] Google Calendar sync
- [ ] Outlook Calendar sync
- [ ] Automatic scheduling suggestions

---

## Third-Party Services

| Service | Purpose | Status |
|---------|---------|--------|
| Cloud SQL | Database | Active |
| Cloud Storage | File uploads | Active |
| Firebase Hosting | Web deployment | Active |
| Google OAuth | Authentication | Active |
| Sentry | Error monitoring | Active |
| Stream Video | WebRTC calls | Active |
| Deepgram | Transcription | Active |
| Upstash Redis | Rate limiting + caching | Active |
| Resend | Email delivery | Active |
| Google Gemini | AI/ML | Active |

---

## Development Commands

```bash
# Development
pnpm dev          # Start all services
pnpm build        # Build all workspaces
pnpm typecheck    # Type check
pnpm lint         # Lint all workspaces
pnpm db:generate  # Regenerate Prisma client

# Testing (apps/web)
pnpm test         # Run Vitest in watch mode
pnpm test:run     # Run tests once
pnpm test:e2e     # Run Playwright E2E tests
```

See `.env.example` files for required environment variables.
