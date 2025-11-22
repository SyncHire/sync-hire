# Candidate Job Matching - Delta Spec

## ADDED Requirements

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

## MODIFIED Requirements

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
