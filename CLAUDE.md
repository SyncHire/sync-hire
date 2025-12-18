<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Package Manager

ALWAYS use `pnpm` instead of `npm` or `npx` for all commands. This is a pnpm workspace.

## Build/Lint/Test Commands

Always use pnpm workspace commands targeting specific apps or packages.

### Root Commands
- Root: `pnpm build` - build all workspaces
- Root: `pnpm lint` - lint all workspaces
- Root: `pnpm typecheck` - typecheck all workspaces
- Root: `pnpm clean` - clean all workspaces
- Root: `pnpm db:generate` - generate new prisma client after schema.prisma changes

## Python Development

### Package Management
- **Use `uv` for all Python package operations** - not pip, pip3, or other package managers
- Install packages: `uv add <package-name>`
- Remove packages: `uv remove <package-name>`
- Sync dependencies: `uv sync`
- Run Python scripts: `uv run python <script.py>`

### Python Execution
- Always use `uv run python` to execute Python scripts
- This ensures the correct virtual environment and dependencies are used
- Example: `uv run python apps/agent/main.py`

## TypeScript/JavaScript Development

### Type Safety
- **Never use non-null assertion operator (`!`)** - it hides potential null/undefined runtime errors
- Bad: `const data = cv.extraction!` or `user!.name`
- Good: Use optional chaining `??`, explicit checks, or proper type guards
- Example: `return cv?.extraction ?? null` or `if (!user) return null`

### Import Rules
- **Never use inline/dynamic imports** - always use static imports at the top of the file
- Bad: `const { toast } = await import('@/lib/hooks/use-toast');`
- Good: `import { toast } from '@/lib/hooks/use-toast';` at the top of the file

### IIFEs (Anti-pattern)
- **Never use Immediately Invoked Function Expressions (IIFEs)** - extract into named functions or sub-components
- Bad: `{(() => { const x = compute(); return <div>{x}</div>; })()}`
- Good: Extract into a named sub-component or compute the value before JSX

### Barrel Files (Anti-pattern)
- **Never create barrel files (index.ts)** - import directly from the source file
- Barrel files cause circular dependency issues, slow down builds, and make tree-shaking less effective
- Bad: Creating `index.ts` that re-exports from other files
- Good: Import directly from the specific module file
- Example: `import { GCSStorageProvider } from './cloud/gcs-storage-provider';` not `import { GCSStorageProvider } from './cloud';`

### Dependency Injection
- **Always use constructor injection for dependencies** - enables testability and loose coupling
- Pass dependencies (database clients, storage clients, external services) as constructor parameters
- Use `typeof` for singleton instances to get the correct type

**Good patterns:**
```typescript
// Inject dependencies via constructor
export class DatabaseStorage {
  constructor(private readonly db: typeof prisma) {}
}

export class GCSStorageProvider {
  constructor(private readonly client: Storage) {}
}

// Factory creates instances with dependencies
function createProvider(): Provider {
  return new GCSStorageProvider(gcsClient);
}
```

**Bad patterns:**
```typescript
// Don't import and use singletons directly in class body
export class GCSStorageProvider {
  private client = gcsClient; // Hard to test, tightly coupled
}
```

### Data Fetching (Frontend)
- **Always use react-query (`@tanstack/react-query`) for data fetching in React components** - not raw `fetch` in useEffect
- Use `useQuery` for GET requests with automatic caching and refetching
- Use `useMutation` for POST/PUT/DELETE operations with automatic cache invalidation
- Create custom hooks in `@/lib/hooks/` to encapsulate related queries and mutations
- Use `queryClient.invalidateQueries()` to refresh data after mutations

**Good patterns:**
```tsx
// Custom hook for reusable query logic
export function useQuestionSets(cvId: string | null) {
  return useQuery({
    queryKey: ['/api/jobs/questions', cvId],
    queryFn: async () => { /* fetch logic */ },
    enabled: !!cvId,
  });
}

// Mutation with cache invalidation
export function useApplyToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params) => { /* POST logic */ },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/questions', variables.cvId] });
    },
  });
}
```

**Bad patterns:**
```tsx
// Don't use raw fetch in useEffect
useEffect(() => {
  fetch('/api/data').then(res => res.json()).then(setData);
}, []);
```

### Styling (Tailwind CSS)
- **Always use theme-aware colors** for dark/light mode compatibility
- Use semantic color variables: `primary`, `secondary`, `muted`, `accent`, `destructive`, `foreground`, `background`
- Avoid hardcoded colors like `bg-amber-50`, `text-blue-600` - use theme variables instead

**Good patterns:**
```tsx
// Theme-aware colors that work in both modes
<div className="bg-primary/10 text-primary border-primary/50">
<div className="bg-muted text-muted-foreground">
<div className="text-foreground bg-background">
```

**Bad patterns:**
```tsx
// Hardcoded colors break in dark mode
<div className="bg-amber-50 text-amber-700">
<div className="bg-blue-100 text-blue-600">
```

### Logging
- **Always use the logger abstraction** from `@/lib/logger` - not direct `console.*` or `Sentry.*` calls
- The logger handles Sentry integration internally with proper tags and context

**Good patterns:**
```typescript
import { logger } from "@/lib/logger";

// Error with context (automatically sent to Sentry)
logger.error(error, { api: "email", operation: "sendVerification", email });

// Warning (sent to Sentry)
logger.warn("Rate limit approaching", { api: "gemini", remaining: 10 });

// Info logging (console only)
logger.info("Email sent", { api: "email", email });
```

**Bad patterns:**
```typescript
// Don't use Sentry directly
import * as Sentry from "@sentry/nextjs";
Sentry.captureException(error);
const { logger } = Sentry;

// Don't use console directly
console.error("Failed:", error);
```

## Database (Prisma 7)

### Using Types
```typescript
import { prisma } from '@sync-hire/database';
import type { User, Job, Prisma } from '@sync-hire/database';

// Use base types from Prisma
const user: User = await prisma.user.findFirst();
```

### Custom Types with Relations
**Create types in `packages/database/src/types.ts`:**

```typescript
// packages/database/src/types.ts
import type { Prisma } from './generated/client';

export type UserWithInterviews = Prisma.UserGetPayload<{
  include: { interviews: true };
}>;

export type JobWithApplications = Prisma.JobGetPayload<{
  include: {
    applications: { include: { cvUpload: true } };
    questions: true;
  };
}>;
```

**Use in apps:**
```typescript
import type { UserWithInterviews } from '@sync-hire/database';

const user: UserWithInterviews = await prisma.user.findFirst({
  include: { interviews: true }
});
```

### Key Points
- Define custom types in `packages/database/src/types.ts`, not in apps
- Use `Prisma.XGetPayload<{ include: {...} }>` for type-safe relations
- Export from `@sync-hire/database` for reuse across apps

## Next.js 16

- **Middleware renamed to proxy**: Use `src/proxy.ts` with `export function proxy()` instead of `middleware.ts`

## Git

- **Default branch**: `main` (use this as the base for PRs)

## Additional Guidelines

For detailed guidelines on specific tools and integrations, refer to the files in `.claude/rules/`:
- **Sentry**: `.claude/rules/sentry.md` - Exception catching, tracing, spans, and logging
