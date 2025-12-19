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

## Project Status

**Currently in Open Beta** — [Try it free](https://synchire.com)

### MVP Complete

- Authentication (Better Auth with Google OAuth)
- HR dashboard with job management
- AI-generated interview questions from job descriptions
- CV upload and AI parsing (Gemini)
- Smart candidate-job matching with scores
- Real-time AI video interviews (Stream Video + Deepgram)
- Interview transcription and AI evaluation
- Candidate job discovery and application tracking

### Planned

- Email notifications
- Advanced analytics dashboard

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind v4
- **Backend:** Python 3.11, FastAPI
- **AI:** Google Gemini, Deepgram STT
- **Video:** Stream Video SDK
- **Database:** PostgreSQL (Cloud SQL)
- **Monorepo:** Turborepo, PNPM

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PNPM 9+

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/agent/.env.example apps/agent/.env

# Start development
pnpm dev
```

Web app runs on http://localhost:3000, Python agent on http://localhost:8080.

## Documentation

- [Deployment](./DEPLOYMENT.md) - Production deployment guide
- [Architecture](./docs/ARCHITECTURE.md) - System design and decisions
- [Vision-Agents](./docs/VISION_AGENTS_INTEGRATION.md) - Python agent setup

## Support

For issues or questions, check the documentation or [create an issue](https://github.com/SyncHire/sync-hire/issues).
