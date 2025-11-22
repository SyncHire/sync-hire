## ADDED Requirements

### Requirement: Interview Results API
The system SHALL provide an API endpoint to retrieve complete interview details including scores and AI feedback.

#### Scenario: Fetch completed interview
- **WHEN** GET `/api/interviews/:id` is called with a valid interview ID
- **THEN** return interview details including id, jobId, candidateId, status, score, durationMinutes, transcript, aiEvaluation, and timestamps

#### Scenario: Interview not found
- **WHEN** GET `/api/interviews/:id` is called with an invalid interview ID
- **THEN** return 404 status with error message

### Requirement: Interview Results Display
The system SHALL display interview results with real data from the completed interview.

#### Scenario: Display interview score
- **WHEN** candidate views `/interview/:id/results` after completing an interview
- **THEN** display the overall score (0-100) prominently with visual indicator

#### Scenario: Display performance categories
- **WHEN** interview results page loads
- **THEN** show breakdown by category (Technical Knowledge, Problem Solving, Communication, Experience Relevance)

#### Scenario: Display AI feedback
- **WHEN** AI evaluation is available for the interview
- **THEN** display strengths, areas for improvement, and overall summary

#### Scenario: Navigate to HR view
- **WHEN** results page loads for a completed interview
- **THEN** provide a "View in HR Dashboard" link that navigates to the HR applicants view for the job

### Requirement: Interview Completion Storage
The system SHALL store interview scores and AI evaluation when an interview completes.

#### Scenario: Store score from webhook
- **WHEN** interview-complete webhook is received with score data
- **THEN** update the interview record with score and mark status as COMPLETED

#### Scenario: Store AI evaluation
- **WHEN** interview-complete webhook includes AI evaluation data
- **THEN** store the evaluation (strengths, improvements, summary) with the interview record
