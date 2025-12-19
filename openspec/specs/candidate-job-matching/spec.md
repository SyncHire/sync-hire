# candidate-job-matching Specification

## Purpose
TBD - created by archiving change add-cv-upload-job-matching. Update Purpose after archive.
## Requirements
### Requirement: CV Upload Gate

The candidate job listings page MUST require users to upload a CV file before displaying any job listings. The upload interface SHALL be presented as the primary entry point when no CV has been uploaded.

#### Scenario: Initial page load without uploaded CV

- **WHEN** a candidate navigates to the /candidate/jobs page for the first time
- **THEN** the system SHALL display a CV upload interface with clear instructions
- **AND** the system SHALL NOT display any job listings
- **AND** the system SHALL provide a file upload button accepting PDF files

#### Scenario: CV file validation

- **WHEN** a candidate attempts to upload a non-PDF file
- **THEN** the system SHALL reject the file with a clear error message
- **AND** the system SHALL prompt the user to upload a valid PDF file
- **AND** the system SHALL NOT proceed to parsing/matching simulation

### Requirement: CV Parsing Simulation

After a valid CV file is uploaded, the system MUST simulate a CV parsing process with visual feedback to indicate processing is occurring.

#### Scenario: Mock parsing with progress indicator

- **WHEN** a valid PDF CV file is successfully uploaded
- **THEN** the system SHALL display a progress indicator showing "Parsing CV..."
- **AND** the system SHALL simulate processing for 2-3 seconds
- **AND** the system SHALL provide visual feedback (spinner, progress bar, or animated status)
- **AND** the system SHALL transition automatically to job matching simulation upon completion

#### Scenario: Parsing visual feedback

- **WHEN** the CV parsing simulation is in progress
- **THEN** the system SHALL display clear status messages (e.g., "Analyzing your skills and experience...")
- **AND** the system SHALL prevent user interaction with other page elements during processing
- **AND** the system SHALL maintain responsive design on mobile and desktop

### Requirement: Job Matching Simulation

After CV parsing simulation completes, the system MUST simulate matching the uploaded CV to available jobs using mock matching logic.

#### Scenario: Mock job matching process

- **WHEN** CV parsing simulation completes successfully
- **THEN** the system SHALL display a progress indicator showing "Matching you with suitable jobs..."
- **AND** the system SHALL simulate processing for 2-3 seconds
- **AND** the system SHALL use the existing mock job listings data
- **AND** the system SHALL assign mock match percentages to each job (e.g., 85%, 92%, 78%)
- **AND** the system SHALL transition to job listings display upon completion

#### Scenario: Match percentage generation

- **WHEN** the job matching simulation runs
- **THEN** the system SHALL generate realistic match percentages (70-99% range)
- **AND** the system SHALL ensure each job receives a different match percentage
- **AND** the system SHALL maintain consistency (same CV upload should produce same matches)

### Requirement: Matched Job Listings Display

After matching simulation completes, the system MUST display the list of matched jobs with match indicators, application status, and conditional button states in a clear, user-friendly layout.

#### Scenario: Display matched jobs with percentages and apply buttons

- **WHEN** the job matching simulation completes
- **THEN** the system SHALL display all jobs from the existing mock job listings
- **AND** the system SHALL show the match percentage badge prominently on each job card
- **AND** the system SHALL sort jobs by match percentage (highest to lowest)
- **AND** each job card SHALL display an "Apply CV" button (secondary style)
- **AND** each job card SHALL display a "Start Interview" button (disabled, grayed out)
- **AND** the system SHALL maintain the existing job card design with added button controls

#### Scenario: Job list interactivity with application flow

- **WHEN** matched jobs are displayed
- **THEN** the system SHALL allow candidates to click "Apply CV" to trigger question generation
- **AND** after successful application, candidates can click "Start Interview" to navigate to /interview/[job-id]
- **AND** the system SHALL preserve existing UI elements (search bar, job cards, hover effects)
- **AND** the system SHALL show application status (applied vs. not applied) on each card

### Requirement: Error Handling

The system MUST handle file upload errors and processing failures gracefully with clear user feedback.

