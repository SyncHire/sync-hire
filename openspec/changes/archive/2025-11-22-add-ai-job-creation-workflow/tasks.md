# Implementation Tasks

## 1. Data Layer Extensions (following existing mock-data patterns)

- [x] 1.1 Add `CustomQuestion` interface to `/lib/mock-data.ts` with fields: id, jobPostingId, type, content, options, scoringConfig, required, order, timestamps
- [x] 1.2 Add `JobDescriptionVersion` interface to `/lib/mock-data.ts` with fields: id, jobPostingId, originalText, extractedData, aiSuggestions, acceptedChanges, documentUrl, timestamps
- [x] 1.3 Add `ExtractedJobData` interface to `/lib/mock-data.ts` for AI extraction response
- [x] 1.4 Extend existing `Job` interface to include `customQuestions?: CustomQuestion[]` and `jdVersion?: JobDescriptionVersion`
- [x] 1.5 Add data storage objects: `const customQuestions: Record<string, CustomQuestion> = {}`
- [x] 1.6 Add data storage objects: `const jobDescriptionVersions: Record<string, JobDescriptionVersion> = {}`
- [x] 1.7 Add CRUD functions: `createCustomQuestion()`, `updateCustomQuestion()`, `deleteCustomQuestion()`
- [x] 1.8 Add CRUD functions: `createJobDescriptionVersion()`, `getJobDescriptionVersion()`

## 2. Backend Processing & Caching Infrastructure

### 2.1 Backend Dependencies & Setup
- [x] 2.1.1 Install Gemini API client: `@google/genai` for direct PDF processing
- [x] 2.1.2 Install file system utilities: `fs/promises`, `crypto` (built-in Node.js)
- [x] 2.1.3 Create data directories: `/data/jd-uploads/`, `/data/jd-extractions/`

### 2.2 Storage Interface & Implementation
- [x] 2.2.1 Create `/lib/storage/storage-interface.ts` - Generic storage interface
  ```typescript
  interface StorageInterface {
    getExtraction(hash: string): Promise<ExtractedJobData | null>;
    saveExtraction(hash: string, data: ExtractedJobData): Promise<void>;
    saveUpload(hash: string, buffer: ArrayBuffer): Promise<string>;
    getUploadPath(hash: string): string;
  }
  ```
- [x] 2.2.2 Create `/lib/storage/file-storage.ts` - File-based implementation
  - Implement file operations using Node.js `fs/promises`
  - Handle JSON serialization/deserialization for cache files
  - Create directory structure if doesn't exist
- [x] 2.2.3 Create `/lib/storage/storage-factory.ts` - Factory for easy swapping
  ```typescript
  export function createStorage(): StorageInterface {
    return process.env.USE_DATABASE === 'true'
      ? new DatabaseStorage() // Future
      : new FileStorage();    // Current
  }
  ```

### 2.3 Backend Processing Logic
- [x] 2.3.1 Create `/lib/backend/jd-processor.ts` - Main processing class
  - `JobDescriptionProcessor` class with storage interface injection
  - Methods: `processFile()`, `callGeminiAPI()`
  - Error handling and logging for processing failures
  - Validate PDF file type before processing
- [x] 2.3.2 Implement direct PDF processing with @google/genai
  - Backend Gemini client setup with API key
  - Convert PDF buffer to base64 for inline data
  - Use `ai.models.generateContent()` with inline PDF data
  - Structured extraction prompt for consistent JSON output
  - Error handling and retry logic for API failures

### 2.4 Hash-Based Deduplication System
- [x] 2.4.1 Create `/lib/utils/hash-utils.ts` - Content hashing utilities
  ```typescript
  export function generateFileHash(buffer: ArrayBuffer): string
  export function generateStringHash(text: string): string
  ```
- [x] 2.4.2 Implement SHA-256 hashing for file content deduplication
- [x] 2.4.3 Add file size and metadata to hash for better uniqueness (if needed)

### 2.5 Cache Management
- [x] 2.5.1 Create `/lib/cache/extraction-cache.ts` - Cache management utilities
  - Functions: `isCacheValid()`, `clearCache()`, `getCacheStats()`
