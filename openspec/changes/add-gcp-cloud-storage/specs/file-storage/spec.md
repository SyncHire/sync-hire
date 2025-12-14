## ADDED Requirements

### Requirement: GCP Cloud Storage Integration

The system SHALL support uploading files to GCP Cloud Storage buckets for production deployments.

#### Scenario: Upload CV file to GCS

- **WHEN** a CV file is uploaded via the API
- **AND** `USE_CLOUD_STORAGE` is set to `true`
- **THEN** the file SHALL be uploaded to the configured GCS bucket
- **AND** the database SHALL store the GCS URL in `CVUpload.fileUrl`

#### Scenario: Upload JD file to GCS

- **WHEN** a job description file is uploaded via the API
- **AND** `USE_CLOUD_STORAGE` is set to `true`
- **THEN** the file SHALL be uploaded to the configured GCS bucket
- **AND** the database SHALL store the GCS URL in `Job.jdFileUrl`

### Requirement: Cloud Storage Provider Abstraction

The system SHALL provide a storage provider interface that supports both local and cloud storage implementations.

#### Scenario: Development mode with local storage

- **WHEN** `USE_CLOUD_STORAGE` is set to `false`
- **THEN** files SHALL be stored in the local `/data` directory
- **AND** the system SHALL return local file paths

#### Scenario: Production mode with GCS

- **WHEN** `USE_CLOUD_STORAGE` is set to `true`
- **AND** GCS credentials are configured
- **THEN** files SHALL be uploaded to GCP Cloud Storage
- **AND** the system SHALL return GCS public URLs

### Requirement: GCS Client Singleton

The system SHALL provide a singleton GCS client that persists across hot reloads in development.

#### Scenario: Client initialization

- **WHEN** the GCS client is first accessed
- **THEN** a single Storage instance SHALL be created
- **AND** subsequent accesses SHALL return the same instance

## MODIFIED Requirements

### Requirement: CV File Management

The system SHALL manage uploaded CV files using the same file management patterns as job descriptions.

#### Scenario: Original CV file storage

- **WHEN** a CV file is uploaded for extraction
- **THEN** the system SHALL store the original file in cloud storage (production) or local directory (development)
- **AND** SHALL use hash-based filenames for deduplication
- **AND** SHALL store the file URL in the database

#### Scenario: File access and retrieval

- **WHEN** accessing stored CV data or files
- **THEN** the system SHALL use URLs stored in the database
- **AND** SHALL handle missing files gracefully