#### Scenario: Invalid file type error

- **WHEN** a candidate uploads a file that is not a PDF
- **THEN** the system SHALL display an error message: "Please upload a PDF file"
- **AND** the system SHALL allow the user to try uploading again
- **AND** the system SHALL NOT clear any previously entered data or selections

#### Scenario: File size validation

- **WHEN** a candidate uploads a PDF file larger than 10MB
- **THEN** the system SHALL display an error message: "File size must be less than 10MB"
- **AND** the system SHALL reject the upload
- **AND** the system SHALL allow the user to upload a different file

#### Scenario: Mock processing failure handling

- **WHEN** a simulated processing error occurs (random 5% failure rate)
- **THEN** the system SHALL display a friendly error message: "Something went wrong. Please try uploading again."
- **AND** the system SHALL provide a "Try Again" button
- **AND** the system SHALL reset to the initial upload state

### Requirement: Responsive Design

The CV upload and job matching interface MUST be fully responsive and functional on both mobile and desktop devices.

#### Scenario: Mobile upload experience

- **WHEN** a candidate accesses the page on a mobile device (viewport width < 768px)
- **THEN** the system SHALL display a mobile-optimized upload interface
- **AND** the system SHALL support mobile file selection (camera, file browser)
- **AND** the system SHALL display progress indicators appropriately sized for mobile
- **AND** the system SHALL render job cards in a single column layout

#### Scenario: Desktop upload experience

- **WHEN** a candidate accesses the page on a desktop device (viewport width >= 1024px)
- **THEN** the system SHALL display the upload interface in the center of the screen
- **AND** the system SHALL support drag-and-drop file upload
- **AND** the system SHALL render job cards in a multi-column grid (2-3 columns)
- **AND** the system SHALL maintain existing hover effects and animations

### Requirement: Progress Indication

Throughout the upload, parsing, and matching process, the system MUST provide clear progress indicators to inform users of the current status.

#### Scenario: Multi-stage progress display

- **WHEN** the CV processing workflow is active
- **THEN** the system SHALL display the current stage (Upload → Parsing → Matching → Results)
- **AND** the system SHALL show a visual indicator of overall progress (e.g., step indicator or progress bar)
- **AND** the system SHALL display estimated time remaining or processing status
- **AND** the system SHALL prevent accidental navigation away during processing

#### Scenario: Processing status messages

- **WHEN** each processing stage is active
- **THEN** the system SHALL display stage-specific status messages:
  - Parsing: "Analyzing your skills and experience..."
  - Matching: "Finding the best job matches for you..."
  - Completion: "Match complete! Here are your top opportunities."
- **AND** the system SHALL update status messages dynamically as stages progress

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

### Requirement: Apply CV to Job Position

The system SHALL provide an "Apply CV" button on each job card that triggers personalized interview question generation when a candidate applies their uploaded CV to a specific job position.

#### Scenario: Apply CV button visibility after CV upload

- **WHEN** a candidate successfully uploads their CV and job matches are displayed
- **THEN** each job card SHALL display an "Apply CV" button in secondary (outline) style
- **AND** the "Start Interview" button SHALL be disabled by default with visual indication
- **AND** the "Apply CV" button SHALL be enabled and clickable

#### Scenario: Clicking Apply CV triggers question generation

- **WHEN** a candidate clicks the "Apply CV" button on a job card
- **THEN** the button SHALL show a loading spinner with text "Generating questions..."
- **AND** the system SHALL call POST /api/jobs/apply with cvId and jobId
- **AND** the button SHALL be disabled during the API call
- **AND** the system SHALL display a toast notification on success or error

#### Scenario: Successful application enables interview start

- **WHEN** the apply API call completes successfully
- **THEN** the "Apply CV" button SHALL be hidden or replaced with a success indicator
- **AND** the "Start Interview" button SHALL become enabled with primary styling
- **AND** a success toast SHALL display: "Application submitted! Ready to start interview."
- **AND** a visual indicator (checkmark badge) SHALL show the job is applied

#### Scenario: Application error handling

