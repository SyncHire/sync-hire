# interview-history Specification

## Purpose
TBD - created by archiving change separate-completed-interviews. Update Purpose after archive.
## Requirements
### Requirement: Interview History Page

The system SHALL provide a dedicated interview history page accessible to candidates that displays all completed interviews in a table format.

#### Scenario: Candidate accesses interview history page

- **WHEN** a candidate navigates to the interview history page at `/candidate/history`
- **THEN** a table is displayed showing all interviews with status "COMPLETED"
- **AND** the table includes columns for job title, company name, completion date, and interview score
- **AND** each row is clickable and links to the existing interview result detail page

#### Scenario: Candidate with no completed interviews views history

- **WHEN** a candidate with zero completed interviews accesses the history page
- **THEN** an empty state message is displayed indicating no completed interviews
- **AND** a call-to-action button or link is provided to browse available jobs
- **AND** the table structure is not rendered

#### Scenario: Table displays interview scores instead of match percentages

- **WHEN** the interview history table is rendered
- **THEN** each completed interview displays its interview score (0-100)
- **AND** match percentages are not displayed anywhere on the history page
- **AND** the score is formatted as "X/100" or "X%" depending on design preference

### Requirement: Table Layout and Responsiveness

The interview history table SHALL use a responsive table layout similar to the HR candidate listing page, replacing the current card design used in job matching.

#### Scenario: Desktop view of interview history

- **WHEN** a candidate views the history page on a desktop browser (width >= 768px)
- **THEN** the table displays all columns (job title, company, completion date, score) in a traditional table layout
- **AND** each column is properly aligned and spaced
- **AND** hover states indicate clickable rows

#### Scenario: Mobile view of interview history

- **WHEN** a candidate views the history page on a mobile device (width < 768px)
- **THEN** the table adapts to a responsive layout (stacked cards or horizontal scroll)
- **AND** all essential information remains visible and readable
- **AND** touch targets are appropriately sized (minimum 44x44px)

#### Scenario: Table sorting by completion date

- **WHEN** the interview history table is rendered
- **THEN** interviews are sorted by completion date in descending order (most recent first)
- **AND** the user can optionally sort by other columns (score, company, job title) if interactive sorting is implemented

### Requirement: Interview History Navigation

The system SHALL provide accessible navigation to the interview history page from relevant candidate-facing pages.

#### Scenario: Navigation link in candidate layout

- **WHEN** a candidate is on any candidate-facing page
- **THEN** a navigation link to "Interview History" or "History" is available in the navigation menu
- **AND** the link is clearly visible and accessible
- **AND** clicking the link navigates to `/candidate/history`

#### Scenario: Link from empty job matching results

- **WHEN** the job matching results page shows no active opportunities
- **THEN** a link or button to view interview history is prominently displayed
- **AND** the link text clearly indicates the action (e.g., "View Past Interviews")

### Requirement: Interview Detail Page Integration

Each interview in the history table SHALL link to the existing interview result detail page without modification to the detail page itself.

#### Scenario: Clicking interview in history table

- **WHEN** a candidate clicks on an interview row in the history table
- **THEN** the candidate is navigated to `/interview/[id]/results`
- **AND** the existing interview result detail page is displayed
- **AND** all existing detail page functionality (scores, strengths, summary) works as before

#### Scenario: Back navigation from interview detail

- **WHEN** a candidate navigates to an interview detail page from the history page
- **THEN** a back button or breadcrumb allows return to the history page
- **AND** the back navigation preserves any table state (scroll position, sorting) if applicable

