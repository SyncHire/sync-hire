#!/bin/sh
set -e

echo "🚀 Starting SyncHire AI Interview Agent..."
echo "PORT: ${PORT:-8080}"
echo "ENVIRONMENT: ${ENVIRONMENT:-development}"

# Check if required secrets are available
if [ -z "$API_SECRET_KEY" ]; then
    echo "⚠️  Warning: API_SECRET_KEY not set"
fi

if [ -z "$STREAM_API_KEY" ]; then
    echo "⚠️  Warning: STREAM_API_KEY not set"
fi

# Start uvicorn using system python (no venv needed in containers)
echo "Starting uvicorn on 0.0.0.0:${PORT:-8080}..."
exec python -m uvicorn main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8080} \
    --timeout-keep-alive 300 \
    --log-level info
