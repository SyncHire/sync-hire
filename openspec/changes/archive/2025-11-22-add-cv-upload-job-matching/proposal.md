# Change: Add CV Upload and Job Matching to Candidate Job Listings

## Why

Currently, the candidate job listings page displays all available jobs without any personalization or matching logic. Candidates cannot upload their CV, and jobs are not matched to their qualifications. This creates a poor user experience where candidates must manually browse through all jobs without guidance on which positions best match their skills and experience.

By implementing CV upload and job matching, we enable candidates to:
- Upload their CV once and receive personalized job recommendations
- View jobs ranked by match percentage based on their qualifications
- Experience a modern, AI-driven job search flow similar to leading recruitment platforms

## What Changes

- Add CV upload functionality to candidate/jobs page with file type validation (PDF support)
- Implement mock CV parsing simulation with visual progress indicator
- Create mock job matching simulation that processes uploaded CV against existing job listings
- Display matched jobs with match percentage indicators after processing completes
- Add error handling for invalid file uploads and processing failures
- Ensure responsive design for mobile and desktop experiences

## Impact

- **Affected specs:** candidate-job-matching (new capability)
- **Affected code:**
  - `/apps/web/src/app/candidate/jobs/page.tsx` - Main job listings page (complete rewrite)
  - `/apps/web/src/components/ui/` - May need new UI components for file upload and progress indicators
  - `/apps/web/src/lib/mock-data.ts` - Existing mock job data (no changes needed, will continue using it)
- **User experience:** Candidates will now be required to upload CV before viewing jobs (gating mechanism)
- **Dependencies:** No new external dependencies required for mock implementation
