## ADDED Requirements

### Requirement: CV Data Extraction with AI
The system SHALL use AI services to extract structured data from uploaded CV files following the same patterns as job description extraction.

#### Scenario: CV processing with Gemini API
- **WHEN** a CV file is submitted for extraction
- **THEN** the system shall process the PDF using the Gemini AI service
- **AND** shall use the same backend processing patterns as JD extraction
- **AND** shall extract structured CV data including personal information, experience, education, and skills

#### Scenario: Structured output validation
- **WHEN** the AI service returns CV extraction data
- **THEN** the system shall validate the response using Zod schemas
- **AND** shall handle null values gracefully
- **AND** shall transform the data to match expected interfaces
- **AND** shall store only validated and cleaned data

### Requirement: CV Extraction Prompts
The system SHALL use specialized prompts for CV extraction that ensure comprehensive and accurate data extraction.

#### Scenario: CV-specific extraction prompt
- **WHEN** processing CV files with the AI service
- **THEN** the system shall use a CV-optimized extraction prompt
- **AND** shall request specific fields: personalInfo, experience[], education[], skills[], certifications[], languages[], projects[]
- **AND** shall instruct the AI to handle various CV formats and layouts
- **AND** shall request JSON output with consistent schema structure

#### Scenario: Error handling for AI extraction
- **WHEN** the AI service fails to extract CV data
- **THEN** the system shall provide empty structured data as fallback
- **AND** shall log the extraction failure
- **AND** shall allow the job matching process to continue
- **AND** shall not expose extraction errors to users