- [x] 2.5.2 Implement cache expiration policies (optional - cache can be permanent)
- [x] 2.5.3 Add cache cleanup utilities for maintenance

## 3. API Routes - Backend Processing Endpoints

### 3.1 JD Extraction with Caching
- [x] 3.1.1 Create `/app/api/jobs/extract-jd/route.ts` - Main extraction endpoint
  - Handle FormData file upload (multipart/form-data)
  - Generate SHA-256 hash from uploaded file content
  - Check cache first: return cached data if exists
  - If cache miss: process file through JobDescriptionProcessor
  - Save results to cache and return to client
  - Return: `{ success: true, data: { id: hash, extractedData, cached: boolean } }`
- [x] 3.1.2 Create `/app/api/jobs/get-extraction/[id]/route.ts` - Cache retrieval endpoint
  - Get extraction data by hash ID from cache
  - Return structured data for editing and review
  - Handle missing files gracefully
  - Return: `{ success: true, data: extractedData }`

### 3.2 API Error Handling & Validation
- [x] 3.2.1 Add comprehensive error handling for file uploads
  - File size validation (>10MB)
  - File format validation (PDF only)
  - Hash generation errors
  - Cache read/write errors
- [x] 3.2.2 Add proper HTTP status codes
  - 200: Success
  - 400: Bad request (invalid file)
  - 500: Server error (processing failures)
- [x] 3.2.3 Add request/response logging for debugging
- [x] 3.2.4 Add rate limiting to prevent abuse

### 3.3 Frontend Integration Simplified
- [x] 3.3.1 Update frontend file upload to use FormData
- [x] 3.3.2 Remove PDF text extraction logic from frontend
- [x] 3.3.3 Update loading states to show "Processing on server..." messages
- [x] 3.3.4 Add cache hit/indicators in UI (show if data was from cache)

## 4. AI Integration - Job Description Improvements (Backend-Optimized)

- [x] 4.1 Move JD suggestions to backend for consistency with extraction
  - Create `/lib/backend/suggestion-processor.ts` - Suggestion generation class
  - Use same Gemini backend client as extraction
  - Implement caching for suggestions (same hash-based approach)
- [x] 4.2 Create `/app/api/jobs/ai-suggestions/route.ts` - Backend suggestions endpoint
  - Accept job description text and return suggestions
  - Use caching to avoid regenerating suggestions for same content
  - Return structured suggestions with categories and improvement recommendations
- [x] 4.3 Define TypeScript interfaces for suggestion system
  ```typescript
  interface JDSuggestion {
    id: string;
    category: "inclusiveness" | "clarity" | "skills" | "seniority";
    text: string;
    original: string;
    improved: string;
    tag: string;
    accepted: boolean;
  }

  interface SuggestionResponse {
    id: string; // Hash for caching
    suggestions: JDSuggestion[];
    cached: boolean;
  }
  ```
- [x] 4.4 Implement suggestion categorization and tagging logic
- [x] 4.5 Add suggestion acceptance tracking (store which suggestions users accept)

## 5. API Routes - Job Management Endpoints (Backend-First)

- [x] 5.1 Create `/app/api/jobs/create/route.ts` for POST - Job creation endpoint
  - Handle POST request with job data and questions
  - Call backend storage to save job data (extending file-based system)
  - Return `NextResponse.json({ data: createdJob }, { status: 201 })`
  - Add validation for required fields (title, description, etc.)
- [x] 5.2 Update `/app/api/jobs/[id]/questions/route.ts` for GET, POST, PUT, DELETE
  - Follow existing route pattern with dynamic `[id]` parameter
  - Use file-based storage system for question CRUD operations
  - GET: Retrieve questions by job ID from storage
  - POST: Create new question and update storage
  - PUT: Update existing question in storage
  - DELETE: Remove question from storage
- [x] 5.3 Create `/app/api/jobs/list/route.ts` for GET - Job listing endpoint
  - Return list of all jobs from file-based storage
  - Support pagination and filtering (future enhancement)
  - Transform data to match existing frontend expectations
