# Change: AI-Powered Job Creation Workflow

## Why

Currently, the HR job management interface uses mock data and lacks a complete job creation flow. HR users cannot create jobs with AI assistance, upload job descriptions for automated extraction, or configure custom screening questions. This limits the platform's core value proposition of AI-powered hiring automation.

The redesign will enable HR users to:
- Upload existing job descriptions and automatically extract structured job data
- Receive AI-driven suggestions to improve job posting quality (inclusiveness, clarity, skill specificity)
- Configure custom screening questions with multiple question types
- Preview the candidate experience before publishing

This change directly supports SyncHire's async preparation phase and enables more effective AI-powered interviews.

## What Changes

- **Job Description Upload & Extraction**: UI for uploading PDF files with AI extraction of title, responsibilities, requirements, seniority, location, and employment type
- **AI-Driven JD Improvement Suggestions**: Display AI recommendations with context tags (inclusiveness, clarity, skill alignment) and allow granular or bulk acceptance
- **Custom Screening Questions Builder**: Multi-type question builder (short/long answer, multiple choice, scored) with preview mode, reordering, and mandatory flags
- **Modern Light Theme Design**: Clean, professional UI with light backgrounds, high contrast text, subtle shadows, and minimal iconography
- **Job Creation Stepper Flow**: Multi-step wizard guiding users through upload → review → AI suggestions → custom questions → publish

## Impact

### Affected Specs
- **NEW**: `job-management` - Complete job posting creation and management capability
- **Integration with existing**: AI integration (Gemini for extraction and suggestions)
- **Integration with existing**: Database (new tables for custom questions, JD versions)
- **Integration with existing**: File storage (JD document uploads)

### Affected Code
- **New Generic UI Components** (small, focused components):
  - `/components/ui/file-upload/FileUploadZone.tsx` - Drag & drop zone (30 lines)
  - `/components/ui/file-upload/FileValidation.tsx` - Validation logic (20 lines)
  - `/components/ui/file-upload/FilePreview.tsx` - File preview (25 lines)
  - `/components/ui/file-upload/UploadProgress.tsx` - Progress state (20 lines)
  - `/components/ui/file-upload/FileUploadError.tsx` - Error display (15 lines)
  - `/components/ui/file-upload/FileUploadContainer.tsx` - Main orchestrator (40 lines)
  - `/components/ui/stepper/StepIndicator.tsx` - Step progress (20 lines)
  - `/components/ui/stepper/StepNavigation.tsx` - Navigation buttons (25 lines)
  - `/components/ui/suggestion/SuggestionCard.tsx` - Individual suggestion (30 lines)
  - `/components/ui/suggestion/SuggestionList.tsx` - Suggestion list (25 lines)
  - `/components/ui/question/QuestionBuilder.tsx` - Question editor (35 lines)
  - `/components/ui/question/QuestionList.tsx` - Question list (30 lines)

- **Refactored Components** (using new small components):
  - `/components/CVUploadSection.tsx` - CV wrapper (15 lines, refactored from 162 lines)
  - `/components/job-creation/DocumentUploadSection.tsx` - JD wrapper (15 lines)
  - `/apps/web/src/app/hr/jobs/create/page.tsx` - Job creation stepper (using small components)
  - `/apps/web/src/components/job-creation/AISuggestionPanel.tsx` - Using SuggestionCard/List
  - `/apps/web/src/components/job-creation/CustomQuestionBuilder.tsx` - Using QuestionBuilder/List
  - `/apps/web/src/components/job-creation/JobPreview.tsx` - Candidate preview (using small components)

- **New API Routes** (following existing patterns like `/api/stream-token`):
  - `/apps/web/src/app/api/jobs/extract-jd/route.ts` - JD upload with file-based caching (POST with FormData)
  - `/apps/web/src/app/api/jobs/get-extraction/[id]/route.ts` - Get cached extraction data (GET with file hash ID)
  - `/apps/web/src/app/api/jobs/ai-suggestions/route.ts` - AI improvement suggestions (POST with JSON response)
  - `/apps/web/src/app/api/jobs/create/route.ts` - Job creation endpoint (POST with validation)
  - `/apps/web/src/app/api/jobs/[id]/questions/route.ts` - Custom questions CRUD (GET, POST, PUT, DELETE)

- **Backend Processing Layer** (Node.js for PDF processing):
  - Direct PDF processing using Gemini API with @google/genai
  - Gemini 2.5 Flash API integration for structured extraction with inline PDF data
  - File-based caching system with unique hash-based filenames
  - Generic storage interface for future database migration

