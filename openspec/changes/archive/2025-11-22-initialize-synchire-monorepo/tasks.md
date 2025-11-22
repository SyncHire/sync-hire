# Implementation Tasks

**Change ID:** `initialize-synchire-monorepo`
**Status:** Proposed

## Task Execution Order

Tasks are ordered to minimize dependencies and enable parallel work where possible. Tasks marked with `[CAN RUN IN PARALLEL]` can be executed concurrently with other similarly marked tasks at the same level.

---

## Phase 1: Monorepo Foundation (30 min)

### Task 1.1: Initialize Root Package Configuration
**Capability:** `monorepo-foundation`
**Estimated Time:** 5 minutes
**Dependencies:** None

**Steps:**
1. Create root `package.json` with:
   - name: "sync-hire-monorepo"
   - private: true
   - packageManager: "pnpm@9.15.0"
   - scripts: dev, build, test, lint, clean
   - devDependencies: turbo@^2.3.0
2. Create `.gitignore` with standard Next.js/Python ignores + .turbo, node_modules
3. Run `pnpm init` if needed

**Validation:**
- `package.json` exists and is valid JSON
- Contains required scripts and turbo dependency

**Files Created:**
- `package.json`
- `.gitignore`

---

### Task 1.2: Configure Turborepo
**Capability:** `monorepo-foundation`
**Estimated Time:** 10 minutes
**Dependencies:** Task 1.1

**Steps:**
1. Create `turbo.json` with:
   - Schema reference
   - globalDependencies: ["**/.env.*local"]
   - tasks: build, dev, lint, test, clean
   - Configure caching and outputs
2. Verify JSON syntax is valid

**Validation:**
- `turbo.json` exists and is valid JSON
- Contains all required tasks

**Files Created:**
- `turbo.json`

---

### Task 1.3: Configure PNPM Workspaces
**Capability:** `monorepo-foundation`
**Estimated Time:** 5 minutes
**Dependencies:** Task 1.1