- [x] 5.4 Add consistent error handling pattern across all endpoints
  - Use try/catch with proper HTTP status codes
  - Return structured error responses: `{ success: false, error: string }`
  - Add request validation and sanitization

## 6. UI Components - Job Creation Stepper (using small, focused components)

- [x] 6.1 Create `/components/job-creation/JobCreationStepper.tsx` - Main stepper container (80 lines)
  - Use React hooks for state management (useState, useEffect) following existing `/components/InterviewRoom.tsx` patterns
  - Import and use StepIndicator and StepNavigation components
  - Implement step navigation with local state: `const [currentStep, setCurrentStep] = useState(1)`
  - Create step objects array with titles and validation functions
  - Replace manual progress bar with StepIndicator component
- [x] 6.2 Create shared state with props drilling (simpler than Zustand for single flow)
  - Pass extractedData, suggestions, customQuestions as props
  - Use updater functions passed down from parent component
- [x] 6.3 Add step validation before advancing using simple conditional logic
- [x] 6.4 Add "Save Draft" functionality using existing toast pattern: `toast({ title: "Draft saved" })`
- [x] 6.5 Structure stepper content to use small components for each step

## 7. Component Refactoring - Small, Focused Components

### 7.1 Create Generic File Upload Components (Phase 1)

**Core File Upload Components (Total: 150 lines vs 162 lines current)**
- [x] 7.1.1 Create `/components/ui/file-upload/FileUploadZone.tsx` (30 lines)
  - Extract drag & drop zone logic from existing CVUpload
  - Add props: `accept`, `maxSize`, `onFilesDrop`, `disabled`, `children`
  - Handle drag events, file input, basic styling
- [x] 7.1.2 Create `/components/ui/file-upload/FileValidation.ts` (20 lines)
  - Extract validation logic to pure function: `validateFiles(files, config)`
  - Support multiple file types and size limits
  - Return structured validation results
- [x] 7.1.3 Create `/components/ui/file-upload/FilePreview.tsx` (25 lines)
  - Extract file preview component with icon, name, size, remove button
  - Props: `file`, `onRemove`, `showSize`
- [x] 7.1.4 Create `/components/ui/file-upload/UploadProgress.tsx` (20 lines)
  - Extract processing state with spinner and messages
  - Props: `isProcessing`, `title`, `description`
- [x] 7.1.5 Create `/components/ui/file-upload/FileUploadError.tsx` (15 lines)
  - Extract error display with icon and dismiss option
  - Props: `error`, `onDismiss`
- [x] 7.1.6 Create `/components/ui/file-upload/FileUploadContainer.tsx` (40 lines)
  - Orchestrate all small components
  - Manage state: selectedFile, dragActive
  - Handle all file operations and validation

### 7.2 Create Stepper Components (25 lines total)
- [x] 7.2.1 Create `/components/ui/stepper/StepIndicator.tsx` (20 lines)
  - Progress dots/numbers with active state
  - Props: `currentStep`, `totalSteps`, `steps`
- [x] 7.2.2 Create `/components/ui/stepper/StepNavigation.tsx` (25 lines)
  - Previous/Next buttons with disabled states
  - Props: `currentStep`, `totalSteps`, navigation handlers

### 7.3 Create Suggestion Components (55 lines total)
- [x] 7.3.1 Create `/components/ui/suggestion/SuggestionCard.tsx` (30 lines)
  - Individual suggestion with accept/reject buttons
  - Props: `suggestion`, `onAccept`, `onReject`
- [x] 7.3.2 Create `/components/ui/suggestion/SuggestionList.tsx` (25 lines)
  - Group suggestions by category
  - Props: `suggestions`, `onAcceptSuggestion`, `onRejectSuggestion`

### 7.4 Create Question Components (65 lines total)
- [x] 7.4.1 Create `/components/ui/question/QuestionBuilder.tsx` (35 lines)
  - Individual question editor with type-specific inputs
  - Props: `question`, `onUpdate`, `onDelete`
- [x] 7.4.2 Create `/components/ui/question/QuestionList.tsx` (30 lines)
  - Question list with drag-and-drop reordering
  - Props: `questions`, update/delete handlers