- **File Storage System** (with database-ready interface):
  - `/data/jd-extractions/` - JSON cache for extracted job data
  - `/data/jd-uploads/` - Original uploaded documents
  - Hash-based unique filenames for deduplication
  - Generic storage layer that can be swapped for database

- **Updated Pages**:
  - `/apps/web/src/app/hr/jobs/page.tsx` - Connect "Post New Job" button to stepper
  - `/apps/web/src/app/hr/jobs/[id]/page.tsx` - Display custom questions in details

### Breaking Changes
None - This is additive functionality that enhances existing job management.

## Design Decisions

### Backend-First JD Extraction & Caching Architecture

**Current Problem**: Processing PDFs in frontend is unreliable and resource-intensive

**Solution**: Backend processing with intelligent caching

#### 1. Processing Flow
```
Frontend → Upload PDF → Backend API → Extract Text → Gemini AI → Cache Results → Return Data
                                                              ↓
                                                        Same PDF upload → Cache Hit → Return Cached Data
```

#### 2. Backend API Design
```typescript
// POST /api/jobs/extract-jd
interface ExtractJDRequest {
  file: File; // FormData upload
}

interface ExtractJDResponse {
  success: boolean;
  data?: {
    id: string; // Hash-based unique ID
    extractedData: ExtractedJobData;
    cached: boolean; // Was this from cache?
  };
  error?: string;
}

// GET /api/jobs/get-extraction/[id]
interface GetExtractionResponse {
  success: boolean;
  data?: ExtractedJobData;
  error?: string;
}
```

#### 3. File-Based Caching System
```typescript
// Storage structure
/data/
  ├── jd-uploads/           // Original uploaded files
  │   └── abc123def456.pdf  // Hash-based filename
  └── jd-extractions/       // JSON extraction cache
      └── abc123def456.json  // Same hash, extracted data

// Hash generation (content-based, deduplication)
function generateFileHash(buffer: ArrayBuffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
```

#### 4. Generic Storage Interface (Database-Ready)
```typescript
// /lib/storage/storage-interface.ts
interface StorageInterface {
  getExtraction(hash: string): Promise<ExtractedJobData | null>;
  saveExtraction(hash: string, data: ExtractedJobData): Promise<void>;
  saveUpload(hash: string, buffer: ArrayBuffer): Promise<string>;
  getUploadPath(hash: string): string;
}

// Current implementation: FileStorage
// Future implementation: DatabaseStorage (PostgreSQL/MongoDB)
class FileStorage implements StorageInterface {
  // File-based operations using Node.js fs
}

// Usage (easily swappable):
const storage = new FileStorage(); // Now
// const storage = new DatabaseStorage(); // Future
```

#### 5. Backend Processing Components
```typescript
// /lib/backend/jd-processor.ts
class JobDescriptionProcessor {
  constructor(private storage: StorageInterface) {}

  async processFile(buffer: Buffer, fileName: string): Promise<{
    hash: string;
    extractedData: ExtractedJobData;
    cached: boolean;
  }> {
    const hash = generateFileHash(buffer);
    const cached = await this.storage.hasExtraction(hash);
    if (cached) {
      const extractedData = await this.storage.getExtraction(hash);
      if (extractedData) return { hash, extractedData, cached: true };
    }
    const extractedData = await this.callGeminiAPI(buffer);
    await this.storage.saveExtraction(hash, extractedData);
    await this.storage.saveUpload(hash, buffer);
    return { hash, extractedData, cached: false };
  }

  private async callGeminiAPI(buffer: Buffer): Promise<ExtractedJobData> {
    // Use @google/genai with inline PDF data
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: extractionPrompt },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: buffer.toString("base64"),
          },
        },
      ],
    });
    return parseGeminiResponse(response);
  }
}
```

#### 6. Frontend Integration (Simplified)
```typescript
// Frontend component just uploads and receives data
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/jobs/extract-jd', {
    method: 'POST',
    body: formData
  });

  const { data } = await response.json();
  setExtractedData(data.extractedData);
  setExtractionId(data.id);
};
```

#### 7. Benefits of Backend Approach
- **Reliability**: Backend can handle large files without browser limitations
- **Performance**: Client only waits for API response, no heavy processing
- **Caching**: Same PDFs are processed once and cached forever
- **Deduplication**: Hash-based storage eliminates duplicate processing
- **Security**: Sensitive documents processed on secure backend
- **Scalability**: Easy to migrate from files to database later
- **Resource Efficiency**: Client devices don't need powerful processing

