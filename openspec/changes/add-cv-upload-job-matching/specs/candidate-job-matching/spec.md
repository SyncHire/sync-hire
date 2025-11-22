# Candidate Job Matching Specification

## ADDED Requirements

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

After matching simulation completes, the system MUST display the list of matched jobs with match indicators in a clear, user-friendly layout.

#### Scenario: Display matched jobs with percentages

- **WHEN** the job matching simulation completes
- **THEN** the system SHALL display all jobs from the existing mock job listings
- **AND** the system SHALL show the match percentage badge prominently on each job card
- **AND** the system SHALL sort jobs by match percentage (highest to lowest)
- **AND** the system SHALL maintain the existing job card design with added match indicators

#### Scenario: Job list interactivity

- **WHEN** matched jobs are displayed
- **THEN** the system SHALL allow candidates to click on job cards to view details/start interview
- **AND** the system SHALL maintain existing navigation to /interview/[job-id]
- **AND** the system SHALL preserve existing UI elements (search bar, job cards, hover effects)

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
