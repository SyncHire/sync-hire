# Implementation Tasks

## 1. Backend Infrastructure

- [x] 1.1 Create `/data/interview-questions/` directory for storing generated questions
- [x] 1.2 Create `question-generator.ts` service with Gemini integration for question generation
- [x] 1.3 Add storage methods in `storage-interface.ts` for interview questions (saveQuestions, getQuestions, hasQuestions)
- [x] 1.4 Implement file-based storage in `file-storage.ts` using hash-based naming

## 2. API Endpoint Development

- [x] 2.1 Create `apps/web/src/app/api/jobs/apply/route.ts` endpoint
- [x] 2.2 Implement POST handler accepting `{ cvId: string, jobId: string }`
- [x] 2.3 Validate CV and job exist before processing
- [x] 2.4 Call Gemini to generate 6-8 questions based on CV + JD
- [x] 2.5 Store generated questions with combined hash (cvId + jobId)
- [x] 2.6 Return application status and question count in response
- [x] 2.7 Add error handling for Gemini failures
- [x] 2.8 Implement caching to avoid regenerating for same CV+Job combination

## 3. Question Generation Logic

- [x] 3.1 Design Gemini prompt template for personalized question generation
- [x] 3.2 Define Zod schema for question response validation
- [x] 3.3 Extract relevant data from CV extraction JSON
- [x] 3.4 Extract relevant data from JD extraction JSON
- [x] 3.5 Combine both contexts in Gemini prompt
- [x] 3.6 Parse and validate Gemini response
- [x] 3.7 Store questions with metadata (customQuestions vs suggestedQuestions)

## 4. Frontend - Job Card UI Updates

- [x] 4.1 Add "Apply CV" button to job cards (visible after CV upload)
- [x] 4.2 Add application state tracking per job (not applied / applying / applied)
- [x] 4.3 Disable "Start Interview" button by default
- [x] 4.4 Enable "Start Interview" after successful application
- [x] 4.5 Show loading spinner on "Apply CV" during API call
- [x] 4.6 Display success message after successful application
- [x] 4.7 Handle API errors with user-friendly messages
- [x] 4.8 Add visual indicator (badge/icon) for applied jobs

## 5. Frontend - Application Flow

- [x] 5.1 Create `applyToJob` function using fetch API
- [x] 5.2 Pass CV ID (from upload state) + Job ID to API
- [x] 5.3 Update local state after successful application
- [x] 5.4 Manage application state via React state (cleared on new CV upload)
- [x] 5.5 Show toast notification on success/error

## 6. Data Model Updates

- [x] 6.1 Define TypeScript interface for `InterviewQuestions` storage format
- [x] 6.2 Include both `customQuestions` and `suggestedQuestions` properties
- [x] 6.3 Add metadata fields (cvId, jobId, generatedAt, questionCount)
- [x] 6.4 Document JSON schema in code comments

## 7. Interview Start Integration

- [ ] 7.1 Update interview start endpoint to load questions from storage
- [ ] 7.2 Merge custom questions and suggested questions for interview
- [ ] 7.3 Pass combined question set to interview agent
- [ ] 7.4 Ensure question order is preserved

## 8. Testing

- [ ] 8.1 Unit test question generation service
- [ ] 8.2 Unit test API endpoint with mocked Gemini
- [ ] 8.3 Integration test full apply flow (CV upload → apply → questions stored)
- [ ] 8.4 Test error scenarios (missing CV, missing job, Gemini failure)
- [ ] 8.5 Test caching behavior (same CV+Job returns cached questions)
- [ ] 8.6 Manual UI testing on desktop and mobile

## 9. Documentation

- [ ] 9.1 Add API documentation for `/api/jobs/apply` endpoint
- [ ] 9.2 Document question storage format and file naming convention
- [ ] 9.3 Update project README with new workflow

## Implementation Summary

### Completed (Core Feature)
- Backend infrastructure for storing and retrieving interview questions
- Gemini AI integration for personalized question generation
- REST API endpoint for applying CV to job position with caching
- Frontend UI with "Apply CV" and "Start Interview" buttons
- Application state management per job
- Loading states, error handling, and user feedback with toast notifications
- Full TypeScript implementation with strict type safety

### Not Yet Completed (Future Enhancement)
- Interview start endpoint integration (fetch and merge questions)
- Unit and integration tests
- Manual UI testing on desktop and mobile
- Documentation updates

### Technical Decisions Made
- File-based JSON storage at `/data/interview-questions/{hash}.json`
- Combined hash (SHA256 of cvId + jobId) for cache key
- Separated custom HR questions from AI-suggested questions in storage
- Gemini 2.5 Flash with structured JSON schema output
- React state for application tracking (no database needed for MVP)
- Toast notifications for user feedback
