## ADDED Requirements

### Requirement: CV Extraction Storage
The system SHALL extend the existing file storage system to support CV extraction data alongside job description extraction.

#### Scenario: CV data storage interface
- **WHEN** the system needs to store CV extraction data
- **THEN** the storage interface shall support CV-specific methods
- **AND** shall use the same hash-based deduplication patterns
- **AND** shall store CV data in the `/data/cv-extractions/` directory

#### Scenario: Storage consistency
- **WHEN** implementing CV extraction storage
- **THEN** the system shall follow the same patterns as JD extraction
- **AND** shall use JSON format for extracted CV schemas
- **AND** shall maintain the same file naming conventions
- **AND** shall support the same caching and retrieval operations

### Requirement: CV File Management
The system SHALL manage uploaded CV files using the same file management patterns as job descriptions.

#### Scenario: Original CV file storage
- **WHEN** a CV file is uploaded for extraction
- **THEN** the system shall store the original file in a dedicated directory
- **AND** shall use hash-based filenames for deduplication
- **AND** shall maintain the same file organization as JD uploads

#### Scenario: File access and retrieval
- **WHEN** accessing stored CV data or files
- **THEN** the system shall use the same retrieval patterns as JD data
- **AND** shall support hash-based lookups
- **AND** shall handle missing files gracefully