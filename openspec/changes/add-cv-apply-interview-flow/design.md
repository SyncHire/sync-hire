# Design Document: CV Apply Interview Flow

## Context

The current system allows candidates to upload a CV and see job matches, but interviews use generic questions. We want to personalize the interview experience by generating questions based on both the candidate's CV and the specific job description.

### Current State
- Candidates upload CV → system shows matched jobs → candidates can immediately start interviews
- Interviews use only HR-provided custom questions (if any)
- No personalization based on candidate background

### Target State
- Candidates upload CV → system shows matched jobs with "Apply CV" button
- Clicking "Apply CV" generates 6-8 personalized questions using Gemini
- "Start Interview" button becomes enabled after application
- Interview uses both HR custom questions + AI-generated personalized questions

## Goals / Non-Goals

### Goals
- Generate personalized interview questions using Gemini AI
- Store questions persistently using file-based storage (matching existing patterns)
- Maintain clear separation between HR custom questions and AI suggestions
- Provide responsive UI feedback during question generation
- Cache generated questions to avoid redundant API calls

### Non-Goals
- Database integration (use file storage only)
- Real-time question updates or regeneration
- Question editing or customization by candidates
- Multi-tenant or user-specific question storage
- Question analytics or performance tracking

## Decisions

### 1. Storage Strategy: File-Based JSON

**Decision:** Store generated questions in `/data/interview-questions/{hash}.json` files using combined CV+Job hash.

**Rationale:**
- Matches existing pattern for JD/CV extractions (`/data/jd-extractions/`, `/data/cv-extractions/`)
- No database setup required (consistent with current project state)
- Simple caching: check file existence before calling Gemini
- Easy to inspect, debug, and version control

**Alternatives Considered:**
- Database storage: Rejected due to "Database: Not Yet Implemented" status in project.md
- In-memory cache: Rejected because it doesn't persist across server restarts
- Session storage: Rejected because questions should persist beyond session

**File Naming Convention:**
```
hash = SHA256(cvId + jobId)
path = /data/interview-questions/{hash}.json
```

### 2. Question Generation Timing: On-Demand (Apply Button)

**Decision:** Generate questions when candidate clicks "Apply CV" button, not during CV upload.

**Rationale:**
- Reduces initial CV upload time (already 2-3 seconds for parsing + matching)
- Generates questions only for jobs candidate is interested in (not all visible jobs)
- Allows per-job personalization based on specific JD
- User expects some delay when clicking "Apply" (acceptable UX)

**Alternatives Considered:**
- Generate during CV upload: Rejected due to long initial wait (6-8 API calls for all jobs)
- Generate on interview start: Rejected because candidates would wait before starting interview

**Expected Latency:**
- Gemini API call: ~2-3 seconds
- File I/O: <100ms
- Total user wait: 2-3 seconds (acceptable with loading spinner)

### 3. Data Model: Separate Custom and Suggested Questions

**Decision:** Store HR custom questions and AI-generated questions in separate properties within the same JSON file.

```typescript
interface InterviewQuestions {
  metadata: {
    cvId: string;
    jobId: string;
    generatedAt: string; // ISO timestamp
    questionCount: number;
  };
  customQuestions: Array<{
    id: string;
    type: "SHORT_ANSWER" | "LONG_ANSWER" | "MULTIPLE_CHOICE" | "SCORED";
    content: string;
    options?: Array<{ label: string }>;
    scoringConfig?: { type: string; min: number; max: number };
    required: boolean;
    order: number;
  }>;
  suggestedQuestions: Array<{
    content: string;
    reason: string; // Why this question is relevant
    category?: "technical" | "behavioral" | "experience" | "problem-solving";
  }>;
}
```

**Rationale:**
- Clear separation between HR-authored and AI-generated content
- HR questions maintain full structure (type, scoring, required flags)
- AI questions are simpler (content + reason + category)
- Easy to display differently in UI (e.g., "Custom Questions" vs "Personalized Questions")
- Interview agent can merge both arrays when conducting interview

**Alternatives Considered:**
- Single merged array: Rejected because it loses question source information
- Separate files: Rejected because it complicates retrieval and increases I/O

### 4. API Design: RESTful Apply Endpoint

**Decision:** Create `POST /api/jobs/apply` endpoint accepting `{ cvId, jobId }`.

**Request:**
```typescript
POST /api/jobs/apply
Content-Type: application/json

{
  "cvId": "abc123hash",  // Hash from CV upload
  "jobId": "job_456"     // Job ID from job listing
}
```

**Response (Success):**
```typescript
HTTP 200 OK

{
  "data": {
    "id": "application_hash",
    "cvId": "abc123hash",
    "jobId": "job_456",
    "questionCount": 6,
    "customQuestionCount": 3,
    "suggestedQuestionCount": 6,
    "cached": false
  }
}
```

**Response (Error):**
```typescript
HTTP 400 Bad Request

{
  "error": "CV not found",
  "message": "No CV extraction found for ID: abc123hash"
}
```

**Rationale:**
- Follows existing API patterns in `/api/jobs/` directory
- Simple payload (2 IDs only)
- Returns metadata useful for UI (question counts, cache status)
- Standard HTTP status codes for errors

