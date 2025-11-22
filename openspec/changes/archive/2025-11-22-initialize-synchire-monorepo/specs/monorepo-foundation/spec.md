# Spec: Monorepo Foundation

**Capability:** `monorepo-foundation`
**Status:** Proposed
**Related Capabilities:** All (foundation for entire project)

## Overview

Establish Turborepo monorepo structure with PNPM workspaces to manage Next.js and Python applications with shared packages.

## ADDED Requirements

### Requirement: Turborepo Configuration

The system SHALL provide a Turborepo configuration that defines task pipelines for building, testing, and running applications.

#### Scenario: Build all applications

**Given** a developer has cloned the repository
**When** they run `turbo build`
**Then** the system builds all applications in dependency order
**And** caches build outputs for faster subsequent builds
**And** displays build progress for each application

#### Scenario: Run all dev servers

**Given** a developer wants to start local development
**When** they run `turbo dev`
**Then** the Next.js dev server starts on port 3000
**And** the Python agent dev server starts on port 8080
**And** both servers run in parallel
**And** hot-reload works for both applications

#### Scenario: Run tests across workspace

**Given** a developer wants to run all tests
**When** they run `turbo test`
**Then** tests run for all packages that have tests
**And** test results are cached for unchanged code
**And** failures are clearly reported

### Requirement: PNPM Workspace Management

The system SHALL use PNPM workspaces to manage dependencies across multiple applications and packages.

#### Scenario: Install dependencies

**Given** a developer has cloned the repository
**When** they run `pnpm install`
**Then** dependencies are installed for all workspaces
**And** shared dependencies use hardlinks to save disk space
**And** a lockfile is generated for reproducible builds

#### Scenario: Add dependency to specific workspace

**Given** a developer wants to add a package to the Next.js app
**When** they run `pnpm add package-name --filter web`
**Then** the package is added only to apps/web
**And** the workspace lockfile is updated
**And** other workspaces are not affected

### Requirement: Folder Structure Organization

The system SHALL organize code into a standard monorepo structure with apps and packages directories.

#### Scenario: Navigate project structure

**Given** a developer opens the project
**When** they view the root directory
**Then** they see apps/ containing application code
**And** they see packages/ containing shared code
**And** they see openspec/ containing specifications
**And** they see docs/ containing documentation
**And** they see turbo.json, pnpm-workspace.yaml at the root

#### Scenario: Add new application

**Given** a developer wants to add a new application
**When** they create a directory under apps/
**And** they add it to pnpm-workspace.yaml
**Then** Turborepo automatically includes it in the build pipeline
**And** it can reference shared packages

### Requirement: Shared Package Support

The system SHALL provide shared packages for TypeScript configuration, ESLint rules, and common types.

#### Scenario: Use shared TypeScript config

**Given** the Next.js application needs TypeScript configuration
**When** it extends from `@sync-hire/typescript-config`
**Then** it inherits strict compiler options
**And** it inherits Next.js-specific settings
**And** it can override settings as needed

#### Scenario: Use shared types

**Given** both Next.js and Python need common type definitions
**When** Next.js imports from `@sync-hire/shared-types`
**Then** it has access to User, Job, Application, Interview types
**And** types are kept in sync across applications

### Requirement: Build Caching

The system SHALL cache build outputs to speed up subsequent builds and avoid redundant work.

#### Scenario: Incremental build

**Given** a developer has built the project once
**When** they modify only the Next.js application
**And** they run `turbo build`
**Then** only the Next.js application rebuilds
**And** the Python agent uses cached build output
**And** shared packages rebuild only if changed

## Configuration

### Required Files

**package.json (root):**
```json
{
  "name": "sync-hire-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Folder Structure

```
sync-hire/
├── apps/
│   ├── web/              # Next.js application
│   └── agent/            # Python agent
├── packages/
│   ├── typescript-config/
│   ├── eslint-config/
│   └── shared-types/
├── docs/
├── openspec/
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

## Dependencies

- Node.js 20+
- pnpm 9.15+
- Turborepo 2.3+

## Validation

- `pnpm install` completes without errors
- `turbo build` builds all applications
- `turbo dev` starts all dev servers
- `.turbo` cache directory is created
- Subsequent builds use cache (faster builds)

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://turbo.build/repo/docs/handbook)
