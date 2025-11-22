/**
 * Mock Data Layer for SyncHire
 *
 * Provides static data for testing without database.
 * All data access goes through helper functions to make
 * future database integration easier (e.g., Prisma).
 */

// =============================================================================
// Types
// =============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYER" | "CANDIDATE";
  createdAt: Date;
}

export type InterviewStage =
  | "Introduction"
  | "Technical Skills"
  | "Problem Solving"
  | "Behavioral"
  | "Wrap-up";

export interface Question {
  id: string;
  text: string;
  type: "video" | "text" | "code";
  duration: number;
  category: InterviewStage;
  keyPoints?: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  department: string;
  location: string;
  type: string; // Employment type (Full-time, Part-time, etc.)
  workArrangement?: WorkArrangement; // Remote, Hybrid, On-site, etc.
  salary: string;
  postedAt: string;
  applicantsCount: number;
  description: string;
  requirements: string[];
  questions: Question[];
  employerId: string;
  createdAt: Date;
  customQuestions?: CustomQuestion[];
  jdVersion?: JobDescriptionVersion;
  status?: "DRAFT" | "ACTIVE" | "CLOSED";
  // AI Matching settings
  aiMatchingEnabled?: boolean; // Auto-match candidates when enabled
  aiMatchingThreshold?: number; // Minimum match % to auto-apply (default 80)
  aiMatchingStatus?: "scanning" | "complete" | "disabled"; // Current scan status
}