**Error Handling:**
- 400: Missing cvId or jobId, CV/Job not found
- 500: Gemini API failure, file write failure
- Retry logic: None (user can click "Apply" again if needed)

### 5. Gemini Prompt Design: Contextual Question Generation

**Decision:** Use structured prompt combining CV data + JD data with clear instructions for question format.

**Prompt Template:**
```
You are an expert technical interviewer creating personalized interview questions.

**Candidate Background (from CV):**
- Name: {name}
- Experience: {yearsOfExperience} years
- Skills: {skills.join(", ")}
- Education: {education}
- Recent Projects: {projects}

**Job Position:**
- Title: {job.title}
- Company: {job.company}
- Required Skills: {job.requirements.join(", ")}
- Responsibilities: {job.responsibilities.join(", ")}

Generate exactly 6-8 interview questions that:
1. Assess the candidate's fit for this specific role
2. Leverage their background and experience
3. Cover both technical skills and behavioral aspects
4. Are open-ended to encourage detailed responses
5. Range from easy to challenging

Return a JSON array with this structure:
[
  {
    "content": "Question text here?",
    "reason": "Why this question is relevant",
    "category": "technical|behavioral|experience|problem-solving"
  }
]
```

**Rationale:**
- Provides complete context from both CV and JD
- Clear constraints (6-8 questions, specific format)
- JSON output for easy parsing
- Includes "reason" field for transparency (can show to HR/candidates)

**Alternatives Considered:**
- Generic questions: Rejected because they don't leverage CV data
- Few-shot prompting: Deferred to later optimization if quality is low
- Multi-turn conversation: Rejected due to latency concerns

### 6. UI Flow: Progressive Enhancement

**Decision:** Add "Apply CV" button alongside existing "Start Interview" button, with clear state transitions.

**State Machine:**
```
Job Card States:
1. NOT_UPLOADED_CV: Both buttons hidden, show "Upload CV first"
2. CV_UPLOADED: "Apply CV" enabled, "Start Interview" disabled
3. APPLYING: "Apply CV" shows spinner, "Start Interview" disabled
4. APPLIED: "Apply CV" hidden, "Start Interview" enabled with checkmark
5. ERROR: "Apply CV" shows retry icon, "Start Interview" disabled
```

**Visual Design:**
- "Apply CV" button: Blue outline, secondary style
- "Start Interview" button: Primary blue, solid fill (when enabled)
- Loading state: Spinner in button + "Generating questions..."
- Success state: Green checkmark + "Ready to interview"
- Error state: Red X + "Try again"

**Rationale:**
- Clear visual hierarchy (apply first, then interview)
- Loading feedback prevents multiple clicks
- Success/error states provide clear feedback
- Disabled state prevents premature interview starts

## Risks / Trade-offs

### Risk: Gemini API Latency or Failures

**Impact:** Candidates wait 2-3 seconds per application, or see error if API fails.

**Mitigation:**
- Show clear loading spinner with progress message
- Implement caching (check file before API call)
- Graceful error handling with retry button
- Fallback: Allow interview start with HR questions only if Gemini fails (future enhancement)

### Risk: Storage Growth

**Impact:** Each CV+Job combination creates a JSON file (~2-5KB). With 1000 candidates × 10 jobs = 10,000 files (~20-50MB).

**Mitigation:**
- Acceptable for MVP (50MB is negligible)
- Future: Implement cleanup for old applications (>90 days)
- Future: Migrate to database if file count becomes problematic

### Risk: Question Quality Variability

**Impact:** Gemini may generate irrelevant or low-quality questions.

**Mitigation:**
- Store "reason" field for each question (enables quality review)
- HR can view generated questions before interview (future feature)
- Collect feedback on question relevance (future analytics)

### Trade-off: File Storage vs. Database

**Decision:** Use file storage despite potential future scalability issues.

**Rationale:**
- Project currently has no database (project.md: "Database: Not Yet Implemented")
- File storage is simpler and faster for MVP
- Easy migration path: files can be bulk-imported to DB later
- Consistent with existing JD/CV extraction patterns

## Migration Plan

### Phase 1: Implementation (This Change)
1. Create file storage infrastructure
2. Implement API endpoint with Gemini integration
3. Update job card UI with "Apply CV" button
4. Test end-to-end flow

### Phase 2: Enhancements (Future)
- HR preview of generated questions
- Question regeneration option
- Analytics on question quality
- Database migration for scalability

### Rollback Plan
If major issues arise:
1. Remove "Apply CV" button from UI
2. Revert API endpoint
3. Existing interviews continue with HR questions only
4. No data loss (CV/JD extractions unaffected)

## Open Questions

1. **Should we limit applications per candidate?** (e.g., max 5 active applications)
   - Current decision: No limit for MVP

2. **Should generated questions expire?** (e.g., regenerate after 30 days)
   - Current decision: No expiration for MVP

3. **Should we show candidates the questions before interview?**
   - Current decision: No, questions are revealed during interview

4. **How to handle duplicate applications?** (same candidate applies twice to same job)
   - Current decision: Return cached questions, don't regenerate
