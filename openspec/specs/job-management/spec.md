# job-management Specification

## Purpose
TBD - created by archiving change add-ai-job-creation-workflow. Update Purpose after archive.
## Requirements
### Requirement: Job Description Upload

The system SHALL provide a file upload interface that accepts PDF job description documents up to 10MB in size.

#### Scenario: Successful PDF upload
- **WHEN** HR user uploads a valid PDF job description (< 10MB)
- **THEN** the system sends the PDF directly to Gemini API for processing
- **THEN** the system extracts structured job data and displays it for review
- **THEN** the system stores the original file and extracted data in local storage

#### Scenario: File size limit exceeded
- **WHEN** HR user attempts to upload a file > 10MB
- **THEN** the system displays error message "File size must be under 10MB"
- **THEN** the upload is rejected and user can retry

#### Scenario: Unsupported file format
- **WHEN** HR user uploads a file that is not PDF
- **THEN** the system displays error message "Unsupported file type. Only PDF files are accepted"
- **THEN** the upload is rejected

### Requirement: AI Job Description Extraction

The system SHALL use Gemini 2.5 Flash to automatically extract structured job data directly from PDF files using inline PDF data processing, including title, responsibilities, requirements, seniority level, location, and employment type.

#### Scenario: Successful extraction with complete data
- **WHEN** job description text is sent to Gemini API
- **THEN** the system receives structured JSON with fields: title, responsibilities[], requirements[], seniority, location, employmentType
- **THEN** the system populates editable form fields with extracted data
- **THEN** all extracted sections are highlighted for user review

#### Scenario: Extraction with missing fields
- **WHEN** job description lacks certain fields (e.g., no salary mentioned)
- **THEN** the system extracts available fields successfully
- **THEN** the system leaves missing fields empty for manual entry
- **THEN** the system highlights which fields need manual input

#### Scenario: Extraction failure
- **WHEN** Gemini API returns error or timeout
- **THEN** the system displays error message "AI extraction failed. Please enter job details manually"
- **THEN** the system provides empty form fields for manual entry
- **THEN** the original text is preserved in a reference panel

### Requirement: Editable Extracted Data

The system SHALL display all AI-extracted job data in editable form fields, allowing HR users to review and modify any field before saving.

#### Scenario: Edit extracted title
- **WHEN** user clicks on extracted job title field
- **THEN** the field becomes editable
- **THEN** user can modify the title text
- **THEN** changes are reflected in real-time preview

#### Scenario: Edit responsibilities list
- **WHEN** user views extracted responsibilities
- **THEN** each responsibility is displayed as editable list item
- **THEN** user can add, remove, or modify individual items
- **THEN** user can reorder items via drag-and-drop

#### Scenario: Edit requirements list
- **WHEN** user views extracted requirements
- **THEN** each requirement is displayed as editable list item
- **THEN** user can add, remove, or modify individual items
- **THEN** user can reorder items via drag-and-drop

#### Scenario: Save edited extraction
- **WHEN** user finishes editing extracted data
- **THEN** user clicks "Continue" button
- **THEN** the system validates all required fields are filled
- **THEN** the system proceeds to AI suggestions step

### Requirement: AI-Driven Job Description Improvements

The system SHALL generate AI-powered improvement suggestions for job descriptions, categorized by improvement type (inclusiveness, clarity, skill alignment, seniority), and allow users to accept or reject suggestions individually or in bulk.

#### Scenario: Generate improvement suggestions
- **WHEN** user completes extraction review and clicks "Get AI Suggestions"
- **THEN** the system sends job description to Gemini API with improvement prompt
- **THEN** the system receives 3-5 suggestions per section with context tags
- **THEN** the system displays suggestions grouped by category (Inclusiveness, Clarity, Skills, Seniority)

#### Scenario: Accept individual suggestion
- **WHEN** user clicks "Accept" on a single suggestion
- **THEN** the system applies the suggested change to the job description
- **THEN** the suggestion is marked as accepted with checkmark icon
- **THEN** the original text is preserved in version history

#### Scenario: Reject individual suggestion
- **WHEN** user clicks "Reject" or "X" on a suggestion
- **THEN** the suggestion is removed from view
- **THEN** the original text remains unchanged
- **THEN** the rejection is logged (not applied)

#### Scenario: Accept all suggestions in a category
- **WHEN** user clicks "Accept All" for a category (e.g., Inclusiveness)
- **THEN** all suggestions in that category are applied to job description
- **THEN** all suggestions are marked as accepted
- **THEN** the changes are reflected in the preview