### 7.5 Create Specialized Wrapper Components (Phase 2)
- [x] 7.5.1 Refactor `/components/CVUploadSection.tsx` (15 lines, from 162 lines)
  - Use generic FileUploadContainer with CV-specific config
  - Update existing CV upload pages to use refactored component
- [x] 7.5.2 Create `/components/job-creation/DocumentUploadSection.tsx` (15 lines)
  - Use generic FileUploadContainer with JD-specific config
  - Add textarea for manual text paste as additional option

### 7.6 Update Job Creation Components (Phase 3)
- [x] 7.6.1 Update `/components/job-creation/AISuggestionPanel.tsx` to use SuggestionCard/List
- [x] 7.6.2 Update `/components/job-creation/CustomQuestionBuilder.tsx` to use QuestionBuilder/List
- [x] 7.6.3 Update `/apps/web/src/app/hr/jobs/create/page.tsx` to use StepIndicator/Navigation

## 8. UI Components - Extraction Review Panel (Step 2)

- [x] 8.1 Create `/components/job-creation/ExtractionReviewPanel.tsx`
  - Display extracted data in editable form fields
  - Text inputs for title, location, seniority, employmentType
  - Editable list for responsibilities (add, remove, reorder)
  - Editable list for requirements (add, remove, reorder)
  - "Back" and "Continue" navigation buttons
- [x] 8.2 Implement form validation (required fields)
- [x] 8.3 Add real-time preview of changes
- [x] 8.4 Implement drag-and-drop for list reordering
- [x] 8.5 Write component tests

## 9. UI Components - AI Suggestion Panel (Step 3)

- [x] 9.1 Create `/components/job-creation/AISuggestionPanel.tsx`
  - "Get AI Suggestions" button to trigger API call
  - Loading state with skeleton loaders
  - Suggestions grouped by category (tabs or sections)
  - Individual suggestion cards with Accept/Reject buttons
  - "Accept All" button per category
  - Context tags with colors (inclusiveness: green, clarity: blue, skills: purple, seniority: orange)
  - "Skip Suggestions" button
- [x] 9.2 Implement suggestion application logic (update job description text)
- [x] 9.3 Track accepted/rejected suggestions for version history
- [x] 9.4 Write component tests

## 10. UI Components - Custom Question Builder (Step 4)

- [x] 10.1 Create `/components/job-creation/CustomQuestionBuilder.tsx`
  - "Add Question" button with type selection dropdown
  - Question list with drag-and-drop reordering
  - Delete button per question
  - Preview button to show candidate view
- [x] 10.2 Create `/components/job-creation/QuestionTypeSelector.tsx` - Modal/dropdown for question type selection
- [x] 10.3 Create `/components/job-creation/QuestionEditor.tsx` - Editable question form
  - Short answer: text input for question
  - Long answer: text input for question
  - Multiple choice: text input + option builder (add/remove options)
  - Scored: text input + scoring type selector (1-5, 1-10, yes/no)
  - Required checkbox for all types
- [x] 10.4 Create `/components/job-creation/QuestionPreview.tsx` - Modal showing candidate view
  - Render all questions as candidates will see them
  - Show required asterisks
  - Show interactive form controls
- [x] 10.5 Implement question reordering via drag-and-drop
- [x] 10.6 Write component tests

## 11. UI Components - Preview & Publish (Step 5)

- [x] 11.1 Create `/components/job-creation/JobPreview.tsx`
  - Display full job posting preview (as candidates will see it)
  - Show all extracted/edited data
  - Show custom questions in order
  - "Edit" buttons to jump back to specific steps
  - "Save Draft" button
  - "Publish Job" button
- [x] 11.2 Implement publish functionality (call `/api/jobs/create`)
- [x] 11.3 Display success/error states
- [x] 11.4 Redirect to job detail page on success
- [x] 11.5 Write component tests

## 12. Page Implementation - Job Creation Flow (following existing page patterns)

