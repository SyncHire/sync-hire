# Spec: Development Environment

**Capability:** `development-environment`
**Status:** Proposed

## Overview
Configure Docker Compose for running web, agent, and postgres services locally.

## ADDED Requirements

### Requirement: Docker Compose Configuration
The system SHALL provide docker-compose.yml for all services.

#### Scenario: Start all services
**Given** Docker Compose is configured
**When** developer runs `docker-compose up`
**Then** web service starts on port 3000
**And** agent service starts on port 8080
**And** postgres service starts on port 5432