#### Scenario: Skip AI suggestions
- **WHEN** user clicks "Skip Suggestions" or "Continue Without Changes"
- **THEN** the system preserves original job description text
- **THEN** no AI suggestions are applied
- **THEN** the system proceeds to custom questions step

#### Scenario: Suggestion context tags
- **WHEN** suggestions are displayed
- **THEN** each suggestion shows a colored tag indicating type:
  - "More Inclusive" (green tag) for gender-neutral language, bias reduction
  - "Increased Clarity" (blue tag) for improved readability, specificity
  - "Better Skills" (purple tag) for skill alignment, technical accuracy
  - "Seniority Match" (orange tag) for level-appropriate expectations

### Requirement: Custom Screening Questions

The system SHALL provide a question builder interface that supports multiple question types (short answer, long answer, multiple choice, scored), allows reordering, marking as mandatory, and provides preview mode.

#### Scenario: Add short answer question
- **WHEN** user clicks "Add Question" and selects "Short Answer" type
- **THEN** the system creates a new question with text input field
- **THEN** user can enter question text (e.g., "What is your notice period?")
- **THEN** user can toggle "Required" checkbox
- **THEN** the question is added to the questions list

#### Scenario: Add long answer question
- **WHEN** user clicks "Add Question" and selects "Long Answer" type
- **THEN** the system creates a new question with textarea field
- **THEN** user can enter question text (e.g., "Describe your experience with React")
- **THEN** user can toggle "Required" checkbox
- **THEN** the question is added to the questions list

#### Scenario: Add multiple choice question
- **WHEN** user clicks "Add Question" and selects "Multiple Choice" type
- **THEN** the system creates a new question with option builder
- **THEN** user can enter question text
- **THEN** user can add 2-10 choice options (text input per option)
- **THEN** user can remove or reorder options
- **THEN** user can toggle "Required" checkbox

#### Scenario: Add scored question
- **WHEN** user clicks "Add Question" and selects "Scored" type
- **THEN** the system creates a new question with scoring configuration
- **THEN** user can enter question text
- **THEN** user can select scoring type: 1-5 scale, 1-10 scale, Yes/No, Custom range
- **THEN** user can toggle "Required" checkbox

#### Scenario: Reorder questions via drag-and-drop
- **WHEN** user drags a question card by the handle icon
- **THEN** the question can be dropped in a new position in the list
- **THEN** the system updates the order field for all questions
- **THEN** the preview reflects the new question order

#### Scenario: Delete a question
- **WHEN** user clicks trash icon on a question card
- **THEN** the system shows confirmation dialog "Delete this question?"
- **THEN** if user confirms, the question is removed from the list
- **THEN** remaining questions maintain their order

#### Scenario: Preview candidate experience
- **WHEN** user clicks "Preview" button in question builder
- **THEN** the system displays a modal showing candidate view
- **THEN** all questions are rendered as candidates will see them
- **THEN** required questions show red asterisk (*)
- **THEN** user can interact with form controls to test UX

### Requirement: Job Creation Stepper Flow

The system SHALL provide a multi-step wizard interface that guides HR users through job creation: Upload JD → Review Extraction → AI Suggestions → Custom Questions → Preview & Publish.

#### Scenario: Navigate forward through steps
- **WHEN** user completes step 1 (Upload JD) and clicks "Continue"
- **THEN** the system validates required data for current step
- **THEN** the system advances to step 2 (Review Extraction)
- **THEN** the progress indicator updates to show current step
- **THEN** previous step data is preserved

#### Scenario: Navigate backward through steps
- **WHEN** user is on step 3 (AI Suggestions) and clicks "Back"
- **THEN** the system returns to step 2 (Review Extraction)
- **THEN** all previously entered data is preserved
- **THEN** the progress indicator updates

#### Scenario: Save draft at any step
- **WHEN** user clicks "Save Draft" button at any step
- **THEN** the system saves all entered data to database with status "DRAFT"
- **THEN** the system displays success message "Draft saved"
- **THEN** user can exit and resume later

#### Scenario: Resume draft job creation
- **WHEN** user selects a draft job from jobs list
- **THEN** the system loads the stepper at the last completed step
- **THEN** all previously entered data is pre-filled
- **THEN** user can continue from where they left off

#### Scenario: Complete job creation
- **WHEN** user reaches final step (Preview & Publish) and clicks "Publish"
- **THEN** the system validates all required fields are complete
- **THEN** the system creates JobPosting record with status "ACTIVE"
- **THEN** the system creates associated CustomQuestion records
- **THEN** the system creates JobDescriptionVersion record with AI history
- **THEN** the system redirects to job detail page with success message

### Requirement: Light Theme Design System

The system SHALL implement a clean, professional light theme design with high contrast text, subtle shadows, soft borders, minimal iconography, and blue accent colors.

