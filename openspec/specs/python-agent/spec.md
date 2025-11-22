# python-agent Specification

## Purpose
TBD - created by archiving change initialize-synchire-monorepo. Update Purpose after archive.
## Requirements
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

