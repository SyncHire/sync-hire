# ai-integration Specification

## Purpose
TBD - created by archiving change initialize-synchire-monorepo. Update Purpose after archive.
## Requirements
### Requirement: Gemini API Configuration
The system SHALL configure Gemini 2.5 Flash for question generation and CV analysis.

#### Scenario: Generate questions
**Given** Gemini API key is configured
**When** job description is provided
**Then** 30-40 interview questions are generated

### Requirement: OpenAI Realtime Configuration
The system SHALL configure OpenAI gpt-realtime for real-time interviews.

#### Scenario: Conduct interview
**Given** OpenAI gpt-realtime is configured
**When** interview starts
**Then** AI responds to candidate in real-time

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

### Requirement: Personalized Interview Question Generation

The system SHALL use Gemini AI to generate 6-8 personalized interview questions based on a candidate's CV and a specific job description when the candidate applies to a position.

#### Scenario: Generate questions from CV and JD context

- **WHEN** a candidate applies to a job with their CV
- **THEN** the system SHALL retrieve the CV extraction data from storage
- **AND** the system SHALL retrieve the JD extraction data from storage
- **AND** the system SHALL construct a Gemini prompt combining both contexts
- **AND** the system SHALL call Gemini 2.5 Flash API to generate 6-8 questions
- **AND** the system SHALL return structured questions with content, reason, and category

#### Scenario: Successful question generation

- **WHEN** Gemini API returns a successful response
- **THEN** the response SHALL contain an array of 6-8 question objects
- **AND** each question SHALL have a "content" field with the question text
- **AND** each question SHALL have a "reason" field explaining relevance
- **AND** each question SHALL have a "category" field (technical, behavioral, experience, or problem-solving)
- **AND** the system SHALL validate the response using Zod schema
- **AND** the system SHALL return validated questions for storage

#### Scenario: Question generation with missing CV data

- **WHEN** the CV extraction is missing or incomplete
- **THEN** the system SHALL log a warning
- **AND** the system SHALL generate questions using only the JD context
- **AND** the system SHALL include a note in metadata indicating partial context
- **AND** the system SHALL still return 6-8 questions

#### Scenario: Question generation with missing JD data

- **WHEN** the JD extraction is missing or incomplete
- **THEN** the system SHALL log a warning
- **AND** the system SHALL generate generic interview questions
- **AND** the system SHALL include a note in metadata indicating generic questions
- **AND** the system SHALL still return 6-8 questions

#### Scenario: Gemini API failure

- **WHEN** the Gemini API call fails or times out
- **THEN** the system SHALL log the error details
- **AND** the system SHALL return an error response with status 500
- **AND** the error message SHALL be: "Failed to generate interview questions. Please try again."
- **AND** no questions SHALL be stored
- **AND** the candidate SHALL see an error toast with retry option

### Requirement: Question Generation Prompt Engineering

The system SHALL use a structured prompt template that provides clear instructions to Gemini for generating relevant, high-quality interview questions.

#### Scenario: Construct prompt with candidate context

- **WHEN** building the Gemini prompt
- **THEN** the prompt SHALL include candidate's name from CV
- **AND** the prompt SHALL include years of experience
- **AND** the prompt SHALL include top 5-10 skills
- **AND** the prompt SHALL include education background
- **AND** the prompt SHALL include recent projects or work experience (if available)
- **AND** the context SHALL be formatted clearly with section headers

#### Scenario: Construct prompt with job context

- **WHEN** building the Gemini prompt
- **THEN** the prompt SHALL include job title
- **AND** the prompt SHALL include company name
- **AND** the prompt SHALL include required skills from JD
- **AND** the prompt SHALL include key responsibilities from JD
- **AND** the prompt SHALL include seniority level
- **AND** the context SHALL be formatted clearly with section headers

#### Scenario: Specify question generation constraints

- **WHEN** building the Gemini prompt
- **THEN** the prompt SHALL instruct Gemini to generate exactly 6-8 questions
- **AND** the prompt SHALL specify questions should assess fit for the role
- **AND** the prompt SHALL specify questions should leverage candidate's background
- **AND** the prompt SHALL specify questions should cover technical and behavioral aspects
- **AND** the prompt SHALL specify questions should be open-ended
- **AND** the prompt SHALL specify questions should range from easy to challenging

#### Scenario: Request structured JSON output

