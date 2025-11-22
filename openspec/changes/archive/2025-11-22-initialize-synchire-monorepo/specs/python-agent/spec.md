# Spec: Python Agent

**Capability:** `python-agent`
**Status:** Proposed
**Related Capabilities:** `monorepo-foundation` (runs in monorepo), `ai-integration` (uses AI models)

## Overview

Create Python microservice using Vision-Agents framework with uv package manager for real-time AI interview conversations.

## ADDED Requirements

### Requirement: uv Package Management

The system SHALL use uv package manager for fast Python dependency installation.

#### Scenario: Install dependencies with uv

**Given** pyproject.toml defines dependencies
**When** developer runs `uv pip install -r requirements.txt`
**Then** packages install 10-100x faster than pip
**And** global cache is used to save disk space

### Requirement: Vision-Agents Integration

The system SHALL integrate Vision-Agents framework for real-time AI agent functionality.

#### Scenario: Initialize interview agent

**Given** Python agent receives interview invitation
**When** agent initializes
**Then** Vision-Agents connects to Stream Video
**And** OpenAI Realtime API is configured
**And** Agent is ready to conduct interview

### Requirement: Minimal Python Code

The system SHALL keep Python code under 200 lines total.

#### Scenario: Review codebase complexity

**Given** Python agent is implemented
**When** counting lines of code (excluding comments/blanks)
**Then** main.py has less than 100 lines
**And** config.py has less than 50 lines
**And** total executable Python code is under 200 lines

### Requirement: Dockerfile with uv

The system SHALL provide multi-stage Dockerfile using uv for efficient builds.

#### Scenario: Build Docker image

**Given** Dockerfile is configured with uv
**When** developer runs `docker build`
**Then** build completes successfully
**And** uv is used for dependency installation
**And** final image is optimized (multi-stage)

## Configuration

### pyproject.toml:
```toml
[project]
name = "sync-hire-agent"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "vision-agents>=0.3.0",
    "openai>=1.60.0",
    "fastapi>=0.115.0",
    "uvicorn>=0.34.0",
    "python-dotenv>=1.0.0",
    "httpx>=0.28.0",
    "google-cloud-storage>=2.10.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "black>=24.0.0",
    "ruff>=0.8.0",
]
```

### Dockerfile:
```dockerfile
FROM python:3.11-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

FROM python:3.11-slim
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
WORKDIR /app
COPY . .
CMD ["python", "main.py"]
```

## Dependencies

- Python 3.11+
- uv package manager
- vision-agents, openai, fastapi, etc. (see pyproject.toml)

## Validation

- `uv pip install -r requirements.txt` succeeds
- `python main.py` starts agent
- Docker image builds successfully
- Agent responds to HTTP requests

## References

- [Vision-Agents GitHub](https://github.com/GetStream/Vision-Agents)
- [uv Documentation](https://github.com/astral-sh/uv)