#### 8. Migration Path to Database
```typescript
// Same interface, different implementation
class DatabaseStorage implements StorageInterface {
  async getExtraction(hash: string): Promise<ExtractedJobData | null> {
    return await db.extractions.findUnique({ where: { hash } });
  }

  async saveExtraction(hash: string, data: ExtractedJobData): Promise<void> {
    await db.extractions.upsert({ where: { hash }, data });
  }

  async saveUpload(hash: string, buffer: ArrayBuffer): Promise<string> {
    // Save to cloud storage (S3, etc.) and return URL
    return await cloudStorage.upload(hash, buffer);
  }
}

// Zero frontend code changes required
```

### Component Architecture - Small, Focused Components

**Current Problem**: `CVUpload.tsx` is 162 lines and mixes multiple responsibilities
- File validation logic
- Drag & drop handlers
- File selection state
- Upload progress UI
- Error display
- Processing state

**Solution: Break into smaller, reusable components**

#### 1. Core Generic Components
```typescript
// /components/ui/file-upload/FileUploadZone.tsx (30 lines)
// Handles drag & drop zone, file input, basic UI
interface FileUploadZoneProps {
  accept: string[];
  maxSize: number;
  onFilesDrop: (files: File[]) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

// /components/ui/file-upload/FileValidation.tsx (20 lines)
// File validation logic
interface FileValidationConfig {
  allowedTypes: string[];
  maxSize: number;
}
export function validateFiles(files: File[], config: FileValidationConfig): ValidationResult

// /components/ui/file-upload/FilePreview.tsx (25 lines)
// Selected file preview with remove option
interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  showSize?: boolean;
}

// /components/ui/file-upload/UploadProgress.tsx (20 lines)
// Processing/uploading state
interface UploadProgressProps {
  isProcessing: boolean;
  title?: string;
  description?: string;
}

// /components/ui/file-upload/FileUploadError.tsx (15 lines)
// Error display component
interface FileUploadErrorProps {
  error: string;
  onDismiss?: () => void;
}

// /components/ui/file-upload/FileUploadContainer.tsx (40 lines)
// Orchestrates all smaller components
interface FileUploadContainerProps {
  config: FileValidationConfig;
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
  acceptedFormatsText?: string;
}
```

#### 2. Specialized Wrapper Components
```typescript
// /components/CVUploadSection.tsx (15 lines)
// CV-specific wrapper using generic FileUploadContainer
export function CVUploadSection(props: CVUploadProps) {
  return (
    <FileUploadContainer
      config={{
        allowedTypes: ['application/pdf'],
        maxSize: 10 * 1024 * 1024,
      }}
      title="Upload CV"
      description="Share your professional experience"
      acceptedFormatsText="PDF only, Max 10MB"
      onFileSelect={props.onFileSelect}
      isProcessing={props.isProcessing}
      error={props.error}
    />
  );
}

// /components/job-creation/DocumentUploadSection.tsx (15 lines)
// JD-specific wrapper using generic FileUploadContainer (PDF only)
export function DocumentUploadSection(props: DocumentUploadProps) {
  return (
    <FileUploadContainer
      config={{
        allowedTypes: ['application/pdf'],
        maxSize: 10 * 1024 * 1024,
      }}
      title="Upload Job Description"
      description="Share the role you're hiring for"
      acceptedFormatsText="PDF only, Max 10MB"
      onFileSelect={props.onFileSelect}
      isProcessing={props.isProcessing}
      error={props.error}
    />
  );
}
```

#### 3. Additional Small Components for Job Creation
```typescript
// /components/ui/stepper/StepIndicator.tsx (20 lines)
// Step progress indicator
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
}

// /components/ui/stepper/StepNavigation.tsx (25 lines)
// Previous/Next navigation buttons
interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

// /components/ui/suggestion/SuggestionCard.tsx (30 lines)
// Individual AI suggestion card
interface SuggestionCardProps {
  suggestion: JDSuggestion;
  onAccept: () => void;
  onReject: () => void;
}

// /components/ui/suggestion/SuggestionList.tsx (25 lines)
// List of suggestions grouped by category
interface SuggestionListProps {
  suggestions: JDSuggestion[];
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
}

// /components/ui/question/QuestionBuilder.tsx (35 lines)
// Individual question editor
interface QuestionBuilderProps {
  question: CustomQuestion;
  onUpdate: (question: CustomQuestion) => void;
  onDelete: () => void;
}

// /components/ui/question/QuestionList.tsx (30 lines)
// List of questions with drag-and-drop
interface QuestionListProps {
  questions: CustomQuestion[];
  onUpdateQuestion: (id: string, question: CustomQuestion) => void;
  onDeleteQuestion: (id: string) => void;
  onReorderQuestions: (fromIndex: number, toIndex: number) => void;
}
```

