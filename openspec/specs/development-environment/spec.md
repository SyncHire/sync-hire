# development-environment Specification

## Purpose
TBD - created by archiving change initialize-synchire-monorepo. Update Purpose after archive.
## Requirements
### Requirement: Docker Compose Configuration
The system SHALL provide docker-compose.yml for all services.

#### Scenario: Start all services
**Given** Docker Compose is configured
**When** developer runs `docker-compose up`
**Then** web service starts on port 3000
**And** agent service starts on port 8080
**And** postgres service starts on port 5432

