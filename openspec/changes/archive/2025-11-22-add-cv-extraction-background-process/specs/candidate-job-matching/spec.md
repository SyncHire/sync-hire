## ADDED Requirements

### Requirement: Background CV Extraction
When a candidate uploads a CV, the system SHALL automatically extract structured CV data in the background without blocking the job matching process.

#### Scenario: Successful CV upload with background extraction
- **WHEN** a candidate uploads a CV through the upload interface
- **THEN** the system shall trigger a background CV extraction process
- **AND** the job matching flow shall continue normally without waiting for extraction
- **AND** the extracted CV data shall be stored in the cv-extraction folder

#### Scenario: Background extraction failure handling
- **WHEN** the background CV extraction process fails
- **THEN** the job matching flow shall continue normally
- **AND** the system shall log the extraction failure
- **AND** the user shall not be aware of the extraction failure

#### Scenario: CV extraction caching
- **WHEN** the same CV file is uploaded multiple times
- **THEN** the system shall return cached extraction data
- **AND** shall not reprocess the file with the AI service

### Requirement: CV Data Storage
The system SHALL store extracted CV data in a structured format following the same patterns as job description extraction.

#### Scenario: CV data structure
- **WHEN** CV data is extracted by the AI service
- **THEN** the system shall store personal information, experience, education, skills, certifications, languages, and projects
- **AND** shall use the same hash-based file naming as JD extraction
- **AND** shall store data in JSON format in the cv-extraction folder

#### Scenario: Storage location consistency
- **WHEN** storing CV extraction data
- **THEN** the system shall use the `/data/cv-extractions/` directory
- **AND** shall follow the same directory structure as `/data/jd-extractions/`