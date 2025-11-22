# Initialize SyncHire Monorepo with GCP Stack

**Change ID:** `initialize-synchire-monorepo`
**Status:** Proposed
**Created:** 2025-01-08
**Author:** Claude (with user guidance)

## Summary

Initialize the SyncHire project from scratch as a Turborepo monorepo with modern 2025 tech stack optimized for Google Cloud Platform. This change establishes the foundation for an AI-powered interview platform that conducts real-time conversational interviews using Vision-Agents and Google Cloud services.

## Problem Statement

Starting a new project with:
- Modern Next.js 15.1 + React 19 + Tailwind v4 stack
- Python microservice with uv package manager
- Google Cloud Platform services (Cloud SQL, Firebase Storage, Gemini AI)
- Turborepo monorepo for managing multiple applications
- Type-safe development with Prisma + NextAuth.js v5
- Docker Compose for consistent local development

No existing codebase - this is a greenfield initialization.

## Goals

1. **Monorepo Foundation**: Set up Turborepo with PNPM workspaces for managing Next.js + Python applications
2. **Modern Frontend**: Initialize Next.js 15.1 with React 19, Tailwind v4, and Shadcn UI
3. **Authentication**: Configure NextAuth.js v5 with Prisma adapter for Google OAuth + credentials auth
4. **Database**: Set up Prisma with Cloud SQL for PostgreSQL (local PostgreSQL for development)
5. **File Storage**: Integrate Firebase Cloud Storage for CV uploads and interview recordings
6. **Python Agent**: Create Vision-Agents microservice with uv package manager for real-time AI interviews
7. **Development Environment**: Configure Docker Compose for running all services locally
8. **AI Integration**: Configure Gemini 2.5 Flash and OpenAI gpt-realtime models
9. **Documentation**: Create comprehensive setup and architecture documentation
10. **Validation**: Ensure all components can build and run together

## Non-Goals

- Implementing business logic (job posting, interviews, etc.) - that comes after initialization
- Production deployment configuration - focus is on local development setup
- CI/CD pipelines - will be added in future changes
- Mobile applications - web-only for initial setup

## Success Criteria

- ✅ `pnpm install` successfully installs all dependencies
- ✅ `turbo build` successfully builds both Next.js and Python applications
- ✅ `turbo dev` starts both development servers (port 3000 and 8080)
- ✅ `docker-compose up` runs all services (web, agent, postgres)
- ✅ NextAuth.js authentication works with Google OAuth and credentials
- ✅ Prisma can connect to local PostgreSQL database
- ✅ Firebase Cloud Storage integration functional
- ✅ Python agent can be invoked via HTTP
- ✅ All documentation is up-to-date and accurate

## Scope

### In Scope

**Monorepo Structure:**
- Root package.json with Turborepo
- turbo.json task pipeline configuration
- pnpm-workspace.yaml for PNPM workspaces
- apps/web (Next.js application)
- apps/agent (Python agent)
- packages/typescript-config (shared TS configs)
- packages/eslint-config (shared linting)
- packages/shared-types (shared TypeScript types)

**Next.js Application (apps/web):**
- Next.js 15.1 with App Router
- React 19, TypeScript 5.7
- Tailwind CSS v4 (CSS-first configuration)
- Shadcn UI components (initial setup)
- NextAuth.js v5 with Prisma adapter
- Google OAuth + Credentials providers
- Basic route structure (auth, employer, candidate)
- Middleware for route protection
- Firebase Cloud Storage integration
- Stream Video SDK integration (installation only)

**Database:**
- Prisma schema with NextAuth adapter tables
- Core data models (User, Job, Application, Interview)
- Migrations for local PostgreSQL
- Cloud SQL connection configuration
- Seed data for development

**Python Agent (apps/agent):**
- Python 3.11 with pyproject.toml
- uv package manager configuration
- Vision-Agents framework setup
- OpenAI gpt-realtime integration
- Firebase Cloud Storage client
- Basic FastAPI server
- Dockerfile with uv multi-stage build
- package.json for Turborepo integration

**Development Environment:**
- docker-compose.yml (web, agent, postgres services)
- .env.example template
- Development scripts in root package.json
- Hot-reload configuration for both apps

**Documentation:**
- Updated docs/ARCHITECTURE.md (GCP stack)
- Updated docs/API_SPEC.md (auth flow, endpoints)
- Updated docs/VISION_AGENTS_INTEGRATION.md (uv, latest models)
- Updated openspec/project.md (final tech decisions)
- New README.md (quickstart guide)

### Out of Scope

- Business logic implementation (API endpoints for jobs, applications, interviews)
- Frontend UI components beyond initial Shadcn setup
- Actual AI interview functionality
- Production deployment scripts
- CI/CD configuration
- Monitoring and logging setup
- Email sending functionality
- Payment processing

## Implementation Approach

This change is implemented through 8 core capabilities, each with its own spec:

1. **monorepo-foundation**: Turborepo + PNPM setup, folder structure
2. **nextjs-application**: Next.js 15.1 + React 19 + Tailwind v4 initialization
3. **authentication**: NextAuth.js v5 with Prisma adapter and providers
4. **database**: Prisma schema, migrations, Cloud SQL configuration
5. **file-storage**: Firebase Cloud Storage integration
6. **python-agent**: Vision-Agents with uv package manager
7. **development-environment**: Docker Compose configuration
8. **ai-integration**: Gemini 2.5 Flash and OpenAI gpt-realtime configuration

See `tasks.md` for detailed implementation order and `design.md` for architectural decisions.

## Dependencies

### External Services Required

- Google Cloud Platform account (for Cloud SQL, Firebase, Gemini API)
- OpenAI API account (for gpt-realtime)
- Stream Video account (for WebRTC SDK)
- GitHub account (for code hosting and OAuth)

### System Requirements

- Node.js 20+ (for Next.js 15)
- Python 3.11+ (for agent)
- Docker Desktop (for local development)
- pnpm 9+ (for package management)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Next.js 15 breaking changes | High | Use official codemods, follow migration guide |
| Tailwind v4 Shadcn compatibility | Medium | Use latest Shadcn components, test thoroughly |
| NextAuth.js v5 beta stability | Medium | Pin to specific beta version, test auth flows |
| Python + Next.js coordination | Medium | Use Turborepo for unified dev experience |
| Firebase + Prisma dual storage | Low | Clear separation of concerns (auth vs data) |
| Docker Compose performance | Low | Use volume mounts for hot-reload |

## Rollback Plan

Since this is initial setup with no existing code:
- If critical issues found, can restart from scratch
- Each capability is self-contained and can be implemented independently
- Git commits after each completed task allow reverting specific changes

## Timeline Estimate

- **Proposal Review**: 15 minutes
- **Implementation**: 60-90 minutes (via OpenSpec apply)
- **Validation & Testing**: 30 minutes
- **Total**: ~2-2.5 hours

## Related Changes

None (this is the initial change)

## Open Questions

None - all technical decisions have been made through user collaboration.

## References

- Next.js 15 documentation: https://nextjs.org/docs
- NextAuth.js v5: https://authjs.dev
- Tailwind v4: https://tailwindcss.com/blog/tailwindcss-v4-alpha
- Turborepo: https://turbo.build/repo/docs
- Vision-Agents: https://github.com/GetStream/Vision-Agents
- uv package manager: https://github.com/astral-sh/uv