#### 4. Benefits of Small Component Architecture
- **Reusability**: Each component has a single, well-defined purpose
- **Maintainability**: Easier to debug, test, and modify individual pieces
- **Composability**: Components can be combined in different ways
- **Testing**: Smaller components are easier to unit test
- **Performance**: Smaller components can be lazy-loaded and optimized
- **Team Development**: Different developers can work on different components

#### 5. Migration Strategy
1. **Phase 1**: Create generic small components alongside existing CVUpload
2. **Phase 2**: Create new specialized wrappers (CVUploadSection, DocumentUploadSection)
3. **Phase 3**: Update existing pages to use new components
4. **Phase 4**: Remove old CVUpload.tsx after migration complete

### AI Extraction & Suggestions (leveraging existing Python AI infrastructure)
- **Extraction Prompt**: Structured JSON output with fields: title, responsibilities[], requirements[], seniority, location, employmentType
- **Suggestion Prompt**: Generate 3-5 improvements per section with categorized tags (inclusiveness, clarity, skills, seniority)
- **Integration**: Use existing Vision-Agents framework pattern but from Next.js API routes calling Gemini directly
- **User Control**: All AI suggestions are optional; users can accept/reject individually or in bulk

### Question Types
1. **Short Answer**: Single-line text input
2. **Long Answer**: Multi-line textarea
3. **Multiple Choice**: Radio buttons with custom options
4. **Scored**: Dropdown or slider (1-5 scale, yes/no, custom ranges)

### Data Model (following existing TypeScript interface patterns)
```typescript
// New interfaces in /lib/mock-data.ts (following existing patterns)
export interface CustomQuestion {
  id: string;
  jobPostingId: string;
  type: "SHORT_ANSWER" | "LONG_ANSWER" | "MULTIPLE_CHOICE" | "SCORED";
  content: string;
  options?: string[]; // For multiple choice
  scoringConfig?: { type: string; min: number; max: number }; // For scored questions
  required: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobDescriptionVersion {
  id: string;
  jobPostingId: string;
  originalText: string;
  extractedData: {
    title: string;
    responsibilities: string[];
    requirements: string[];
    seniority: string;
    location: string;
    employmentType: string;
  };
  aiSuggestions: {
    category: string;
    text: string;
    original: string;
    improved: string;
    tag: string;
  }[];
  acceptedChanges: {
    category: string;
    changes: string[];
  }[];
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extend existing Job interface
export interface Job {
  // ... existing fields
  customQuestions?: CustomQuestion[];
  jdVersion?: JobDescriptionVersion;
}
```

### Stepper Flow
1. **Upload JD** → Upload file or paste text
2. **Review Extraction** → Edit extracted fields
3. **AI Suggestions** → Review and accept improvements
4. **Custom Questions** → Add screening questions
5. **Preview & Publish** → See candidate view, publish job

### UI/UX Principles (following existing design patterns)
- **Light Theme**: Following existing `/app/hr/jobs/page.tsx` patterns with `bg-card`, `border-border`, `text-foreground`
- **Components**: Reuse existing Shadcn UI components (`Card`, `Button`, `Badge`, `Tabs`, `Dialog`, `Input`, `Textarea`)
- **Icons**: Lucide icons (already imported and used throughout the app)
- **Styling**: Tailwind CSS patterns (consistent with existing HR pages: `rounded-xl`, `p-6`, `gap-6`)
- **Feedback**: Reuse existing toast patterns (`sonner` already installed) and loading states
- **Layout**: Follow existing responsive patterns (`max-w-7xl mx-auto`, `md:grid-cols-2`)

## Risks & Mitigation

### Risk: AI Extraction Accuracy
- **Mitigation**: Always show extracted data for user review and editing before saving
- **Mitigation**: Provide manual entry option if extraction fails

### Risk: File Upload Limits
- **Mitigation**: Enforce 10MB file size limit
- **Mitigation**: Display clear error messages for unsupported formats

### Risk: Complex Question Builder UX
- **Mitigation**: Use progressive disclosure (show advanced options on demand)
- **Mitigation**: Provide templates for common question types

## Open Questions

1. Should we support bulk upload of multiple JDs at once? (Recommendation: Phase 2)
2. Should AI suggestions be versioned/tracked for analytics? (Recommendation: Yes, store in acceptedChanges)
3. Should we support JD templates for common roles? (Recommendation: Phase 2)