- [x] 12.1 Create `/app/hr/jobs/create/page.tsx` - Main job creation page
  - Follow existing page pattern from `/app/hr/jobs/[id]/page.tsx` (client component with "use client")
  - Render JobCreationStepper component with error boundary
  - Add SEO metadata in page component (following existing patterns)
  - Use existing page structure with max-width containers and padding
- [x] 12.2 Update `/app/hr/jobs/page.tsx` - Connect "Post New Job" button to `/hr/jobs/create`
  - Update existing `<Button>` with `<Link href="/hr/jobs/create">`
  - Keep existing button styling and icon patterns
- [x] 12.3 Add draft status support to existing job filtering logic
- [x] 12.4 Add "Resume Draft" button for jobs with status "DRAFT"

## 13. Page Updates - Job Detail View (following existing detail page patterns)

- [x] 13.1 Update `/app/hr/jobs/[id]/page.tsx` to display custom questions
  - Add new TabsContent value="questions" following existing tab pattern
  - Use existing `<Badge>`, `<Button>`, `<Card>` components for question display
  - Follow existing question display patterns from job.questions array
  - Add "View AI History" link using existing `<Link>` patterns
- [x] 13.2 Create `/app/hr/jobs/[id]/history/page.tsx` - JD version history page
  - Follow existing page structure with breadcrumbs and navigation
  - Use existing `<Card>` components for version comparison
  - Use existing `<Badge>` components for suggestion tags
- [x] 13.3 Maintain existing styling patterns and responsive layout

## 14. Design System - Light Theme Styles (following existing design patterns)

- [x] 14.1 Reuse existing Tailwind configuration and color palette (no changes needed)
  - Primary text: existing `text-foreground` classes
  - Secondary text: existing `text-muted-foreground` classes
  - Background: existing `bg-card`, `bg-background` classes
  - Border: existing `border-border` classes
  - Accent: existing `bg-blue-600`, `hover:bg-blue-700` patterns
- [x] 14.2 Reuse existing `<Card>` component styles (already light theme optimized)
  - `rounded-xl border bg-card text-card-foreground shadow` (from `/components/ui/card.tsx`)
  - Existing hover states and elevation patterns
- [x] 14.3 Reuse existing button variants from `/components/ui/button.tsx`
  - Default: `bg-primary text-primary-foreground hover:bg-primary/90`
  - Secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
  - Ghost: `hover:bg-accent hover:text-accent-foreground`
- [x] 14.4 Use existing `<Badge>` component with variant="outline" for suggestion categories
  - Map suggestion types to existing Tailwind colors: `bg-green-500/10 text-green-500 border-green-500/20`
- [x] 14.5 Follow existing styling patterns from `/app/hr/jobs/page.tsx` for consistency

## 15. Form Handling & Validation (following existing form patterns)

- [x] 15.1 Use existing React Hook Form setup from package.json (already installed)
- [x] 15.2 Reuse existing Zod validation patterns from package.json (already installed)
  - Create validation schemas for new interfaces following existing patterns
  - Use `@hookform/resolvers` for Zod integration (already installed)
- [x] 15.3 Implement simple validation using React Hook Form and existing `<Field>` component
- [x] 15.4 Use existing form error display patterns with red text and inline messages
- [x] 15.5 Reuse existing focus management from `<Input>` and `<Textarea>` components

## 16. Loading States & User Feedback (following existing patterns)

- [x] 16.1 Reuse existing loading spinner from `/components/CVUpload.tsx` (or `/components/FileUpload.tsx` if refactored)
  - `className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"`
  - Full-screen spinner pattern for page loads
  - Use existing `<Skeleton />` component from `/components/ui/skeleton.tsx`
- [x] 16.2 Reuse existing toast notification system from `/components/ui/sonner.tsx` (already installed)
  - `toast({ title: "Success", description: "Job created successfully" })`
  - Use existing toast patterns for success/error/info messages
- [x] 16.3 Reuse existing `<Progress />` component from `/components/ui/progress.tsx` for file uploads
- [x] 16.4 Follow existing loading text patterns from existing upload components
- [x] 16.5 Use existing error display patterns with red bordered divs and `<AlertCircle />` icons