#### Scenario: Component styling standards
- **WHEN** rendering job creation UI components
- **THEN** backgrounds use white (#ffffff) or light gray (#f9fafb)
- **THEN** text uses dark colors (#1a1a1a for primary, #6b7280 for secondary)
- **THEN** borders use 1px solid with #e5e7eb color
- **THEN** shadows use subtle elevation (shadow-sm: 0 1px 2px rgba(0,0,0,0.05))

#### Scenario: Accent color usage
- **WHEN** rendering primary actions and interactive elements
- **THEN** buttons use blue-600 (#2563eb) background
- **THEN** hover states use blue-700 (#1d4ed8)
- **THEN** focus rings use blue-500 (#3b82f6) with 2px width
- **THEN** links use blue-600 (#2563eb) text color

#### Scenario: Card component styling
- **WHEN** rendering card containers (extraction review, suggestions, questions)
- **THEN** cards have white background with 1px border
- **THEN** cards have rounded-xl corners (border-radius: 0.75rem)
- **THEN** cards have p-6 padding (1.5rem)
- **THEN** cards have shadow-sm elevation
- **THEN** hover states increase shadow to shadow-md

#### Scenario: Icon usage
- **WHEN** rendering UI elements
- **THEN** icons use Lucide icon library
- **THEN** icons are used sparingly (primary actions, navigation, status indicators)
- **THEN** icon size is h-4 w-4 (16px) for buttons, h-5 w-5 (20px) for headings
- **THEN** icon color matches adjacent text color

#### Scenario: Spacing and layout
- **WHEN** rendering page layout
- **THEN** sections use gap-6 (1.5rem) or gap-8 (2rem) spacing
- **THEN** form fields use gap-4 (1rem) spacing
- **THEN** max-width is constrained to max-w-5xl (64rem) for readability
- **THEN** generous whitespace is used to avoid visual clutter

### Requirement: Job Description Version History

The system SHALL store the original uploaded job description, AI extraction data, AI suggestions, and user-accepted changes in a JobDescriptionVersion record linked to each job posting.

#### Scenario: Create version record on job creation
- **WHEN** user publishes a new job posting
- **THEN** the system creates a JobDescriptionVersion record
- **THEN** originalText field stores the uploaded/pasted JD text
- **THEN** extractedData field stores AI extraction JSON
- **THEN** aiSuggestions field stores all generated suggestions with tags
- **THEN** acceptedChanges field stores user-accepted improvements
- **THEN** documentUrl field stores Supabase Storage URL of uploaded file (if applicable)

#### Scenario: View version history
- **WHEN** user views job detail page
- **THEN** user can click "View AI History" link
- **THEN** the system displays original vs. improved comparison
- **THEN** accepted suggestions are highlighted with tags
- **THEN** original uploaded document can be downloaded

### Requirement: Custom Question Data Model

The system SHALL store custom screening questions with support for multiple question types, scoring configuration, required flags, and ordering.

#### Scenario: Store short/long answer question
- **WHEN** user creates a short or long answer question
- **THEN** the system creates CustomQuestion record with type SHORT_ANSWER or LONG_ANSWER
- **THEN** content field stores question text
- **THEN** options field is null
- **THEN** scoringConfig field is null
- **THEN** required field stores boolean
- **THEN** order field stores position in list

#### Scenario: Store multiple choice question
- **WHEN** user creates a multiple choice question
- **THEN** the system creates CustomQuestion record with type MULTIPLE_CHOICE
- **THEN** content field stores question text
- **THEN** options field stores JSON array of choice objects: [{ label: "Option 1" }, { label: "Option 2" }]
- **THEN** scoringConfig field is null
- **THEN** required field stores boolean

#### Scenario: Store scored question
- **WHEN** user creates a scored question
- **THEN** the system creates CustomQuestion record with type SCORED
- **THEN** content field stores question text
- **THEN** options field is null
- **THEN** scoringConfig field stores JSON: { type: "scale", min: 1, max: 5 } or { type: "yesno" }
- **THEN** required field stores boolean

#### Scenario: Retrieve questions for job posting
- **WHEN** system loads job detail or candidate application form
- **THEN** the system queries CustomQuestion records ordered by order field ASC
- **THEN** all question data including type, options, scoring is returned
- **THEN** questions are rendered according to their type

### Requirement: API Endpoints for Job Creation

The system SHALL provide RESTful API endpoints for JD extraction, AI suggestions, job creation, and custom question management.

#### Scenario: POST /api/jobs/extract-jd - Extract job description
- **WHEN** client sends POST request with PDF file upload
- **THEN** the system extracts text from PDF using Gemini API
- **THEN** the system calls Gemini API with extraction prompt to get structured data (title, responsibilities, requirements, seniority, location, employmentType)
- **THEN** the system generates AI suggestions and interview questions in a single consolidated API call
- **THEN** the system returns 200 with { data: { id, extractedData, aiSuggestions, aiQuestions, cached } }
- **THEN** if extraction fails, returns 500 with { error: "Extraction failed" }

#### Scenario: POST /api/jobs/create - Create job posting
- **WHEN** client sends POST request with job data and custom questions
- **THEN** the system validates required fields (title, description, location)
- **THEN** the system creates JobPosting record with status "ACTIVE" or "DRAFT"
- **THEN** the system creates CustomQuestion records for each question
- **THEN** the system creates JobDescriptionVersion record
- **THEN** the system returns 201 with { data: { id, title, ... } }
- **THEN** if validation fails, returns 400 with field errors

#### Scenario: GET /api/jobs/:id/questions - Retrieve custom questions
- **WHEN** client sends GET request for job questions
- **THEN** the system queries CustomQuestion records for jobPostingId
- **THEN** the system orders results by order field ASC
- **THEN** the system returns 200 with { data: [{ id, type, content, options, scoringConfig, required, order }] }

#### Scenario: PUT /api/jobs/:id/questions - Update question order
- **WHEN** client sends PUT request with updated question order array
- **THEN** the system updates order field for each question
- **THEN** the system returns 200 with { data: { updated: true } }

#### Scenario: DELETE /api/jobs/:id/questions/:questionId - Delete question
- **WHEN** client sends DELETE request for specific question
- **THEN** the system deletes CustomQuestion record
- **THEN** the system reorders remaining questions
- **THEN** the system returns 200 with { data: { deleted: true } }

### Requirement: Form Validation

The system SHALL validate all job creation inputs and provide clear, actionable error messages for invalid data.

#### Scenario: Validate required fields on job creation
- **WHEN** user attempts to publish job without required fields
- **THEN** the system checks title, description, location, employmentType are not empty
- **THEN** if any field is missing, displays inline error "This field is required"
- **THEN** focus moves to first invalid field
- **THEN** publish button remains disabled until valid

#### Scenario: Validate custom question content
- **WHEN** user saves a custom question
- **THEN** the system validates question text is not empty
- **THEN** for multiple choice, validates at least 2 options are provided
- **THEN** for scored questions, validates scoringConfig is valid
- **THEN** if invalid, displays error message and prevents save

#### Scenario: Validate file upload size and format
- **WHEN** user uploads a file
- **THEN** the system checks file size <= 10MB
- **THEN** the system checks file extension is .pdf, .docx, or .txt
- **THEN** if invalid, displays error toast with specific issue
- **THEN** file is not uploaded

### Requirement: Loading States and User Feedback

The system SHALL provide clear loading indicators and success/error feedback for all async operations (file upload, AI extraction, AI suggestions, job creation).

#### Scenario: File upload loading state
- **WHEN** user uploads a file
- **THEN** the system displays progress bar showing upload percentage
- **THEN** upload button is disabled during upload
- **THEN** on success, displays checkmark icon and "Upload complete"
- **THEN** on error, displays error message and "Retry" button

#### Scenario: AI extraction loading state
- **WHEN** extraction API call is in progress
- **THEN** the system displays spinner with text "Analyzing job description..."
- **THEN** form fields are disabled
- **THEN** on success, smoothly animates extracted data into fields
- **THEN** on error, displays error message and manual entry option

#### Scenario: AI suggestions loading state
- **WHEN** suggestions API call is in progress
- **THEN** the system displays spinner with text "Generating AI improvements..."
- **THEN** suggestion panel shows skeleton loaders
- **THEN** on success, animates suggestions into view
- **THEN** on error, displays error and "Skip" option

#### Scenario: Job creation loading state
- **WHEN** job creation API call is in progress
- **THEN** the system displays spinner on "Publish" button
- **THEN** all form inputs are disabled
- **THEN** on success, displays success toast "Job posted successfully!" and redirects
- **THEN** on error, displays error toast with message and re-enables form

#### Scenario: Success toast notifications
- **WHEN** async operation succeeds (save draft, publish job, update question)
- **THEN** the system displays green toast notification at top-right
- **THEN** toast shows checkmark icon and success message
- **THEN** toast auto-dismisses after 3 seconds

#### Scenario: Error toast notifications
- **WHEN** async operation fails
- **THEN** the system displays red toast notification at top-right
- **THEN** toast shows error icon and error message
- **THEN** toast persists until user dismisses or 5 seconds

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

