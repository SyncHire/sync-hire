# Change: CV Apply Interview Flow with AI-Generated Questions

## Why

Currently, candidates upload their CV to see job matches, but they can immediately start interviews without any personalization. This leads to generic interview experiences that don't leverage the candidate's specific background or the job's unique requirements.

We want to create a more personalized interview experience by auto-generating 6-8 interview questions using Gemini AI based on both the candidate's CV and the job description when a candidate applies to a specific position.

## What Changes

- Add "Apply CV" button to each job card (enabled after CV upload)
- Keep "Start Interview" button disabled until candidate applies with their CV
- When candidate clicks "Apply CV":
  - Call new API endpoint with uploaded CV ID and chosen Job Position ID
  - Backend uses Gemini to generate 6-8 personalized interview questions
  - Store generated questions in JSON file (similar to JD/CV extraction pattern)
  - Mark job as "applied" for this candidate, enabling "Start Interview" button
- Store both HR's custom questions and AI-generated questions separately in the same storage object
- Display loading state during question generation (2-3 seconds)
- Update job card UI to show application status

## Impact

- **Affected specs:**
  - `candidate-job-matching` - CV upload flow, job card UI, application workflow
  - `ai-integration` - Gemini question generation logic
  - `job-management` - Question storage data model

- **Affected code:**
  - `apps/web/src/app/candidate/jobs/page.tsx` - Add "Apply CV" button, track application state
  - `apps/web/src/app/api/jobs/apply/route.ts` - New API endpoint for applying with CV
  - `apps/web/src/lib/backend/question-generator.ts` - New service for Gemini question generation
  - `apps/web/src/lib/storage/` - Add storage methods for interview questions
  - Job card components - UI updates for dual button state
  - Data storage structure - New `/data/interview-questions/` directory

## Migration

This is a new feature with no breaking changes. Existing interviews and job listings continue to work as before. Jobs created without CV-based application still function normally with HR-provided custom questions only.
