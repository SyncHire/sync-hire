# Implementation Tasks

## 1. CV Data Schema Definition
- [x] 1.1 Define `ExtractedCVData` interface in `/lib/mock-data.ts`
- [x] 1.2 Include fields: personalInfo, experience[], education[], skills[], certifications[], languages[], projects[]
- [x] 1.3 Follow TypeScript interface patterns consistent with `ExtractedJobData`

## 2. Backend CV Processing Infrastructure
- [x] 2.1 Create `/lib/backend/cv-processor.ts` following `JobDescriptionProcessor` pattern
- [x] 2.2 Implement CV extraction prompt for Gemini API
- [x] 2.3 Add Zod schema validation for CV data (handle null values like JD processor)
- [x] 2.4 Use existing storage interface for CV extraction caching
- [x] 2.5 Create `/data/cv-extractions/` directory structure
- [x] 2.6 Implement hash-based deduplication using existing `hash-utils.ts`

## 3. API Route for CV Extraction
- [x] 3.1 Create `/app/api/cv/extract/route.ts` for CV processing endpoint
- [x] 3.2 Accept FormData with PDF file upload
- [x] 3.3 Use existing file validation patterns (PDF, 10MB limit)
- [x] 3.4 Implement caching check using hash-based deduplication
- [x] 3.5 Call `CVProcessor` for extraction if cache miss
- [x] 3.6 Return structured CV data with caching status

## 4. Background Process Integration
- [x] 4.1 Modify `/app/candidate/jobs/page.tsx` to trigger background extraction
- [x] 4.2 Add `triggerCVExtraction` function that calls CV extraction API
- [x] 4.3 Ensure extraction runs asynchronously without blocking job matching
- [x] 4.4 Add error handling for extraction failures (non-blocking)
- [x] 4.5 Maintain existing user experience flow unchanged

## 5. Storage Extension
- [x] 5.1 Extend existing storage interface to support CV extraction
- [x] 5.2 Add CV-specific methods: `getCVExtraction()`, `saveCVExtraction()`
- [x] 5.3 Update `FileStorage` implementation to handle CV data
- [x] 5.4 Follow same patterns as JD extraction storage
- [x] 5.5 Maintain separate folder: `/data/cv-extractions/`

## 6. Error Handling & Logging
- [x] 6.1 Add comprehensive error handling for CV extraction failures
- [x] 6.2 Log extraction attempts and results for debugging
- [x] 6.3 Implement fallback behavior when extraction fails
- [ ] 6.4 Add monitoring for CV extraction success rates
- [x] 6.5 Ensure extraction failures don't affect job matching

## 7. Testing
- [ ] 7.1 Unit tests for `CVProcessor` class
- [ ] 7.2 Unit tests for CV extraction API route
- [ ] 7.3 Integration tests for background process triggering
- [ ] 7.4 Test with various CV formats and edge cases
- [ ] 7.5 Verify non-blocking behavior under load

## 8. Documentation
- [x] 8.1 Add JSDoc comments to CV processing functions
- [x] 8.2 Document CV schema structure and field meanings
- [x] 8.3 Update API documentation for CV extraction endpoint
- [x] 8.4 Add troubleshooting guide for CV extraction issues