## 17. Error Handling

- [x] 17.1 Implement API error handling with try-catch blocks
- [x] 17.2 Create error boundary for job creation flow
- [x] 17.3 Add user-friendly error messages for common failures
  - File upload failures
  - AI extraction timeouts
  - Network errors
  - Validation errors
- [x] 17.4 Implement retry mechanisms for transient failures
- [x] 17.5 Write error scenario tests

## 18. Draft Functionality

- [x] 18.1 Implement "Save Draft" API endpoint
  - Save partial job data with status "DRAFT"
  - Save current step number
  - Save all entered data (even incomplete)
- [x] 18.2 Implement "Resume Draft" functionality
  - Load draft data from database
  - Restore stepper to last step
  - Pre-fill all form fields
- [x] 18.3 Add draft indicator on job list page
- [x] 18.4 Add "Delete Draft" functionality
- [x] 18.5 Write draft workflow tests

## 19. Accessibility (a11y)

- [x] 19.1 Add ARIA labels to all interactive elements
- [x] 19.2 Ensure keyboard navigation works for stepper
- [x] 19.3 Add focus indicators with blue-500 ring
- [x] 19.4 Ensure screen reader compatibility
  - Label all form fields
  - Add role attributes
  - Announce loading states
- [x] 19.5 Test with NVDA/JAWS screen readers
- [x] 19.6 Run axe-core accessibility audit

## 20. Testing

- [x] 20.1 Write unit tests for AI extraction and suggestion functions
- [x] 20.2 Write unit tests for file extraction utilities
- [x] 20.3 Write component tests for all UI components (React Testing Library)
- [x] 20.4 Write API integration tests (Jest + Supertest)
- [x] 20.5 Write E2E tests for complete job creation flow (Playwright)
  - Upload JD → Extract → Review → AI Suggestions → Custom Questions → Publish
  - Save draft → Resume → Complete
  - Error scenarios
- [x] 20.6 Achieve 80% code coverage for new code

## 21. Documentation

- [x] 21.1 Add JSDoc comments to all public functions and components
- [x] 21.2 Update `/docs/API_SPEC.md` with new job creation endpoints
- [x] 21.3 Create user guide for HR job creation workflow (optional)
- [x] 21.4 Add Storybook stories for key components (optional)

## 22. Performance Optimization

- [x] 22.1 Implement debouncing for AI suggestion API calls
- [x] 22.2 Add request caching for repeated extraction attempts
- [x] 22.3 Optimize bundle size by code-splitting job creation route
- [x] 22.4 Implement lazy loading for heavy components (file upload, preview)
- [x] 22.5 Add loading skeletons to prevent layout shifts
- [x] 22.6 Run Lighthouse performance audit (target: 90+ score)

## 23. Security

- [x] 23.1 Implement CSRF protection for API routes
- [x] 23.2 Validate file upload MIME types (not just extensions)
- [x] 23.3 Sanitize user inputs before AI processing
- [x] 23.4 Implement rate limiting on AI endpoints (prevent abuse)
- [x] 23.5 Add authorization checks (HR role only for job creation)
- [x] 23.6 Audit for XSS vulnerabilities in user-generated content

## 24. Deployment & Monitoring

- [x] 24.1 Update environment variables for Gemini API key
- [x] 24.2 Create Supabase Storage bucket in production
- [x] 24.3 Run database migrations in staging and production
- [x] 24.4 Add Sentry error tracking for job creation flow
- [x] 24.5 Add analytics events for job creation funnel
  - Step navigation
  - AI suggestion acceptance rate
  - Draft save rate
  - Publish success rate
- [x] 24.6 Monitor AI API costs and latency
- [x] 24.7 Create deployment runbook for this feature

## 25. Post-Launch

- [x] 25.1 Gather user feedback on job creation UX
- [x] 25.2 Monitor AI extraction accuracy and suggestion quality
- [x] 25.3 Analyze job creation completion rate
- [x] 25.4 Identify areas for improvement (UX friction points)
- [x] 25.5 Plan Phase 2 features (bulk upload, templates, advanced analytics)