- **WHEN** building the Gemini prompt
- **THEN** the prompt SHALL request JSON array format
- **AND** the prompt SHALL specify the required fields: content, reason, category
- **AND** the prompt SHALL provide an example question object
- **AND** the prompt SHALL instruct Gemini to return only valid JSON

### Requirement: Question Storage with Metadata

The system SHALL store generated interview questions in a structured JSON format with both custom HR questions and AI-generated suggested questions, along with metadata about the application.

#### Scenario: Store questions with combined hash

- **WHEN** questions are generated successfully
- **THEN** the system SHALL create a combined hash using SHA256(cvId + jobId)
- **AND** the system SHALL create a JSON file at /data/interview-questions/{hash}.json
- **AND** the file SHALL contain metadata, customQuestions, and suggestedQuestions
- **AND** the file SHALL be written atomically to prevent corruption

#### Scenario: Include metadata in storage

- **WHEN** storing questions
- **THEN** the metadata SHALL include cvId (hash from CV upload)
- **AND** the metadata SHALL include jobId (job identifier)
- **AND** the metadata SHALL include generatedAt (ISO timestamp)
- **AND** the metadata SHALL include questionCount (total number of suggested questions)
- **AND** the metadata SHALL include customQuestionCount (number of HR questions)
- **AND** the metadata SHALL include suggestedQuestionCount (number of AI questions)

#### Scenario: Store HR custom questions

- **WHEN** storing questions
- **THEN** the customQuestions array SHALL include all HR-authored questions from job posting
- **AND** each custom question SHALL preserve its type (SHORT_ANSWER, LONG_ANSWER, etc.)
- **AND** each custom question SHALL preserve options, scoringConfig, required flag, and order
- **AND** custom questions SHALL be copied from job posting data

#### Scenario: Store AI-generated suggested questions

- **WHEN** storing questions
- **THEN** the suggestedQuestions array SHALL include all Gemini-generated questions
- **AND** each suggested question SHALL have content, reason, and category fields
- **AND** suggested questions SHALL be stored in the order received from Gemini
- **AND** no additional fields SHALL be added to suggested questions

### Requirement: Question Caching and Retrieval

The system SHALL implement caching to avoid regenerating questions for the same CV and job combination, improving performance and reducing API costs.

#### Scenario: Check for cached questions before generation

- **WHEN** a candidate applies to a job
- **THEN** the system SHALL compute the combined hash (cvId + jobId)
- **AND** the system SHALL check if /data/interview-questions/{hash}.json exists
- **AND** if the file exists, the system SHALL read and return cached questions
- **AND** if the file exists, the system SHALL NOT call Gemini API
- **AND** the response SHALL indicate cached: true

#### Scenario: Return cached questions immediately

- **WHEN** cached questions are found
- **THEN** the system SHALL read the JSON file
- **AND** the system SHALL validate the file structure
- **AND** the system SHALL return the cached data with metadata
- **AND** the response time SHALL be < 100ms (file read only)
- **AND** the response SHALL include original generatedAt timestamp

#### Scenario: Handle corrupted cache files

- **WHEN** a cached file exists but is corrupted or invalid
- **THEN** the system SHALL log a warning about corrupted cache
- **AND** the system SHALL delete the corrupted file
- **AND** the system SHALL regenerate questions by calling Gemini
- **AND** the new questions SHALL be stored in a fresh file

### Requirement: Zod Schema Validation for AI Responses

The system SHALL validate all Gemini API responses using Zod schemas to ensure data quality and type safety.

#### Scenario: Define question response schema

- **WHEN** validating Gemini responses
- **THEN** the system SHALL use a Zod schema for question objects
- **AND** the schema SHALL require "content" field as non-empty string
- **AND** the schema SHALL require "reason" field as non-empty string
- **AND** the schema SHALL require "category" field as enum (technical, behavioral, experience, problem-solving)
- **AND** the schema SHALL validate the response is an array of 6-8 questions

#### Scenario: Handle validation failures

- **WHEN** Gemini response fails Zod validation
- **THEN** the system SHALL log the validation error with details
- **AND** the system SHALL log the raw Gemini response for debugging
- **AND** the system SHALL return an error response with status 500
- **AND** the error message SHALL be: "Invalid question format received from AI. Please try again."
- **AND** no questions SHALL be stored

#### Scenario: Validate and transform response

- **WHEN** Gemini response passes Zod validation
- **THEN** the system SHALL parse the JSON response
- **AND** the system SHALL transform any null values to empty strings
- **AND** the system SHALL ensure all required fields are present
- **AND** the system SHALL return the validated and transformed questions

