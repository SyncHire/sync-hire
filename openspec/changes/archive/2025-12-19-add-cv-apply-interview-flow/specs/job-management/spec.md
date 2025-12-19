# Job Management - Delta Spec

## ADDED Requirements

### Requirement: Job Application API Endpoint

The system SHALL provide a RESTful API endpoint for candidates to apply their CV to a specific job position, triggering personalized interview question generation.

#### Scenario: POST /api/jobs/apply - Apply CV to job

- **WHEN** a client sends POST request to /api/jobs/apply
- **THEN** the request body SHALL contain cvId (string, required) and jobId (string, required)
- **AND** the system SHALL validate both fields are present and non-empty
- **AND** the system SHALL verify the CV extraction exists for cvId
- **AND** the system SHALL verify the job extraction exists for jobId
- **AND** if validation passes, the system SHALL proceed to question generation
- **AND** if validation fails, the system SHALL return 400 with error details

#### Scenario: Successful application with question generation

- **WHEN** the apply request is valid and questions are generated
- **THEN** the system SHALL return 200 status
- **AND** the response body SHALL be: { data: { id, cvId, jobId, questionCount, customQuestionCount, suggestedQuestionCount, cached } }
- **AND** the "id" SHALL be the combined hash (SHA256 of cvId + jobId)
- **AND** the "cached" boolean SHALL indicate if questions were retrieved from cache
- **AND** the response SHALL be returned within 3 seconds

#### Scenario: Apply with cached questions (duplicate application)

- **WHEN** a candidate applies to the same job with the same CV again
- **THEN** the system SHALL check for existing questions file
- **AND** if found, the system SHALL return cached questions without calling Gemini
- **AND** the response SHALL include cached: true
- **AND** the response time SHALL be < 500ms
- **AND** the status code SHALL be 200

#### Scenario: Missing CV extraction error

- **WHEN** the cvId does not match any stored CV extraction
- **THEN** the system SHALL return 400 status
- **AND** the error response SHALL be: { error: "CV not found", message: "No CV extraction found for ID: {cvId}" }
- **AND** the system SHALL NOT proceed to question generation

#### Scenario: Missing job extraction error

- **WHEN** the jobId does not match any stored job extraction
- **THEN** the system SHALL return 400 status
- **AND** the error response SHALL be: { error: "Job not found", message: "No job extraction found for ID: {jobId}" }
- **AND** the system SHALL NOT proceed to question generation

#### Scenario: Gemini API failure during application

- **WHEN** the Gemini API call fails during question generation
- **THEN** the system SHALL return 500 status
- **AND** the error response SHALL be: { error: "Question generation failed", message: "Failed to generate interview questions. Please try again." }
- **AND** the system SHALL log the error details for debugging
- **AND** no questions file SHALL be created

#### Scenario: File write failure

- **WHEN** question generation succeeds but file write fails
- **THEN** the system SHALL return 500 status
- **AND** the error response SHALL be: { error: "Storage failure", message: "Failed to save interview questions." }
- **AND** the system SHALL log the error details
- **AND** the candidate can retry the application

### Requirement: Interview Questions Storage Structure

The system SHALL define a standardized JSON structure for storing interview questions that separates HR custom questions from AI-generated suggested questions.

#### Scenario: Interview questions JSON file structure

- **WHEN** questions are stored in /data/interview-questions/{hash}.json
- **THEN** the root object SHALL have three properties: metadata, customQuestions, suggestedQuestions
- **AND** the file SHALL be valid JSON
- **AND** the file SHALL be human-readable with indentation
- **AND** the file SHALL use UTF-8 encoding

#### Scenario: Metadata structure

- **WHEN** the questions file is created
- **THEN** the metadata object SHALL include:
  - cvId (string): Hash of the uploaded CV
  - jobId (string): Identifier of the job position
  - generatedAt (string): ISO 8601 timestamp of creation
  - questionCount (number): Total count of all questions (custom + suggested)
  - customQuestionCount (number): Count of HR custom questions
  - suggestedQuestionCount (number): Count of AI-generated questions

#### Scenario: Custom questions structure

- **WHEN** storing HR custom questions
- **THEN** the customQuestions array SHALL include all questions from job posting
- **AND** each custom question object SHALL include:
  - id (string): Unique question identifier
  - type (string): Question type enum (SHORT_ANSWER, LONG_ANSWER, MULTIPLE_CHOICE, SCORED)
  - content (string): The question text
  - options (array | null): For MULTIPLE_CHOICE, array of { label: string } objects
  - scoringConfig (object | null): For SCORED, { type: string, min: number, max: number }
  - required (boolean): Whether question is mandatory
  - order (number): Display order in the interview

#### Scenario: Suggested questions structure

- **WHEN** storing AI-generated questions
- **THEN** the suggestedQuestions array SHALL include all Gemini-generated questions
- **AND** each suggested question object SHALL include:
  - content (string): The question text
  - reason (string): Explanation of why this question is relevant
  - category (string): Question category (technical, behavioral, experience, problem-solving)

#### Scenario: Example JSON structure

- **WHEN** a questions file is created
- **THEN** it SHALL follow this structure:
```json
{
  "metadata": {
    "cvId": "abc123hash",
    "jobId": "job_456",
    "generatedAt": "2025-01-15T10:30:00.000Z",
    "questionCount": 9,
    "customQuestionCount": 3,
    "suggestedQuestionCount": 6
  },
  "customQuestions": [
    {
      "id": "q1",
      "type": "SHORT_ANSWER",
      "content": "What is your notice period?",
      "options": null,
      "scoringConfig": null,
      "required": true,
      "order": 1
    }
  ],
  "suggestedQuestions": [
    {
      "content": "Can you describe your experience with React and TypeScript?",
      "reason": "Candidate has 3 years of React experience and this role requires TypeScript expertise",
      "category": "technical"
    }
  ]
}
```