export interface AIEvaluation {
  overallScore: number;
  categories: {
    technicalKnowledge: number;
    problemSolving: number;
    communication: number;
    experienceRelevance: number;
  };
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface Interview {
  id: string;
  jobId: string;
  candidateId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  callId?: string;
  transcript?: string;
  score?: number;
  durationMinutes: number;
  createdAt: Date;
  completedAt?: Date;
  aiEvaluation?: AIEvaluation;
}

/**
 * JobApplication represents a job from the candidate's perspective
 * Includes the full job details plus candidate-specific application data
 */
export interface JobApplication {
  id: string;
  job: Job;
  candidateId: string;
  matchPercentage: number;
  status: "NOT_APPLIED" | "APPLIED" | "INTERVIEWING" | "COMPLETED";
  interviewId?: string; // Links to Interview once created
  appliedAt?: Date;
  createdAt: Date;
}

/**
 * CandidateApplication represents a persisted application record
 * Created when AI matching auto-applies a candidate or candidate manually applies
 */
export type ApplicationStatus =
  | "matching"           // AI is calculating match score
  | "generating_questions" // Generating personalized questions
  | "ready"              // Ready for interview
  | "interviewing"       // Interview in progress
  | "completed"          // Interview completed
  | "rejected";          // Application rejected

export interface CandidateApplication {
  id: string;
  jobId: string;
  cvId: string;
  candidateName: string;
  candidateEmail: string;
  matchScore: number;
  matchReasons: string[];    // Why this candidate matches
  skillGaps?: string[];      // Skills candidate is missing
  status: ApplicationStatus;
  questionsHash?: string;    // Link to questions-set file (cvId + jobId hash)
  interviewId?: string;      // Link to interview once started
  source: "ai_match" | "manual_apply"; // How the application was created
  createdAt: Date;
  updatedAt: Date;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  role: string;
  matchScore: number;
  status: "pending" | "approved" | "rejected";
  jobId: string;
}

export type QuestionType =
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "MULTIPLE_CHOICE"
  | "SCORED";

export interface CustomQuestion {
  id: string;
  jobPostingId: string;
  type: QuestionType;
  content: string;
  options?: string[];
  scoringConfig?: { type: string; min: number; max: number };
  required: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Employment type options
export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Not specified",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

// Work arrangement options
export const WORK_ARRANGEMENTS = [
  "Remote",
  "Hybrid",
  "On-site",
  "Flexible",
  "Not specified",
] as const;
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];

export interface ExtractedJobData {
  title: string;
  company: string;
  responsibilities: string[];
  requirements: string[];
  seniority: string;
  location: string;
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
}

export interface ExtractedCVData {
  personalInfo: {
    fullName: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    field: string;
    institution: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    gpa?: string;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  languages: Array<{
    language: string;
    proficiency: "Basic" | "Intermediate" | "Advanced" | "Native";
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export interface JobDescriptionVersion {
  id: string;
  jobPostingId: string;
  originalText: string;
  extractedData: ExtractedJobData;
  aiSuggestions: Array<{
    original: string;
    improved: string;
  }>;
  acceptedChanges: Array<{
    category: string;
    changes: string[];
  }>;
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JDSuggestion {
  id: string;
  original: string;
  improved: string;
  accepted: boolean;
}

export interface SuggestionResponse {
  id: string;
  suggestions: JDSuggestion[];
  cached: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

// =============================================================================
// Mock Data Storage (will be replaced by database)
// =============================================================================

// Single demo user for the candidate experience
// Configurable via environment variables
const DEMO_USER_ID = "demo-user";
const DEMO_USER_NAME =
  process.env.NEXT_PUBLIC_DEMO_USER_NAME || "Demo Candidate";
const DEMO_USER_EMAIL =
  process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || "demo@synchire.com";

const users: Record<string, User> = {
  "employer-1": {
    id: "employer-1",
    name: "TechCorp HR",
    email: "hr@techcorp.com",
    role: "EMPLOYER",
    createdAt: new Date("2025-01-01"),
  },
  [DEMO_USER_ID]: {
    id: DEMO_USER_ID,
    name: DEMO_USER_NAME,
    email: DEMO_USER_EMAIL,
    role: "CANDIDATE",
    createdAt: new Date("2025-01-05"),
  },
};

const jobs: Record<string, Job> = {
  "job-1": {
    id: "job-1",
    title: "Senior Frontend Engineer",
    company: "Stripe",
    department: "Engineering",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$180k - $220k",
    postedAt: "2 days ago",
    applicantsCount: 24,
    description:
      "Build beautiful, performant user interfaces for millions of businesses. Work with React, TypeScript, and modern web technologies.",
    requirements: [
      "5+ years of experience with React and TypeScript",
      "Strong understanding of modern CSS and responsive design",
      "Experience with state management solutions (Redux, Zustand)",
      "Familiarity with testing frameworks (Jest, Playwright)",
      "Excellent problem-solving skills",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about yourself and your experience with React.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: [
          "Professional background",
          "React expertise",
          "Recent projects",
        ],
      },
      {
        id: "q2",
        text: "How do you approach state management in large applications?",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["State patterns", "Redux vs Context", "Performance"],
      },
      {
        id: "q3",
        text: "Describe a challenging performance issue you solved.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: [
          "Problem identification",
          "Debugging approach",
          "Solution impact",
        ],
      },
      {
        id: "q4",
        text: "Tell me about a time you disagreed with a colleague. How did you handle it?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Communication", "Conflict resolution", "Outcome"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-03"),
  },
  "job-2": {
    id: "job-2",
    title: "Backend Engineer",
    company: "Databricks",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    salary: "$160k - $200k",
    postedAt: "5 days ago",
    applicantsCount: 18,
    description:
      "Build scalable APIs and services powering data analytics at scale. Work with Python, Go, and distributed systems.",
    requirements: [
      "4+ years of backend development experience",
      "Proficiency in Python or Go",
      "Experience with distributed systems",
      "Strong SQL and database design skills",
      "Experience with cloud platforms (AWS, GCP)",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your backend development experience.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Background", "Languages", "Scale experience"],
      },
      {
        id: "q2",
        text: "How do you design RESTful APIs? Walk me through your approach.",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["API design", "Versioning", "Documentation"],
      },
      {
        id: "q3",
        text: "Describe a complex database optimization you performed.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Query analysis", "Indexing", "Results"],
      },
      {
        id: "q4",
        text: "How do you handle tight deadlines with competing priorities?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Time management", "Prioritization", "Communication"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-04"),
  },
  "job-3": {
    id: "job-3",
    title: "Full Stack Engineer",
    company: "Vercel",
    department: "Engineering",
    location: "New York, NY",
    type: "Full-time",
    salary: "$150k - $190k",
    postedAt: "1 week ago",
    applicantsCount: 32,
    description:
      "Build the platform that powers the modern web. Work across the stack with Next.js, Node.js, and edge computing.",
    requirements: [
      "4+ years of full stack development",
      "Strong Next.js and React experience",
      "Node.js and serverless expertise",
      "Understanding of edge computing",
      "DevOps and CI/CD experience",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your full stack development journey.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Career path", "Tech stack", "Favorite projects"],
      },
      {
        id: "q2",
        text: "How do you decide between server-side and client-side rendering?",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: [
          "SSR vs CSR",
          "Performance trade-offs",
          "SEO considerations",
        ],
      },
      {
        id: "q3",
        text: "Describe how you would debug a production performance issue.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Monitoring tools", "Root cause analysis", "Resolution"],
      },
      {
        id: "q4",
        text: "How do you stay current with rapidly evolving web technologies?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: [
          "Learning approach",
          "Community involvement",
          "Experimentation",
        ],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-05"),
  },
  "job-4": {
    id: "job-4",
    title: "DevOps Engineer",
    company: "Cloudflare",
    department: "Engineering",
    location: "Austin, TX",
    type: "Full-time",
    salary: "$150k - $190k",
    postedAt: "3 days ago",
    applicantsCount: 15,
    description:
      "Build and maintain infrastructure serving millions of requests per second. Work with Kubernetes, Terraform, and global edge networks.",
    requirements: [
      "4+ years of DevOps/SRE experience",
      "Strong Kubernetes expertise",
      "Infrastructure as Code (Terraform)",
      "Cloud platforms (AWS, GCP, Azure)",
      "Monitoring and observability tools",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your infrastructure and DevOps experience.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Background", "Scale", "Key achievements"],
      },
      {
        id: "q2",
        text: "How do you approach infrastructure as code?",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["Terraform patterns", "State management", "Modularity"],
      },
      {
        id: "q3",
        text: "Describe a production incident you handled. What was your approach?",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Incident response", "Root cause", "Prevention"],
      },
      {
        id: "q4",
        text: "How do you balance deployment speed with system reliability?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Trade-offs", "CI/CD", "Risk management"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-06"),
  },
  "job-5": {
    id: "job-5",
    title: "ML Engineer",
    company: "Google",
    department: "Engineering",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$200k - $280k",
    postedAt: "1 day ago",
    applicantsCount: 47,
    description:
      "Build and deploy machine learning systems at scale. Work on cutting-edge AI infrastructure and model deployment.",
    requirements: [
      "MS/PhD in CS, ML, or related field",
      "Strong Python and ML frameworks",
      "Experience with PyTorch or TensorFlow",
      "MLOps and model deployment",
      "Distributed training experience",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your ML engineering background.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Education", "Research", "Production ML"],
      },
      {
        id: "q2",
        text: "Walk me through deploying an ML model to production.",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["Pipeline", "Monitoring", "Iteration"],
      },
      {
        id: "q3",
        text: "How do you handle model performance degradation in production?",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Detection", "Diagnosis", "Retraining"],
      },
      {
        id: "q4",
        text: "Describe collaborating with research scientists on a project.",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Communication", "Translation", "Iteration"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-08"),
  },
  "job-6": {
    id: "job-6",
    title: "Mobile Engineer",
    company: "Spotify",
    department: "Engineering",
    location: "Stockholm, Sweden",
    type: "Full-time",
    salary: "$130k - $170k",
    postedAt: "4 days ago",
    applicantsCount: 21,
    description:
      "Build mobile experiences for hundreds of millions of users. Work with React Native, Swift, and Kotlin.",
    requirements: [
      "4+ years of mobile development",
      "React Native or Flutter expertise",
      "iOS (Swift) or Android (Kotlin)",
      "Mobile CI/CD pipelines",
      "Performance optimization",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your mobile development experience.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Platforms", "Scale", "Notable apps"],
      },
      {
        id: "q2",
        text: "How do you approach cross-platform development trade-offs?",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["Native vs cross-platform", "Code sharing", "Performance"],
      },
      {
        id: "q3",
        text: "Describe optimizing mobile app performance and battery usage.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Profiling", "Optimization", "Metrics"],
      },
      {
        id: "q4",
        text: "How do you handle app store reviews and user feedback?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Process", "Prioritization", "Iteration"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-07"),
  },
  "job-7": {
    id: "job-7",
    title: "Senior React Developer",
    company: "Meta",
    department: "Engineering",
    location: "Menlo Park, CA",
    type: "Full-time",
    salary: "$190k - $240k",
    postedAt: "1 week ago",
    applicantsCount: 35,
    description:
      "Build next-generation social products used by billions. Work with React, GraphQL, and cutting-edge web technologies.",
    requirements: [
      "6+ years of React development",
      "Deep understanding of JavaScript/TypeScript",
      "Experience with GraphQL and Relay",
      "Performance optimization at scale",
      "Strong system design skills",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your experience building large-scale React applications.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Scale", "Architecture", "Impact"],
      },
      {
        id: "q2",
        text: "How do you optimize React performance for millions of users?",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["Rendering", "Memoization", "Code splitting"],
      },
      {
        id: "q3",
        text: "Describe a complex state management challenge you solved.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Problem", "Solution", "Trade-offs"],
      },
      {
        id: "q4",
        text: "How do you mentor junior developers?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Teaching", "Feedback", "Growth"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-02"),
  },
  "job-8": {
    id: "job-8",
    title: "Software Engineer - Infrastructure",
    company: "GitHub",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    salary: "$170k - $210k",
    postedAt: "3 days ago",
    applicantsCount: 28,
    description:
      "Build the infrastructure that powers millions of developers. Work with Ruby, Go, and Kubernetes at massive scale.",
    requirements: [
      "5+ years of infrastructure engineering",
      "Experience with Ruby and/or Go",
      "Kubernetes and container orchestration",
      "Database scaling (MySQL, Redis)",
      "Observability and monitoring",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your infrastructure engineering background.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Experience", "Technologies", "Scale"],
      },
      {
        id: "q2",
        text: "How do you approach scaling a monolithic application?",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["Strategy", "Migration", "Risk management"],
      },
      {
        id: "q3",
        text: "Describe handling a critical production database issue.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Detection", "Resolution", "Prevention"],
      },
      {
        id: "q4",
        text: "How do you balance feature velocity with system reliability?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Trade-offs", "Communication", "Process"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-01"),
  },
  "job-9": {
    id: "job-9",
    title: "Senior Backend Engineer",
    company: "Notion",
    department: "Engineering",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$175k - $215k",
    postedAt: "5 days ago",
    applicantsCount: 42,
    description:
      "Build the collaborative workspace used by millions. Work with TypeScript, PostgreSQL, and real-time systems.",
    requirements: [
      "5+ years of backend development",
      "Strong TypeScript/Node.js skills",
      "Real-time systems experience",
      "PostgreSQL and database optimization",
      "API design and scaling",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your backend engineering experience.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Background", "Stack", "Achievements"],
      },
      {
        id: "q2",
        text: "How do you design APIs for real-time collaboration?",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["WebSockets", "CRDT", "Conflict resolution"],
      },
      {
        id: "q3",
        text: "Describe optimizing a slow database query at scale.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Analysis", "Indexing", "Results"],
      },
      {
        id: "q4",
        text: "How do you handle technical debt while shipping features?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Prioritization", "Balance", "Strategy"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2024-12-28"),
  },
};

const customQuestions: Record<string, CustomQuestion> = {};
const jobDescriptionVersions: Record<string, JobDescriptionVersion> = {};

// All interviews are for the demo user
const interviews: Record<string, Interview> = {
  "interview-1": {
    id: "interview-1",
    jobId: "job-1",
    candidateId: DEMO_USER_ID,
    status: "PENDING",
    durationMinutes: 30,
    createdAt: new Date("2025-01-08"),
  },
  "interview-2": {
    id: "interview-2",
    jobId: "job-2",
    candidateId: DEMO_USER_ID,
    status: "PENDING",
    durationMinutes: 30,
    createdAt: new Date("2025-01-08"),
  },
  "interview-3": {
    id: "interview-3",
    jobId: "job-3",
    candidateId: DEMO_USER_ID,
    status: "PENDING",
    durationMinutes: 30,
    createdAt: new Date("2025-01-08"),
  },
  "interview-4": {
    id: "interview-4",
    jobId: "job-4",
    candidateId: DEMO_USER_ID,
    status: "PENDING",
    durationMinutes: 30,
    createdAt: new Date("2025-01-08"),
  },
  "interview-5": {
    id: "interview-5",
    jobId: "job-5",
    candidateId: DEMO_USER_ID,
    status: "PENDING",
    durationMinutes: 30,
    createdAt: new Date("2025-01-09"),
  },
  "interview-6": {
    id: "interview-6",
    jobId: "job-6",
    candidateId: DEMO_USER_ID,
    status: "COMPLETED",
    durationMinutes: 30,
    score: 87,
    createdAt: new Date("2025-01-09"),
  },
  "interview-7": {
    id: "interview-7",
    jobId: "job-7",
    candidateId: DEMO_USER_ID,
    status: "COMPLETED",
    durationMinutes: 28,
    score: 74,
    createdAt: new Date("2025-01-15"),
  },
  "interview-8": {
    id: "interview-8",
    jobId: "job-8",
    candidateId: DEMO_USER_ID,
    status: "COMPLETED",
    durationMinutes: 32,
    score: 78,
    createdAt: new Date("2025-01-12"),
  },
  "interview-9": {
    id: "interview-9",
    jobId: "job-9",
    candidateId: DEMO_USER_ID,
    status: "COMPLETED",
    durationMinutes: 25,
    score: 85,
    createdAt: new Date("2025-01-10"),
  },
};

const applicants: Record<string, Applicant> = {};

// =============================================================================
// Data Access Functions (will be replaced by Prisma/database calls)
// =============================================================================

// Users
export function getUserById(id: string): User | undefined {
  return users[id];
}

export function getAllUsers(): User[] {
  return Object.values(users);
}

export function getDemoUser(): User {
  return users[DEMO_USER_ID];
}

// Jobs - these are now accessed through APIs that merge file and memory storage
// For backward compatibility, provide synchronous access to memory storage only
export function getJobById(id: string): Job | undefined {
  return jobs[id];
}

export function getAllJobs(): Job[] {
  return Object.values(jobs);
}

// Interviews
export function getInterviewById(id: string): Interview | undefined {
  return interviews[id];
}

export function getAllInterviews(): Interview[] {
  return Object.values(interviews);
}

export function getInterviewsByStatus(
  status: Interview["status"],
): Interview[] {
  return Object.values(interviews).filter((i) => i.status === status);
}

export function getInterviewsForUser(userId: string): Interview[] {
  return Object.values(interviews).filter((i) => i.candidateId === userId);
}

export function createInterview(
  jobId: string,
  candidateId: string,
  durationMinutes = 30,
): Interview {
  const id = `interview-${Date.now()}`;
  const interview: Interview = {
    id,
    jobId,
    candidateId,
    status: "PENDING",
    durationMinutes,
    createdAt: new Date(),
  };
  interviews[id] = interview;
  return interview;
}

export function updateInterview(
  id: string,
  updates: Partial<Interview>,
): Interview | undefined {
  const interview = interviews[id];
  if (interview === undefined) {
    return undefined;
  }
  interviews[id] = { ...interview, ...updates };
  return interviews[id];
}

// Applicants
export function getApplicantById(id: string): Applicant | undefined {
  return applicants[id];
}

export function getAllApplicants(): Applicant[] {
  return Object.values(applicants);
}

export function getApplicantsByJobId(jobId: string): Applicant[] {
  return Object.values(applicants).filter((a) => a.jobId === jobId);
}

export function updateApplicantStatus(
  id: string,
  status: Applicant["status"],
): Applicant | undefined {
  const applicant = applicants[id];
  if (applicant === undefined) {
    return undefined;
  }
  applicants[id] = { ...applicant, status };
  return applicants[id];
}

// Custom Questions
export function getCustomQuestionsByJobId(
  jobPostingId: string,
): CustomQuestion[] {
  return Object.values(customQuestions).filter(
    (q) => q.jobPostingId === jobPostingId,
  );
}

export function createCustomQuestion(
  jobPostingId: string,
  type: QuestionType,
  content: string,
  order: number,
  required: boolean = false,
  options?: string[],
  scoringConfig?: { type: string; min: number; max: number },
): CustomQuestion {
  const id = `question-${Date.now()}`;
  const question: CustomQuestion = {
    id,
    jobPostingId,
    type,
    content,
    order,
    required,
    options,
    scoringConfig,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  customQuestions[id] = question;
  return question;
}

export function updateCustomQuestion(
  id: string,
  updates: Partial<CustomQuestion>,
): CustomQuestion | undefined {
  const question = customQuestions[id];
  if (question === undefined) {
    return undefined;
  }
  customQuestions[id] = {
    ...question,
    ...updates,
    updatedAt: new Date(),
  };
  return customQuestions[id];
}

export function deleteCustomQuestion(id: string): boolean {
  if (customQuestions[id] === undefined) {
    return false;
  }
  delete customQuestions[id];
  return true;
}

// Job Description Versions
export function getJobDescriptionVersion(
  jobPostingId: string,
): JobDescriptionVersion | undefined {
  return Object.values(jobDescriptionVersions).find(
    (v) => v.jobPostingId === jobPostingId,
  );
}

export function createJobDescriptionVersion(
  jobPostingId: string,
  originalText: string,
  extractedData: ExtractedJobData,
  documentUrl?: string,
): JobDescriptionVersion {
  const id = `jd-version-${Date.now()}`;
  const version: JobDescriptionVersion = {
    id,
    jobPostingId,
    originalText,
    extractedData,
    aiSuggestions: [],
    acceptedChanges: [],
    documentUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  jobDescriptionVersions[id] = version;
  return version;
}

export function updateJobDescriptionVersion(
  jobPostingId: string,
  updates: Partial<JobDescriptionVersion>,
): JobDescriptionVersion | undefined {
  const version = Object.values(jobDescriptionVersions).find(
    (v) => v.jobPostingId === jobPostingId,
  );
  if (version === undefined) {
    return undefined;
  }
  jobDescriptionVersions[version.id] = {
    ...version,
    ...updates,
    updatedAt: new Date(),
  };
  return jobDescriptionVersions[version.id];
}

// Job Updates
export function createJob(jobData: Partial<Job>): Job {
  const id = `job-${Date.now()}`;
  const job: Job = {
    id,
    title: jobData.title || "Untitled Position",
    company: jobData.company || "",
    department: jobData.department || "",
    location: jobData.location || "",
    type: jobData.type || "Full-time",
    salary: jobData.salary || "",
    postedAt: jobData.postedAt || "Just now",
    applicantsCount: jobData.applicantsCount || 0,
    description: jobData.description || "",
    requirements: jobData.requirements || [],
    questions: jobData.questions || [],
    employerId: jobData.employerId || "",
    createdAt: jobData.createdAt || new Date(),
    status: jobData.status || "DRAFT",
    customQuestions: jobData.customQuestions || [],
    jdVersion: jobData.jdVersion,
  };
  jobs[id] = job;
  return job;
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs[id];
  if (job === undefined) {
    return undefined;
  }
  jobs[id] = { ...job, ...updates };
  return jobs[id];
}

// =============================================================================
// Legacy Exports (for backward compatibility)
// =============================================================================

export const mockUsers = users;
export const mockJobs = getAllJobs();
export const mockInterviews = interviews;
export const mockApplicants = getAllApplicants();
export const mockQuestions = jobs["job-1"]?.questions ?? [];

// =============================================================================
// Demo Fallback Data
// =============================================================================

/**
 * Demo CV data for candidates who haven't uploaded their own CV
 * Used to ensure the demo flow works without requiring actual uploads
 */
export const demoCVExtraction: ExtractedCVData = {
  personalInfo: {
    fullName: DEMO_USER_NAME,
    email: DEMO_USER_EMAIL,
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    summary:
      "Full-stack engineer with 5+ years of experience building scalable web applications. Passionate about clean code, user experience, and modern development practices. Experienced with React, Node.js, TypeScript, and cloud infrastructure.",
    linkedinUrl: "https://linkedin.com/in/demo-candidate",
    githubUrl: "https://github.com/demo-candidate",
  },
  experience: [
    {
      title: "Senior Software Engineer",
      company: "TechStartup Inc.",
      location: "San Francisco, CA",
      startDate: "2022-01",
      current: true,
      description: [
        "Led development of customer-facing dashboard serving 50K+ users",
        "Architected microservices migration reducing latency by 40%",
        "Mentored team of 3 junior developers on React best practices",
        "Implemented CI/CD pipelines reducing deployment time by 60%",
      ],
    },
    {
      title: "Software Engineer",
      company: "Digital Agency Co.",
      location: "New York, NY",
      startDate: "2019-06",
      endDate: "2021-12",
      current: false,
      description: [
        "Built responsive web applications for Fortune 500 clients",
        "Developed RESTful APIs using Node.js and Express",
        "Collaborated with design team to implement pixel-perfect UIs",
        "Optimized database queries improving page load times by 30%",
      ],
    },
    {
      title: "Junior Developer",
      company: "WebDev Solutions",
      location: "Boston, MA",
      startDate: "2018-01",
      endDate: "2019-05",
      current: false,
      description: [
        "Developed and maintained client websites using React and Vue.js",
        "Participated in code reviews and agile development processes",
        "Wrote unit tests achieving 80% code coverage",
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor of Science",
      field: "Computer Science",
      institution: "University of California, Berkeley",
      location: "Berkeley, CA",
      startDate: "2014-09",
      endDate: "2018-05",
      current: false,
      gpa: "3.7",
    },
  ],
  skills: [
    "React",
    "TypeScript",
    "Node.js",
    "Python",
    "PostgreSQL",
    "MongoDB",
    "AWS",
    "Docker",
    "Kubernetes",
    "GraphQL",
    "REST APIs",
    "Git",
    "CI/CD",
    "Agile/Scrum",
  ],
  certifications: [
    {
      name: "AWS Solutions Architect Associate",
      issuer: "Amazon Web Services",
      issueDate: "2023-03",
    },
  ],
  languages: [
    { language: "English", proficiency: "Native" },
    { language: "Spanish", proficiency: "Intermediate" },
  ],
  projects: [
    {
      name: "Open Source Dashboard",
      description:
        "React-based analytics dashboard with real-time data visualization",
      technologies: ["React", "D3.js", "WebSocket", "Node.js"],
      url: "https://github.com/demo-candidate/dashboard",
    },
  ],
};

/**
 * Demo applicants for HR view when no real interviews exist
 * These represent completed interviews with various scores
 */
export interface DemoApplicant {
  id: string;
  name: string;
  email: string;
  score: number;
  status: "pending" | "approved" | "rejected";
  completedAt: Date;
  durationMinutes: number;
  aiEvaluation?: AIEvaluation;
}

export const demoApplicants: DemoApplicant[] = [
  {
    id: "demo-applicant-1",
    name: "Sarah Chen",
    email: "sarah.chen@email.com",
    score: 92,
    status: "approved",
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    durationMinutes: 28,
    aiEvaluation: {
      overallScore: 92,
      categories: {
        technicalKnowledge: 95,
        problemSolving: 90,
        communication: 92,
        experienceRelevance: 91,
      },
      strengths: [
        "Exceptional technical depth in React and TypeScript",
        "Clear and structured communication style",
        "Strong system design understanding",
      ],
      improvements: [
        "Could elaborate more on leadership experience",
      ],
      summary:
        "Outstanding candidate with excellent technical skills and communication. Highly recommended for the role.",
    },
  },
  {
    id: "demo-applicant-2",
    name: "Marcus Johnson",
    email: "marcus.j@email.com",
    score: 78,
    status: "pending",
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    durationMinutes: 32,
    aiEvaluation: {
      overallScore: 78,
      categories: {
        technicalKnowledge: 82,
        problemSolving: 75,
        communication: 80,
        experienceRelevance: 74,
      },
      strengths: [
        "Solid foundation in backend development",
        "Good problem-solving approach",
        "Enthusiastic and eager to learn",
      ],
      improvements: [
        "Could benefit from more frontend experience",
        "Consider discussing scalability approaches in more depth",
      ],
      summary:
        "Good candidate with solid fundamentals. May need some ramp-up time but shows potential for growth.",
    },
  },
  {
    id: "demo-applicant-3",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    score: 85,
    status: "pending",
    completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    durationMinutes: 30,
    aiEvaluation: {
      overallScore: 85,
      categories: {
        technicalKnowledge: 88,
        problemSolving: 84,
        communication: 86,
        experienceRelevance: 82,
      },
      strengths: [
        "Strong full-stack experience",
        "Excellent problem decomposition skills",
        "Good cultural fit indicators",
      ],
      improvements: [
        "Could provide more specific metrics from past projects",
      ],
      summary:
        "Strong candidate with well-rounded skills. Would be a valuable addition to the team.",
    },
  },
];

/**
 * Get demo CV extraction data
 * Returns the demo CV for candidates who haven't uploaded their own
 */
export function getDemoCVExtraction(): ExtractedCVData {
  return demoCVExtraction;
}

/**
 * Get demo applicants for a job
 * Used when no real interviews exist for a job
 */
export function getDemoApplicants(): DemoApplicant[] {
  return demoApplicants;
}
