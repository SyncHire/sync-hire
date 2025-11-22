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
  type: string;
  salary: string;
  postedAt: string;
  applicantsCount: number;
  description: string;
  requirements: string[];
  questions: Question[];
  employerId: string;
  createdAt: Date;
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

// =============================================================================
// Mock Data Storage (will be replaced by database)
// =============================================================================

// Single demo user for the candidate experience
// Configurable via environment variables
const DEMO_USER_ID = "demo-user";
const DEMO_USER_NAME = process.env.NEXT_PUBLIC_DEMO_USER_NAME || "Demo Candidate";
const DEMO_USER_EMAIL = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || "demo@synchire.com";

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
        keyPoints: ["Professional background", "React expertise", "Recent projects"],
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
        keyPoints: ["Problem identification", "Debugging approach", "Solution impact"],
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
        keyPoints: ["SSR vs CSR", "Performance trade-offs", "SEO considerations"],
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
        keyPoints: ["Learning approach", "Community involvement", "Experimentation"],
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
    company: "OpenAI",
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
};

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

// Jobs
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
  status: Interview["status"]
): Interview[] {
  return Object.values(interviews).filter((i) => i.status === status);
}

export function getInterviewsForUser(userId: string): Interview[] {
  return Object.values(interviews).filter((i) => i.candidateId === userId);
}

export function createInterview(
  jobId: string,
  candidateId: string,
  durationMinutes = 30
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
  updates: Partial<Interview>
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
  status: Applicant["status"]
): Applicant | undefined {
  const applicant = applicants[id];
  if (applicant === undefined) {
    return undefined;
  }
  applicants[id] = { ...applicant, status };
  return applicants[id];
}

// =============================================================================
// Legacy Exports (for backward compatibility)
// =============================================================================

export const mockUsers = users;
export const mockJobs = getAllJobs();
export const mockInterviews = interviews;
export const mockApplicants = getAllApplicants();
export const mockQuestions = jobs["job-1"]?.questions ?? [];