**Steps:**
1. Create `pnpm-workspace.yaml` with:
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   ```
2. Create empty directories:
   - `apps/`
   - `packages/`

**Validation:**
- `pnpm-workspace.yaml` exists
- `apps/` and `packages/` directories exist

**Files Created:**
- `pnpm-workspace.yaml`
- `apps/` (directory)
- `packages/` (directory)

---

### Task 1.4: Create Shared TypeScript Config Package
**Capability:** `monorepo-foundation`
**Estimated Time:** 10 minutes
**Dependencies:** Task 1.3
**Can run in parallel:** Yes (with Task 1.5, 1.6)

**Steps:**
1. Create `packages/typescript-config/package.json`:
   - name: "@sync-hire/typescript-config"
   - version: "0.0.0"
   - private: true
2. Create `packages/typescript-config/base.json` (base TS config)
3. Create `packages/typescript-config/nextjs.json` (Next.js extends base)
4. Create `packages/typescript-config/react.json` (React library extends base)

**Validation:**
- Package has valid package.json
- Config files are valid JSON
- Extends work correctly

**Files Created:**
- `packages/typescript-config/package.json`
- `packages/typescript-config/base.json`
- `packages/typescript-config/nextjs.json`
- `packages/typescript-config/react.json`

---

### Task 1.5: Create Shared ESLint Config Package
**Capability:** `monorepo-foundation`
**Estimated Time:** 5 minutes
**Dependencies:** Task 1.3
**Can run in parallel:** Yes (with Task 1.4, 1.6)

**Steps:**
1. Create `packages/eslint-config/package.json`:
   - name: "@sync-hire/eslint-config"
   - private: true
   - peerDependencies: eslint, @next/eslint-plugin-next
2. Create `packages/eslint-config/next.js` (Next.js ESLint config)

**Validation:**
- Package has valid package.json
- Config extends @next/eslint-plugin-next

**Files Created:**
- `packages/eslint-config/package.json`
- `packages/eslint-config/next.js`

---

### Task 1.6: Create Shared Types Package
**Capability:** `monorepo-foundation`
**Estimated Time:** 5 minutes
**Dependencies:** Task 1.3
**Can run in parallel:** Yes (with Task 1.4, 1.5)

**Steps:**
1. Create `packages/shared-types/package.json`:
   - name: "@sync-hire/shared-types"
   - private: true
   - exports: "./index.ts"
2. Create `packages/shared-types/index.ts` (empty for now, will add types later)
3. Create `packages/shared-types/tsconfig.json` (basic TS config)

**Validation:**
- Package has valid package.json
- index.ts exports at least an empty object
- tsconfig.json is valid

**Files Created:**
- `packages/shared-types/package.json`
- `packages/shared-types/index.ts`
- `packages/shared-types/tsconfig.json`

---

## Phase 2: Next.js Application (40 min)

### Task 2.1: Initialize Next.js Application
**Capability:** `nextjs-application`
**Estimated Time:** 10 minutes
**Dependencies:** Task 1.3

**Steps:**
1. Run `npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir --import-alias "@/*"`
2. Accept defaults for latest versions (Next.js 15.1, React 19)
3. Modify `apps/web/package.json`:
   - name: "@sync-hire/web"
   - Add workspace dependencies: @sync-hire/typescript-config, @sync-hire/shared-types

**Validation:**
- Next.js app created in `apps/web/`
- Can run `cd apps/web && npm run dev` (don't leave running)
- TypeScript compiles without errors

**Files Created:**
- `apps/web/` (entire Next.js app structure)

---

### Task 2.2: Configure Tailwind CSS v4
**Capability:** `nextjs-application`
**Estimated Time:** 15 minutes
**Dependencies:** Task 2.1

**Steps:**
1. Install Tailwind v4: `cd apps/web && pnpm add tailwindcss@next @tailwindcss/postcss@next`
2. Remove `tailwind.config.ts` (v4 doesn't use it)
3. Update `apps/web/src/app/globals.css`:
   ```css
   @import "tailwindcss";

   @theme {
     --color-primary: #3b82f6;
     --color-secondary: #8b5cf6;
   }
   ```
4. Update `postcss.config.mjs` to use @tailwindcss/postcss

**Validation:**
- Tailwind v4 installed
- No tailwind.config file
- globals.css has @import and @theme
- Dev server starts without errors

**Files Modified:**
- `apps/web/package.json` (dependencies)
- `apps/web/src/app/globals.css`
- `apps/web/postcss.config.mjs`

**Files Removed:**
- `apps/web/tailwind.config.ts`

---

### Task 2.3: Install Shadcn UI
**Capability:** `nextjs-application`
**Estimated Time:** 10 minutes
**Dependencies:** Task 2.2

**Steps:**
1. Run `cd apps/web && npx shadcn@latest init`
2. Select defaults (TypeScript, CSS variables, etc.)
3. Install initial components: `npx shadcn@latest add button form input label`
4. Verify components are in `apps/web/src/components/ui/`

**Validation:**
- Shadcn components exist in src/components/ui/
- Can import and use Button component
- No TypeScript errors

**Files Created:**
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/form.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/label.tsx`
- `apps/web/components.json`

---

### Task 2.4: Create Basic Folder Structure
**Capability:** `nextjs-application`
**Estimated Time:** 5 minutes
**Dependencies:** Task 2.1

**Steps:**
1. Create folders:
   - `apps/web/src/app/(auth)/login/`
   - `apps/web/src/app/(employer)/dashboard/`
   - `apps/web/src/app/(candidate)/dashboard/`
   - `apps/web/src/app/api/`
   - `apps/web/src/lib/`
2. Create placeholder `page.tsx` files in each route

**Validation:**
- All folders exist
- Each route has a page.tsx file
- No TypeScript errors

**Files Created:**
- Multiple page.tsx files
- Directory structure

---

## Phase 3: Database Setup (30 min)

