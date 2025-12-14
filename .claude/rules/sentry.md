# Sentry Guidelines

These guidelines should be used when configuring Sentry functionality within the project.

## Exception Catching

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected.

## Tracing

Spans should be created for meaningful actions within an application like button clicks, API calls, and function calls.
Use the `Sentry.startSpan` function to create a span.
Child spans can exist within a parent span.

### Custom Span Instrumentation in Component Actions

The `name` and `op` properties should be meaningful for the activities in the call.
Attach attributes based on relevant information and metrics from the request.

```typescript
function TestComponent() {
  const handleTestButtonClick = () => {
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";

        span.setAttribute("config", value);
        span.setAttribute("metric", metric);

        doSomething();
      },
    );
  };

  return (
    <button type="button" onClick={handleTestButtonClick}>
      Test Sentry
    </button>
  );
}
```

### Custom Span Instrumentation in API Calls

The `name` and `op` properties should be meaningful for the activities in the call.
Attach attributes based on relevant information and metrics from the request.

```typescript
async function fetchUserData(userId: string) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    },
  );
}
```

## Logging

Import Sentry using `import * as Sentry from "@sentry/nextjs"`.
Enable logging in Sentry using `Sentry.init({ enableLogs: true })`.
Reference the logger using `const { logger } = Sentry`.

Sentry offers a `consoleLoggingIntegration` that can be used to log specific console error types automatically without instrumenting individual logger calls.

### Configuration

In Next.js the configuration is centralized in `apps/web/src/lib/sentry.config.ts`. This file exports shared config used by:
- Client-side: `src/instrumentation-client.ts`
- Server-side: `sentry.server.config.ts`
- Edge: `sentry.edge.config.ts`

Initialization does not need to be repeated in other files. Use `import * as Sentry from "@sentry/nextjs"` to reference Sentry functionality elsewhere.

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SENTRY_ENABLED` | Enable/disable Sentry (`true`/`false`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry project DSN |
| `SENTRY_TRACES_SAMPLE_RATE` | Trace sampling rate (0.0 to 1.0) |
| `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | Session replay rate |
| `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | Error replay rate |

#### Disabling Sentry Locally

Set `NEXT_PUBLIC_SENTRY_ENABLED=false` in `.env.local` to disable Sentry in development.

#### Logger Integration

```typescript
Sentry.init({
  ...baseSentryConfig,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
});
```

### Logger Examples

Use `logger.fmt` as a template literal function to bring variables into structured logs.

```typescript
const { logger } = Sentry;

logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
});
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
});
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
});
```
