# @sync-hire/processor

Express.js backend service responsible for AI-powered document processing. It handles Job Description (JD) and CV extraction using a LangGraph pipeline and Gemini 2.5.

## Architecture

- **Framework**: Express 5.x
- **Language**: TypeScript (ES2022 / NodeNext)
- **Validation**: Zod (Env vars & Inputs)
- **Logging**: Winston
- **Security**: Helmet & CORS

## Setup

1. **Environment Variables**:
   Copy `.env.example` to `.env` in the root (or ensure root `.env` is loaded).
   ```env
   PORT=3001
   GEMINI_API_KEY=your_key_here
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

## Scripts

```bash
# Start in development mode (hot reload)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## API Endpoints

### `GET /health`
Returns service status and uptime.
```json
{
  "status": "ok",
  "service": "processor",
  "version": "0.1.0"
}
```

*(More endpoints coming in Phase 4)*