### Task 3.1: Install Prisma Dependencies
**Capability:** `database`
**Estimated Time:** 5 minutes
**Dependencies:** Task 2.1

**Steps:**
1. Run `cd apps/web && pnpm add @prisma/client`
2. Run `cd apps/web && pnpm add -D prisma`
3. Run `npx prisma init`

**Validation:**
- Prisma installed
- `prisma/` directory created with schema.prisma
- .env file created with DATABASE_URL

**Files Created:**
- `apps/web/prisma/schema.prisma` (basic template)
- `apps/web/.env` (with DATABASE_URL)

---

### Task 3.2: Define Prisma Schema
**Capability:** `database`
**Estimated Time:** 15 minutes
**Dependencies:** Task 3.1

**Steps:**
1. Replace `apps/web/prisma/schema.prisma` with full schema (see database spec)
2. Include all models: User, Account, Session, VerificationToken, Job, Question, Application, Interview
3. Include all enums: Role, JobStatus, etc.

**Validation:**
- Schema is valid (run `npx prisma format`)
- No syntax errors
- All relationships defined correctly

**Files Modified:**
- `apps/web/prisma/schema.prisma`

---

### Task 3.3: Create Prisma Client Singleton
**Capability:** `database`
**Estimated Time:** 5 minutes
**Dependencies:** Task 3.2

**Steps:**
1. Create `apps/web/src/lib/prisma.ts` with singleton pattern
2. Export `prisma` instance

**Validation:**
- File exists and exports prisma
- No TypeScript errors
- Can import in other files

**Files Created:**
- `apps/web/src/lib/prisma.ts`

---

### Task 3.4: Run Initial Migration
**Capability:** `database`
**Estimated Time:** 5 minutes
**Dependencies:** Task 3.2, Docker Compose running

**Steps:**
1. Ensure PostgreSQL is running (`docker-compose up postgres` or wait for Task 7.1)
2. Run `cd apps/web && npx prisma migrate dev --name init`
3. Verify migration files created

**Validation:**
- Migration SQL files in prisma/migrations/
- Can run `npx prisma studio` and see tables
- Prisma Client types generated

**Files Created:**
- `apps/web/prisma/migrations/*/migration.sql`

---

## Phase 4: Authentication (40 min)

### Task 4.1: Install NextAuth Dependencies
**Capability:** `authentication`
**Estimated Time:** 5 minutes
**Dependencies:** Task 3.3

**Steps:**
1. Run `cd apps/web && pnpm add next-auth@beta @auth/prisma-adapter`
2. Run `cd apps/web && pnpm add bcryptjs`
3. Run `cd apps/web && pnpm add -D @types/bcryptjs`

**Validation:**
- Dependencies installed
- Correct versions (next-auth@beta v5.x)

**Files Modified:**
- `apps/web/package.json`

---

### Task 4.2: Create Auth Configuration
**Capability:** `authentication`
**Estimated Time:** 20 minutes
**Dependencies:** Task 4.1

**Steps:**
1. Create `apps/web/src/auth.ts` with NextAuth.js v5 config (see authentication spec)
2. Configure PrismaAdapter
3. Add Google provider
4. Add Credentials provider
5. Add callbacks (jwt, session, authorized)
6. Set pages (signIn, error)

**Validation:**
- File compiles without errors
- Exports auth, signIn, signOut, handlers
- Callbacks are type-safe

**Files Created:**
- `apps/web/src/auth.ts`

---

### Task 4.3: Create Auth API Route
**Capability:** `authentication`
**Estimated Time:** 5 minutes
**Dependencies:** Task 4.2

**Steps:**
1. Create `apps/web/src/app/api/auth/[...nextauth]/route.ts`
2. Export GET and POST handlers from auth.ts

**Validation:**
- File exists
- Exports GET and POST
- No TypeScript errors

**Files Created:**
- `apps/web/src/app/api/auth/[...nextauth]/route.ts`

---