### Requirement: Storage Interface Methods for Interview Questions

The system SHALL extend the storage interface to support saving, retrieving, and checking for interview questions.

#### Scenario: Save interview questions

- **WHEN** calling storage.saveInterviewQuestions(hash, data)
- **THEN** the method SHALL accept a hash string and questions data object
- **AND** the method SHALL write to /data/interview-questions/{hash}.json
- **AND** the method SHALL create the directory if it doesn't exist
- **AND** the method SHALL write atomically to prevent corruption
- **AND** the method SHALL return a promise that resolves on success

#### Scenario: Get interview questions

- **WHEN** calling storage.getInterviewQuestions(hash)
- **THEN** the method SHALL read from /data/interview-questions/{hash}.json
- **AND** the method SHALL parse the JSON content
- **AND** the method SHALL return the full questions object
- **AND** the method SHALL return null if file doesn't exist
- **AND** the method SHALL throw error if file is corrupted

#### Scenario: Check if interview questions exist

- **WHEN** calling storage.hasInterviewQuestions(hash)
- **THEN** the method SHALL check if /data/interview-questions/{hash}.json exists
- **AND** the method SHALL return a boolean (true if exists, false otherwise)
- **AND** the method SHALL NOT read the file contents
- **AND** the method SHALL be fast (< 10ms)

### Requirement: Interview Start Integration with Questions

The system SHALL update the interview start flow to load both custom and suggested questions from storage when a candidate begins an interview.

#### Scenario: Load questions on interview start

- **WHEN** a candidate clicks "Start Interview" on an applied job
- **THEN** the system SHALL compute the hash from cvId + jobId
- **AND** the system SHALL call storage.getInterviewQuestions(hash)
- **AND** if questions exist, the system SHALL merge customQuestions + suggestedQuestions
- **AND** if questions don't exist, the system SHALL use only customQuestions from job posting
- **AND** the merged questions SHALL be passed to the interview agent

#### Scenario: Merge custom and suggested questions

- **WHEN** loading questions for interview
- **THEN** the system SHALL create a combined array
- **AND** custom questions SHALL appear first (ordered by their "order" field)
- **AND** suggested questions SHALL appear after custom questions
- **AND** each question SHALL be assigned a unique index in the combined list
- **AND** the total count SHALL be customQuestionCount + suggestedQuestionCount

#### Scenario: Handle missing questions file

- **WHEN** interview starts but questions file doesn't exist
- **THEN** the system SHALL log a warning
- **AND** the system SHALL fall back to using only custom questions from job posting
- **AND** the interview SHALL proceed normally
- **AND** the candidate SHALL NOT see an error

#### Scenario: Pass questions to interview agent

- **WHEN** questions are loaded and merged
- **THEN** the system SHALL format questions for the interview agent
- **AND** the system SHALL include question content and type
- **AND** the system SHALL preserve question order
- **AND** the system SHALL pass the complete question list to the agent API

### Requirement: Question File Hash Generation

The system SHALL use a consistent hashing algorithm to generate unique identifiers for interview questions based on CV and job combination.

#### Scenario: Generate combined hash

- **WHEN** creating a hash for interview questions
- **THEN** the system SHALL concatenate cvId + jobId (no separator)
- **AND** the system SHALL apply SHA256 hashing algorithm
- **AND** the system SHALL convert the hash to hexadecimal string
- **AND** the resulting hash SHALL be 64 characters long
- **AND** the hash SHALL be deterministic (same inputs = same hash)

#### Scenario: Same CV and job produce same hash

- **WHEN** the same candidate applies to the same job multiple times
- **THEN** the system SHALL generate identical hash values
- **AND** the system SHALL find the existing questions file
- **AND** no duplicate files SHALL be created

#### Scenario: Different CV or job produce different hash

- **WHEN** different candidates apply to the same job OR same candidate applies to different jobs
- **THEN** the system SHALL generate different hash values
- **AND** separate questions files SHALL be created
- **AND** there SHALL be no collision between different applications

### Requirement: Directory Structure for Question Storage

The system SHALL maintain a dedicated directory for storing interview questions with proper organization and permissions.

#### Scenario: Create interview-questions directory

- **WHEN** the application initializes
- **THEN** the /data/interview-questions/ directory SHALL exist
- **AND** the directory SHALL have read/write permissions for the application
- **AND** the directory SHALL be created automatically if missing
- **AND** the directory SHALL be at the same level as /data/cv-extractions/ and /data/jd-extractions/

#### Scenario: File naming convention

- **WHEN** storing interview questions
- **THEN** files SHALL be named: {hash}.json
- **AND** the hash SHALL be the SHA256 of cvId + jobId
- **AND** the file extension SHALL be .json
- **AND** no subdirectories SHALL be created

#### Scenario: File organization

- **WHEN** multiple candidates apply to multiple jobs
- **THEN** all questions files SHALL be stored in the root /data/interview-questions/ directory
- **AND** files SHALL be organized only by hash (flat structure)
- **AND** there SHALL be no nested folders
- **AND** file listing SHALL be efficient (< 100ms for 1000 files)
