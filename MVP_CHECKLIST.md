# SyncHire MVP Checklist

> **Status:** MVP Complete - Open Beta Live
> **Last Updated:** December 2024

---

## MVP Features (Complete)

### Core Platform
- [x] Monorepo setup (Turborepo + PNPM)
- [x] Next.js 16 with TypeScript
- [x] Python FastAPI agent
- [x] PostgreSQL database (Prisma 7)

### Authentication
- [x] Email/password with validation
- [x] Google OAuth
- [x] Email verification (Resend)
- [x] Password reset flow
- [x] Organization management with roles
- [x] Team invitations

### HR Features
- [x] Job posting and management
- [x] AI-generated interview questions
- [x] Applicant dashboard with scoring
- [x] Interview results review
- [x] Accept/reject candidates

### Candidate Features
- [x] CV upload and AI parsing
- [x] Job discovery with match scores
- [x] Application tracking
- [x] AI video interviews
- [x] Real-time transcription

### AI & Video
- [x] Gemini AI integration (CV parsing, question generation, scoring)
- [x] Stream Video SDK (WebRTC)
- [x] Deepgram STT (transcription)
- [x] Interview evaluation and feedback

### Infrastructure
- [x] Cloud SQL (PostgreSQL)
- [x] GCS file storage
- [x] Firebase App Hosting
- [x] Sentry monitoring
- [x] Rate limiting (Upstash Redis)

---

## Post-MVP Roadmap

### High Priority
- [ ] Email notifications (interview invites, status updates)
- [ ] Analytics dashboard for HR
- [x] Testing framework (Vitest, Playwright)
- [ ] CI/CD pipeline (GitHub Actions)

### Future
- [ ] Advanced candidate search/filters
- [ ] Bulk operations
- [ ] Custom interview templates
- [ ] API for integrations

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
| Upstash Redis | Rate limiting | Active |
| Resend | Email delivery | Active |

---

## Development

```bash
pnpm dev          # Start all services
pnpm build        # Build all workspaces
pnpm typecheck    # Type check
pnpm db:generate  # Regenerate Prisma client
```

### Testing (apps/web)

```bash
pnpm test         # Run Vitest in watch mode
pnpm test:run     # Run tests once
pnpm test:e2e     # Run Playwright E2E tests
```

See `.env.example` files for required environment variables.
