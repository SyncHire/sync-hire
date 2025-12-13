# Multi-stage build using uv for fast Python package installation
# Pin specific uv version for reproducible builds
FROM ghcr.io/astral-sh/uv:0.5.11 AS uv

# Build stage
FROM python:3.13-slim AS builder

# Copy uv binary from official image
COPY --from=uv /uv /usr/local/bin/uv

# Set UV environment variables for optimal build performance
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# Set working directory
WORKDIR /app

# Install dependencies first (cached separately from code changes)
# Using cache mounts for faster rebuilds and bind mounts for dependency files
# Use CPU-only PyTorch for Cloud Run (no GPU support)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --no-dev --no-install-project \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Copy application code
COPY pyproject.toml uv.lock ./
COPY *.py ./
COPY agents/ ./agents/
COPY processors/ ./processors/
COPY *.sh *.md ./

# Install project into virtual environment
RUN uv sync --no-dev --no-editable \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Runtime stage
FROM python:3.13-slim

# Create non-root user for security
RUN useradd -m -u 1000 appuser

# Copy virtual environment from builder
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv

# Copy application code
COPY --from=builder --chown=appuser:appuser /app /app

# Set working directory
WORKDIR /app

# Make start script executable
RUN chmod +x /app/start.sh

# Set environment variables
# Add .venv/bin to PATH to use virtual environment
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Switch to non-root user
USER appuser

# Expose port (Cloud Run uses 8080 by default)
EXPOSE 8080

# Run the application using start script
CMD ["/app/start.sh"]
