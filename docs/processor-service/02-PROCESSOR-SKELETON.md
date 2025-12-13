# Phase 2: Processor Service Skeleton

## Goal
Create `apps/processor/` Express.js server with basic structure, health endpoint, and configuration.

## Prerequisites
- Phase 1 (Shared Package) completed

## Deliverables

### Directory Structure
```
apps/processor/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                    # Express server entry
│   ├── config.ts                   # Environment configuration
│   ├── routes/
│   │   ├── index.ts                # Route aggregator
│   │   ├── health.ts               # GET /health
│   │   └── documents.ts            # Document routes (placeholder)
│   ├── middleware/
│   │   ├── error-handler.ts        # Global error handling
│   │   └── validation.ts           # Request validation
│   ├── services/
│   │   └── gemini.service.ts       # Gemini API client
│   └── utils/
│       ├── logger.ts               # Structured logging
│       └── pdf-parser.ts           # PDF extraction utility
```

---

## Tasks

### 1. Create package.json
```json
{
  "name": "@sync-hire/processor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^0.1.0",
    "@sync-hire/shared": "workspace:*",
    "express": "^4.21.0",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.12",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 2. Create tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Create .env.example
```bash
# Server
PORT=3001
NODE_ENV=development

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# LangSmith (optional)
LANGCHAIN_TRACING_V2=false
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=sync-hire-processor

# Processing
MAX_FILE_SIZE_MB=10
CONFIDENCE_THRESHOLD=0.75

# Webhook
WEBHOOK_TIMEOUT_MS=30000
WEBHOOK_RETRY_ATTEMPTS=3
```

### 4. Create config.ts
```typescript
// src/config.ts
import { z } from "zod";

const configSchema = z.object({
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  // Gemini
  geminiApiKey: z.string().min(1),
  geminiModel: z.string().default("gemini-2.5-flash"),

  // LangSmith
  langchainTracing: z.coerce.boolean().default(false),
  langchainApiKey: z.string().optional(),
  langchainProject: z.string().default("sync-hire-processor"),

  // Processing
  maxFileSizeMb: z.coerce.number().default(10),
  confidenceThreshold: z.coerce.number().default(0.75),

  // Webhook
  webhookTimeoutMs: z.coerce.number().default(30000),
  webhookRetryAttempts: z.coerce.number().default(3),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    langchainTracing: process.env.LANGCHAIN_TRACING_V2,
    langchainApiKey: process.env.LANGCHAIN_API_KEY,
    langchainProject: process.env.LANGCHAIN_PROJECT,
    maxFileSizeMb: process.env.MAX_FILE_SIZE_MB,
    confidenceThreshold: process.env.CONFIDENCE_THRESHOLD,
    webhookTimeoutMs: process.env.WEBHOOK_TIMEOUT_MS,
    webhookRetryAttempts: process.env.WEBHOOK_RETRY_ATTEMPTS,
  });

  if (!result.success) {
    console.error("Invalid configuration:", result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
```

### 5. Create logger.ts
```typescript
// src/utils/logger.ts
export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: "info", message, ...data, timestamp: new Date().toISOString() }));
  },
  error: (message: string, error?: unknown, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: "error",
      message,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...data,
      timestamp: new Date().toISOString()
    }));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: "warn", message, ...data, timestamp: new Date().toISOString() }));
  },
  debug: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "development") {
      console.log(JSON.stringify({ level: "debug", message, ...data, timestamp: new Date().toISOString() }));
    }
  },
};
```

### 6. Create error-handler.ts
```typescript
// src/middleware/error-handler.ts
import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  logger.error("Request error", err, {
    path: req.path,
    method: req.method,
    statusCode,
  });

  res.status(statusCode).json({
    error: {
      code,
      message: err.message,
    },
  });
}
```

### 7. Create health.ts route
```typescript
// src/routes/health.ts
import { Router } from "express";
import { config } from "../config";

const router = Router();

const startTime = Date.now();

router.get("/health", (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    status: "healthy",
    version: "0.1.0",
    uptime,
    environment: config.nodeEnv,
    dependencies: {
      gemini: config.geminiApiKey ? "configured" : "missing",
      langsmith: config.langchainTracing ? "enabled" : "disabled",
    },
  });
});

export default router;
```

### 8. Create routes/index.ts
```typescript
// src/routes/index.ts
import { Router } from "express";
import healthRouter from "./health";

const router = Router();

router.use(healthRouter);

// Documents routes will be added in Phase 5
// router.use("/api/documents", documentsRouter);

export default router;
```

### 9. Create gemini.service.ts
```typescript
// src/services/gemini.service.ts
import { GoogleGenAI } from "@google/genai";
import { config } from "../config";
import { logger } from "../utils/logger";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
    logger.info("Gemini client initialized", { model: config.geminiModel });
  }
  return geminiClient;
}

export async function generateContent(
  prompt: string,
  options?: {
    jsonSchema?: Record<string, unknown>;
  }
): Promise<string> {
  const client = getGeminiClient();

  const requestConfig: Record<string, unknown> = {};
  if (options?.jsonSchema) {
    requestConfig.responseMimeType = "application/json";
    requestConfig.responseSchema = options.jsonSchema;
  }

  const response = await client.models.generateContent({
    model: config.geminiModel,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: requestConfig,
  });

  return response.text || "";
}
```

### 10. Create pdf-parser.ts
```typescript
// src/utils/pdf-parser.ts
import pdf from "pdf-parse";
import { logger } from "./logger";

export interface ParsedPDF {
  text: string;
  pageCount: number;
  info: Record<string, unknown>;
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const data = await pdf(buffer);

    logger.debug("PDF parsed", {
      pageCount: data.numpages,
      textLength: data.text.length,
    });

    return {
      text: data.text,
      pageCount: data.numpages,
      info: data.info || {},
    };
  } catch (error) {
    logger.error("PDF parsing failed", error);
    throw new Error("Failed to parse PDF file");
  }
}
```

### 11. Create main index.ts
```typescript
// src/index.ts
import express from "express";
import { config } from "./config";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/error-handler";
import routes from "./routes";

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use(routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info("Processor service started", {
    port: config.port,
    environment: config.nodeEnv,
  });
});
```

### 12. Update turbo.json
Add processor to pipeline:
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "@sync-hire/processor#build": {
      "dependsOn": ["@sync-hire/shared#build"]
    },
    "@sync-hire/processor#dev": {
      "dependsOn": ["@sync-hire/shared#build"],
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Verification

```bash
# Install dependencies
pnpm install

# Create .env file
cp apps/processor/.env.example apps/processor/.env
# Edit .env with your GEMINI_API_KEY

# Start dev server
pnpm --filter @sync-hire/processor dev

# Test health endpoint
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 5,
  "environment": "development",
  "dependencies": {
    "gemini": "configured",
    "langsmith": "disabled"
  }
}
```

---

## Success Criteria
- [ ] `apps/processor/` directory created
- [ ] `pnpm install` succeeds
- [ ] `pnpm --filter @sync-hire/processor dev` starts server
- [ ] `GET /health` returns 200 with correct JSON
- [ ] Type checking passes
