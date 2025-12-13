# @sync-hire/shared

Core shared library for SyncHire, containing type definitions, schemas, and utilities used across the monorepo (Web App and Processor Service).

## Features

- **Strict TypeScript Types**: Core data models (`ExtractedJobData`, `WebhookPayload`) exported via `export type`.
- **Zod Schemas**: Runtime validation schemas matching strict types.
- **Enums**: Shared constants (`EmploymentType`, `WorkArrangement`).
- **Utilities**: Common helpers (hashing, ID generation).

## Usage

This package is intended to be used via the workspace protocol.

```json
// package.json in consuming app
{
  "dependencies": {
    "@sync-hire/shared": "workspace:*"
  }
}
```

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev

# Type check only
pnpm typecheck
```