### Task 4.4: Create Auth Middleware
**Capability:** `authentication`
**Estimated Time:** 5 minutes
**Dependencies:** Task 4.2

**Steps:**
1. Create `apps/web/src/middleware.ts`
2. Export auth as middleware
3. Configure matcher for protected routes

**Validation:**
- Middleware protects /dashboard/* routes
- Unauthenticated users redirected to /login

**Files Created:**
- `apps/web/src/middleware.ts`

---

### Task 4.5: Update Environment Variables
**Capability:** `authentication`
**Estimated Time:** 5 minutes
**Dependencies:** Task 4.2

**Steps:**
1. Add to `apps/web/.env.local`:
   - AUTH_SECRET (generate with `openssl rand -base64 32`)
   - AUTH_GOOGLE_ID (placeholder)
   - AUTH_GOOGLE_SECRET (placeholder)
   - NEXTAUTH_URL=http://localhost:3000
2. Create `.env.example` with same variables (no values)

**Validation:**
- .env.local has all auth variables
- .env.example documents required variables

**Files Modified:**
- `apps/web/.env.local`

**Files Created:**
- `apps/web/.env.example`

---

## Phase 5: Firebase Cloud Storage (15 min)

### Task 5.1: Install Firebase Admin SDK
**Capability:** `file-storage`
**Estimated Time:** 5 minutes
**Dependencies:** Task 2.1

**Steps:**
1. Run `cd apps/web && pnpm add firebase-admin`

**Validation:**
- firebase-admin installed

**Files Modified:**
- `apps/web/package.json`

---

### Task 5.2: Create Firebase Storage Client
**Capability:** `file-storage`
**Estimated Time:** 10 minutes
**Dependencies:** Task 5.1

**Steps:**
1. Create `apps/web/src/lib/firebase-storage.ts`
2. Initialize Firebase Admin with service account
3. Export functions: uploadFile, getSignedUrl, deleteFile

**Validation:**
- File exports storage functions
- No TypeScript errors
- Functions are type-safe

**Files Created:**
- `apps/web/src/lib/firebase-storage.ts`

---

## Phase 6: Python Agent (45 min)

### Task 6.1: Install uv Package Manager
**Capability:** `python-agent`
**Estimated Time:** 5 minutes
**Dependencies:** None (system-level install)

**Steps:**
1. Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh` (macOS/Linux)
2. Verify installation: `uv --version`

**Validation:**
- uv command is available
- Version is latest

---

### Task 6.2: Create Python Agent Structure
**Capability:** `python-agent`
**Estimated Time:** 10 minutes
**Dependencies:** Task 1.3, Task 6.1

**Steps:**
1. Create `apps/agent/` directory
2. Create `apps/agent/pyproject.toml` (see python-agent spec)
3. Create `apps/agent/requirements.txt` (generated from pyproject.toml)
4. Create `apps/agent/.env.example`

**Validation:**
- Files exist
- pyproject.toml is valid TOML
- requirements.txt lists all dependencies

**Files Created:**
- `apps/agent/pyproject.toml`
- `apps/agent/requirements.txt`
- `apps/agent/.env.example`

---

### Task 6.3: Create Python Agent Code
**Capability:** `python-agent`
**Estimated Time:** 20 minutes
**Dependencies:** Task 6.2

**Steps:**
1. Create `apps/agent/main.py` with InterviewAgent class (~100 lines)
2. Create `apps/agent/config.py` with environment config (~50 lines)
3. Create `apps/agent/interview_instructions.md` (Markdown configuration)
4. Verify total Python code < 200 lines

**Validation:**
- Files compile without syntax errors
- Total LOC < 200 (excluding comments/blanks)
- Can import vision_agents, openai

**Files Created:**
- `apps/agent/main.py`
- `apps/agent/config.py`
- `apps/agent/interview_instructions.md`

---

### Task 6.4: Create Dockerfile for Python Agent
**Capability:** `python-agent`
**Estimated Time:** 10 minutes
**Dependencies:** Task 6.3

**Steps:**
1. Create `apps/agent/Dockerfile` with multi-stage build using uv
2. Builder stage: install dependencies with uv
3. Runtime stage: copy installed packages
4. Set CMD to run main.py

**Validation:**
- Dockerfile builds successfully
- Uses uv for package installation
- Final image is optimized

**Files Created:**
- `apps/agent/Dockerfile`

---

### Task 6.5: Create package.json for Turborepo
**Capability:** `python-agent`
**Estimated Time:** 5 minutes
**Dependencies:** Task 6.2

**Steps:**
1. Create `apps/agent/package.json`:
   - name: "@sync-hire/agent"
   - scripts: dev (uv run uvicorn), build (docker build), test (pytest)

**Validation:**
- package.json is valid JSON
- Scripts defined correctly
- Turborepo can find and run agent scripts

**Files Created:**
- `apps/agent/package.json`

---

## Phase 7: Development Environment (20 min)

### Task 7.1: Create Docker Compose Configuration
**Capability:** `development-environment`
**Estimated Time:** 15 minutes
**Dependencies:** Task 2.1, Task 6.4

**Steps:**
1. Create `docker-compose.yml` at root
2. Define services: web, agent, postgres
3. Configure ports, volumes, environment variables
4. Set up service dependencies (web depends on postgres, agent)

**Validation:**
- `docker-compose up` starts all services
- Web accessible on http://localhost:3000
- Agent accessible on http://localhost:8080
- PostgreSQL accessible on localhost:5432

**Files Created:**
- `docker-compose.yml`

---

### Task 7.2: Create Root Environment Template
**Capability:** `development-environment`
**Estimated Time:** 5 minutes
**Dependencies:** Task 4.5, Task 5.2, Task 6.2

**Steps:**
1. Create `.env.example` at root with all required variables:
   - NextAuth variables
   - Database URL
   - Firebase credentials
   - AI API keys (Gemini, OpenAI)
   - Stream Video credentials
2. Document each variable with comments

**Validation:**
- .env.example documents all required variables
- Comments explain what each variable is for

**Files Created:**
- `.env.example` (root)

---

## Phase 8: AI Integration (15 min)

### Task 8.1: Install Gemini SDK
**Capability:** `ai-integration`
**Estimated Time:** 5 minutes
**Dependencies:** Task 2.1

**Steps:**
1. Run `cd apps/web && pnpm add @google/generative-ai`

**Validation:**
- Package installed
- Can import in TypeScript

**Files Modified:**
- `apps/web/package.json`

---

### Task 8.2: Create Gemini Client
**Capability:** `ai-integration`
**Estimated Time:** 10 minutes
**Dependencies:** Task 8.1

**Steps:**
1. Create `apps/web/src/lib/gemini.ts`
2. Initialize GoogleGenerativeAI with API key
3. Export function: generateQuestions, analyzeCv, generateSummary
4. Configure to use `gemini-2.5-flash` model

**Validation:**
- File exports Gemini functions
- Uses correct model name
- No TypeScript errors

**Files Created:**
- `apps/web/src/lib/gemini.ts`

---

## Phase 9: Documentation (30 min)

### Task 9.1: Update ARCHITECTURE.md
**Capability:** N/A (documentation)
**Estimated Time:** 10 minutes
**Dependencies:** All previous tasks

**Steps:**
1. Update `docs/ARCHITECTURE.md`:
   - Change Supabase → Cloud SQL + Firebase Storage
   - Update to NextAuth.js v5
   - Update AI models to Gemini 2.5 Flash, gpt-realtime
   - Add Turborepo monorepo section
   - Update deployment section for GCP

**Validation:**
- All references updated
- Tech stack matches implementation
- Architecture diagrams reflect monorepo structure

**Files Modified:**
- `docs/ARCHITECTURE.md`

---

### Task 9.2: Update API_SPEC.md
**Capability:** N/A (documentation)
**Estimated Time:** 10 minutes
**Dependencies:** Task 4.2

**Steps:**
1. Update `docs/API_SPEC.md`:
   - Update authentication section for NextAuth.js v5
   - Update AI model references
   - Add Firebase Storage URL patterns

**Validation:**
- Auth flow documented correctly
- Endpoint examples use correct auth patterns

**Files Modified:**
- `docs/API_SPEC.md`

---

### Task 9.3: Update VISION_AGENTS_INTEGRATION.md
**Capability:** N/A (documentation)
**Estimated Time:** 5 minutes
**Dependencies:** Task 6.3

**Steps:**
1. Update `docs/VISION_AGENTS_INTEGRATION.md`:
   - Update to use uv package manager
   - Update OpenAI model to gpt-realtime
   - Update Dockerfile examples

**Validation:**
- uv commands documented
- Correct model name used

**Files Modified:**
- `docs/VISION_AGENTS_INTEGRATION.md`

---

### Task 9.4: Create README.md
**Capability:** N/A (documentation)
**Estimated Time:** 5 minutes
**Dependencies:** Task 7.1

**Steps:**
1. Create `README.md` at root with:
   - Project overview
   - Tech stack summary
   - Quick start (pnpm install, turbo dev)
   - Docker Compose usage
   - Environment setup

**Validation:**
- README is clear and complete
- Instructions work for new developers

**Files Created:**
- `README.md`

---

## Phase 10: Validation & Testing (20 min)

### Task 10.1: Install All Dependencies
**Capability:** N/A (validation)
**Estimated Time:** 5 minutes
**Dependencies:** All previous tasks

**Steps:**
1. Run `pnpm install` from root
2. Verify all workspaces resolve correctly
3. Check for dependency conflicts

**Validation:**
- pnpm install completes without errors
- pnpm-lock.yaml is generated
- All workspaces linked correctly

---

### Task 10.2: Build All Applications
**Capability:** N/A (validation)
**Estimated Time:** 5 minutes
**Dependencies:** Task 10.1

**Steps:**
1. Run `turbo build` from root
2. Verify both web and agent build successfully
3. Check build outputs

**Validation:**
- turbo build succeeds
- .next/ directory created in apps/web
- Build cache in .turbo/ directory

---

### Task 10.3: Run Development Servers
**Capability:** N/A (validation)
**Estimated Time:** 5 minutes
**Dependencies:** Task 10.1

**Steps:**
1. Run `turbo dev` from root
2. Verify Next.js starts on port 3000
3. Verify Python agent starts on port 8080
4. Test hot-reload by making a change

**Validation:**
- Both servers start without errors
- Can access http://localhost:3000
- Can access http://localhost:8080
- Hot-reload works

---

### Task 10.4: Test Docker Compose
**Capability:** N/A (validation)
**Estimated Time:** 5 minutes
**Dependencies:** Task 7.1

**Steps:**
1. Run `docker-compose up`
2. Verify all services start
3. Test database connectivity
4. Stop with `docker-compose down`

**Validation:**
- All services start successfully
- No errors in logs
- PostgreSQL accepts connections
- Next.js can connect to database

---

## Summary

**Total Estimated Time:** ~4.5 hours
**Total Tasks:** 40+ tasks across 10 phases

**Critical Path:**
1. Monorepo foundation → Next.js app → Database → Authentication → Validation

**Parallel Work Opportunities:**
- Shared packages (Tasks 1.4, 1.5, 1.6) can run concurrently
- Firebase Storage (Phase 5) can run parallel to Auth (Phase 4)
- Documentation (Phase 9) can start after implementation phases complete

**Validation Checkpoints:**
- After Phase 1: `turbo build` works
- After Phase 3: Database connects
- After Phase 4: Authentication works
- After Phase 6: Both apps in monorepo
- After Phase 10: All systems integrated

**Key Dependencies:**
- Python agent depends on uv installation (system-level)
- Database migrations depend on PostgreSQL running
- Auth depends on Prisma schema
- All depend on monorepo foundation