- **WHEN** the apply API call fails
- **THEN** the "Apply CV" button SHALL show an error state with retry icon
- **AND** an error toast SHALL display: "Failed to generate questions. Please try again."
- **AND** the button SHALL become clickable again for retry
- **AND** the "Start Interview" button SHALL remain disabled

#### Scenario: Prevent duplicate applications

- **WHEN** a candidate has already applied to a job (cached questions exist)
- **THEN** the "Apply CV" button SHALL be hidden
- **AND** the "Start Interview" button SHALL be enabled immediately
- **AND** a badge SHALL indicate "Applied" status
- **AND** no API call SHALL be made (use cached state)

### Requirement: Job Card Application State Management

The system SHALL track and persist the application state for each job per candidate, indicating whether the candidate has applied their CV to the job.

#### Scenario: Track application state locally

- **WHEN** a candidate applies to a job successfully
- **THEN** the application state SHALL be stored in sessionStorage or localStorage
- **AND** the state SHALL include: jobId, cvId, applicationId, appliedAt timestamp
- **AND** the state SHALL persist across page refreshes
- **AND** the state SHALL be cleared when uploading a different CV

#### Scenario: Restore application state on page load

- **WHEN** a candidate returns to the jobs page after applying
- **THEN** the system SHALL load application state from storage
- **AND** previously applied jobs SHALL show "Start Interview" enabled
- **AND** previously applied jobs SHALL show "Applied" badge
- **AND** non-applied jobs SHALL show "Apply CV" button

#### Scenario: Multiple job applications

- **WHEN** a candidate applies to multiple jobs with the same CV
- **THEN** each job's application state SHALL be tracked independently
- **AND** the system SHALL maintain a list of applied jobIds
- **AND** each job card SHALL reflect its individual application status

### Requirement: Loading State During Question Generation

The system SHALL provide clear visual feedback during the question generation process with estimated time and progress indication.

#### Scenario: Show loading spinner on Apply CV button

- **WHEN** the apply API call is in progress
- **THEN** the "Apply CV" button SHALL display an animated spinner icon
- **AND** the button text SHALL change to "Generating questions..."
- **AND** the button SHALL be disabled to prevent multiple clicks
- **AND** the entire job card SHALL have a subtle overlay or border color change

#### Scenario: Display estimated time

- **WHEN** question generation is in progress
- **THEN** the system SHALL display a message: "This may take 2-3 seconds"
- **AND** the message SHALL appear below the button or in the card footer
- **AND** the message SHALL fade out when complete

#### Scenario: Success feedback

- **WHEN** question generation completes successfully
- **THEN** the button SHALL briefly show a green checkmark icon
- **AND** the button text SHALL change to "Questions Ready!"
- **AND** after 1 second, the button SHALL transition to "Start Interview" enabled state
- **AND** a success toast notification SHALL appear

### Requirement: Responsive Job Card Layout with Dual Buttons

The system SHALL adapt the job card layout to accommodate both "Apply CV" and "Start Interview" buttons while maintaining responsive design across devices.

#### Scenario: Desktop layout with dual buttons

- **WHEN** a candidate views job cards on desktop (width >= 1024px)
- **THEN** both buttons SHALL be displayed side-by-side in the card footer
- **AND** "Apply CV" SHALL be on the left (secondary style)
- **AND** "Start Interview" SHALL be on the right (primary style, disabled initially)
- **AND** buttons SHALL have equal width with gap spacing

#### Scenario: Mobile layout with stacked buttons

- **WHEN** a candidate views job cards on mobile (width < 768px)
- **THEN** buttons SHALL stack vertically in the card footer
- **AND** "Apply CV" SHALL be positioned above "Start Interview"
- **AND** both buttons SHALL be full-width
- **AND** gap spacing SHALL be maintained between buttons

#### Scenario: Applied job card layout

- **WHEN** a candidate has applied to a job
- **THEN** only the "Start Interview" button SHALL be visible
- **AND** the "Applied" badge SHALL appear in the card header next to the status badge
- **AND** the card footer SHALL show single button centered
- **AND** layout SHALL remain responsive on all devices

