## ADDED Requirements

### Requirement: Completed Interview Exclusion

The job matching results page SHALL exclude all interviews with status "COMPLETED" from the displayed results.

#### Scenario: Candidate with completed interviews views matching results

- **WHEN** a candidate uploads a CV and views job matching results
- **THEN** only interviews with status "PENDING" or "IN_PROGRESS" are displayed
- **AND** no completed interviews appear in the results list
- **AND** the summary statistics (excellent matches, strong matches, average match) are calculated only from non-completed interviews

#### Scenario: Candidate with only completed interviews uploads CV

- **WHEN** a candidate uploads a CV and all matching interviews have status "COMPLETED"
- **THEN** the results page displays a message indicating no active opportunities are available
- **AND** a link or button is provided to view interview history
- **AND** the summary statistics section is hidden or shows zero active matches

#### Scenario: Match percentage calculation excludes completed interviews

- **WHEN** the system calculates job match percentages
- **THEN** completed interviews are filtered out before the matching algorithm runs
- **AND** the match results only include interviews with status "PENDING" or "IN_PROGRESS"
