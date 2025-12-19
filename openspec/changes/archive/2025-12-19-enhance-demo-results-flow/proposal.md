# Change: Enhance Demo Results Flow

## Why
The demo requires a seamless 1-minute flow after the live AI interview (Act 4) to show interview results and HR applicant view with real/meaningful data. Currently these pages use static mock data which doesn't reflect the just-completed interview.

## What Changes
- Add API endpoint to fetch single interview details with scores and feedback
- Update interview results page to display real interview data
- Enhance webhook handler to store AI evaluation scores
- Add navigation between results page and HR applicant view
- Ensure HR applicants list shows newly completed interviews with scores

## Impact
- Affected specs: interview-results (new capability)
- Affected code:
  - `apps/web/src/app/interview/[id]/results/page.tsx`
  - `apps/web/src/app/api/interviews/[id]/route.ts` (new)
  - `apps/web/src/app/api/webhooks/interview-complete/route.ts`
  - `apps/web/src/lib/hooks/use-interview.ts` (new)
