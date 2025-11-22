# Change: Separate Completed Interviews from Job Matching Flow

## Why

Currently, completed interviews appear in the job matching results page alongside active opportunities. This creates confusion for candidates who see past interviews mixed with new opportunities. Candidates need a dedicated space to review their interview history while keeping the job matching flow focused on new opportunities only.

## What Changes

- Remove completed interviews from the CV upload and job matching result flow
- Create a new interview history page accessible to candidates
- Display interview history in a table format (similar to HR applicant listing) instead of card layout
- Replace match percentage with interview score for completed interviews
- Show key information: job title, company, completion date, and interview score
- Make each history entry clickable to view the existing interview result detail page
- Ensure responsive design for desktop and mobile

**BREAKING**: The job matching results page will no longer show completed interviews. Candidates must access completed interviews through the new history page.

## Impact

- Affected specs:
  - `job-matching` (new capability) - Modify to exclude completed interviews
  - `interview-history` (new capability) - Add new history page with table view
- Affected code:
  - `/apps/web/src/app/candidate/jobs/page.tsx` - Filter out completed interviews
  - `/apps/web/src/app/candidate/history/page.tsx` - New history page (to be created)
  - `/apps/web/src/components/CVUpload.tsx` - May need navigation updates
  - `/apps/web/src/lib/mock-data.ts` - Data model may need updates
  - Navigation/layout components - Add history link to candidate navigation
