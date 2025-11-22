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
  durationMinutes: number; // Expected duration in minutes
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

const users: Record<string, User> = {
  "employer-1": {
    id: "employer-1",
    name: "Sarah Chen",
    email: "sarah@techcorp.com",
    role: "EMPLOYER",
    createdAt: new Date("2025-01-01"),
  },
  "candidate-1": {
    id: "candidate-1",
    name: "John Smith",
    email: "john.smith@example.com",
    role: "CANDIDATE",
    createdAt: new Date("2025-01-05"),
  },
  "candidate-2": {
    id: "candidate-2",
    name: "Jamie Rodriguez",
    email: "jamie@example.com",
    role: "CANDIDATE",
    createdAt: new Date("2025-01-06"),
  },
  "candidate-3": {
    id: "candidate-3",
    name: "Alex Thompson",
    email: "alex@example.com",
    role: "CANDIDATE",
    createdAt: new Date("2025-01-07"),
  },
  "candidate-4": {
    id: "candidate-4",
    name: "Maria Garcia",
    email: "maria@example.com",
    role: "CANDIDATE",
    createdAt: new Date("2025-01-08"),
  },
  "candidate-5": {
    id: "candidate-5",
    name: "David Kim",
    email: "david@example.com",
    role: "CANDIDATE",
    createdAt: new Date("2025-01-09"),
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
      "We are looking for an experienced Frontend Engineer to join our growing team. You will work on building beautiful, performant user interfaces using React and TypeScript.",
    requirements: [
      "5+ years of experience with React and TypeScript",
      "Strong understanding of modern CSS and responsive design",
      "Experience with state management solutions (Redux, Zustand, etc.)",
      "Familiarity with testing frameworks (Jest, React Testing Library)",
      "Excellent communication and collaboration skills",
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
        text: "How do you approach state management in large applications? Walk me through your decision process.",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: [
          "State management patterns",
          "Redux vs Context",
          "Performance considerations",
        ],
      },
      {
        id: "q3",
        text: "Describe a challenging performance issue you solved. What tools and techniques did you use?",
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
        text: "Tell me about a time you had a disagreement with a colleague. How did you handle it?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Communication", "Conflict resolution", "Outcome"],
      },
      {
        id: "q5",
        text: "Do you have any questions for us? What are your salary expectations?",
        type: "video",
        duration: 2,
        category: "Wrap-up",
        keyPoints: ["Questions for company", "Expectations", "Next steps"],
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
      "Join our backend team to build scalable APIs and services. You will work with Python, FastAPI, and PostgreSQL to power our growing platform.",
    requirements: [
      "4+ years of experience with Python",
      "Experience with FastAPI or similar frameworks",
      "Strong SQL and database design skills",
      "Understanding of distributed systems",
      "Experience with Docker and Kubernetes",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about yourself and your backend development journey.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Background", "Python experience", "Career goals"],
      },
      {
        id: "q2",
        text: "How do you design RESTful APIs? Walk me through your approach to API versioning and documentation.",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["API design", "Documentation", "Best practices"],
      },
      {
        id: "q3",
        text: "Tell me about a complex database query you optimized. What was the impact?",
        type: "video",
        duration: 2,
        category: "Problem Solving",
        keyPoints: ["Query analysis", "Optimization approach", "Results"],
      },
      {
        id: "q4",
        text: "Describe a time when you had to meet a tight deadline. How did you manage?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Time management", "Prioritization", "Outcome"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-04"),
  },
  "job-3": {
    id: "job-3",
    title: "Product Designer",
    company: "Vercel",
    department: "Design",
    location: "New York, NY",
    type: "Full-time",
    salary: "$140k - $180k",
    postedAt: "1 week ago",
    applicantsCount: 32,
    description:
      "We are seeking a talented Product Designer to create intuitive and beautiful user experiences. You will collaborate closely with engineering and product teams.",
    requirements: [
      "3+ years of product design experience",
      "Proficiency in Figma and design systems",
      "Strong portfolio demonstrating UX process",
      "Experience with user research and testing",
      "Excellent visual design skills",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about yourself and what drew you to product design.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Design journey", "Inspiration", "Career path"],
      },
      {
        id: "q2",
        text: "Walk me through a recent project from your portfolio. What was your design process?",
        type: "video",
        duration: 4,
        category: "Technical Skills",
        keyPoints: ["Design process", "Tools used", "Iterations"],
      },
      {
        id: "q3",
        text: "How do you approach user research? Give me an example of how research influenced your design.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Research methods", "User insights", "Design decisions"],
      },
      {
        id: "q4",
        text: "Describe how you collaborate with engineers during the implementation phase.",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: [
          "Cross-team collaboration",
          "Communication",
          "Handoff process",
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
    department: "Infrastructure",
    location: "Austin, TX",
    type: "Full-time",
    salary: "$150k - $190k",
    postedAt: "3 days ago",
    applicantsCount: 15,
    description:
      "Join our infrastructure team to build and maintain scalable cloud systems. You will work with Kubernetes, Terraform, and AWS to ensure high availability.",
    requirements: [
      "4+ years of DevOps/SRE experience",
      "Strong Kubernetes and container orchestration skills",
      "Experience with Terraform and infrastructure as code",
      "AWS or GCP certification preferred",
      "Strong scripting skills (Python, Bash)",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about yourself and your experience with cloud infrastructure.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Background", "Cloud experience", "Key achievements"],
      },
      {
        id: "q2",
        text: "How do you approach infrastructure as code? Walk me through your Terraform workflow.",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["IaC principles", "Terraform patterns", "State management"],
      },
      {
        id: "q3",
        text: "Describe a production incident you handled. What was your approach to resolution?",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Incident response", "Root cause analysis", "Prevention"],
      },
      {
        id: "q4",
        text: "How do you balance speed of deployment with system reliability?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Trade-offs", "CI/CD practices", "Risk management"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-06"),
  },
  "job-5": {
    id: "job-5",
    title: "Data Scientist",
    company: "OpenAI",
    department: "Research",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$200k - $280k",
    postedAt: "1 day ago",
    applicantsCount: 47,
    description:
      "Work on cutting-edge ML models and data analysis. You will collaborate with researchers to develop and deploy machine learning solutions at scale.",
    requirements: [
      "PhD or MS in Computer Science, Statistics, or related field",
      "Strong Python and SQL skills",
      "Experience with PyTorch or TensorFlow",
      "Published research is a plus",
      "Experience with large-scale data processing",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about your background and what excites you about data science.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Academic background", "Research interests", "Motivation"],
      },
      {
        id: "q2",
        text: "Walk me through a machine learning project from data collection to deployment.",
        type: "video",
        duration: 4,
        category: "Technical Skills",
        keyPoints: ["ML pipeline", "Model selection", "Deployment strategy"],
      },
      {
        id: "q3",
        text: "How do you handle imbalanced datasets or missing data in your models?",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Data preprocessing", "Sampling techniques", "Validation"],
      },
      {
        id: "q4",
        text: "Describe a time when your model didn't perform as expected. What did you learn?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Failure analysis", "Iteration", "Learning mindset"],
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
      "Build amazing mobile experiences for millions of users. You will work on our iOS and Android apps using React Native and native technologies.",
    requirements: [
      "3+ years of mobile development experience",
      "Proficiency in React Native or Flutter",
      "Experience with iOS (Swift) or Android (Kotlin)",
      "Understanding of mobile CI/CD pipelines",
      "Eye for design and user experience",
    ],
    questions: [
      {
        id: "q1",
        text: "Tell me about yourself and your mobile development journey.",
        type: "video",
        duration: 3,
        category: "Introduction",
        keyPoints: ["Background", "Platform expertise", "Notable apps"],
      },
      {
        id: "q2",
        text: "How do you approach cross-platform development? What are the trade-offs?",
        type: "video",
        duration: 3,
        category: "Technical Skills",
        keyPoints: ["React Native vs native", "Code sharing", "Performance"],
      },
      {
        id: "q3",
        text: "Describe how you optimize mobile app performance and battery usage.",
        type: "video",
        duration: 3,
        category: "Problem Solving",
        keyPoints: ["Profiling tools", "Optimization techniques", "Metrics"],
      },
      {
        id: "q4",
        text: "How do you handle app store review processes and user feedback?",
        type: "video",
        duration: 2,
        category: "Behavioral",
        keyPoints: ["Release management", "User feedback", "Iteration"],
      },
    ],
    employerId: "employer-1",
    createdAt: new Date("2025-01-07"),
  },
};

const interviews: Record<string, Interview> = {
  "interview-1": {
    id: "interview-1",
    jobId: "job-1",
    candidateId: "candidate-1",
    status: "PENDING",
    durationMinutes: 30,
    createdAt: new Date("2025-01-08"),
  },
  "interview-2": {
    id: "interview-2",
    jobId: "job-2",
    candidateId: "candidate-2",
    status: "PENDING",
    durationMinutes: 45,
    createdAt: new Date("2025-01-08"),
  },
  "interview-3": {
    id: "interview-3",
    jobId: "job-3",
    candidateId: "candidate-3",
    status: "PENDING",
    durationMinutes: 30,
    createdAt: new Date("2025-01-08"),
  },
  "interview-4": {
    id: "interview-4",
    jobId: "job-1",
    candidateId: "candidate-4",
    status: "PENDING",
    durationMinutes: 30,
    createdAt: new Date("2025-01-08"),
  },
  "interview-5": {
    id: "interview-5",
    jobId: "job-2",
    candidateId: "candidate-5",
    status: "PENDING",
    durationMinutes: 45,
    createdAt: new Date("2025-01-09"),
  },
  "interview-6": {
    id: "interview-6",
    jobId: "job-1",
    candidateId: "candidate-2",
    status: "COMPLETED",
    callId: "call-completed-1",
    score: 85,
    durationMinutes: 30,
    createdAt: new Date("2025-01-07"),
  },
  "interview-7": {
    id: "interview-7",
    jobId: "job-3",
    candidateId: "candidate-1",
    status: "IN_PROGRESS",
    callId: "call-in-progress-1",
    durationMinutes: 30,
    createdAt: new Date("2025-01-09"),
  },
};

const applicants: Record<string, Applicant> = {
  "app-1": {
    id: "app-1",
    name: "Sarah Jenkins",
    email: "sarah.j@email.com",
    role: "Senior Frontend Engineer",
    matchScore: 98,
    status: "pending",
    jobId: "job-1",
  },
  "app-2": {
    id: "app-2",
    name: "Michael Chen",
    email: "michael.c@email.com",
    role: "Frontend Developer",
    matchScore: 92,
    status: "approved",
    jobId: "job-1",
  },
  "app-3": {
    id: "app-3",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    role: "React Developer",
    matchScore: 87,
    status: "pending",
    jobId: "job-1",
  },
  "app-4": {
    id: "app-4",
    name: "David Kim",
    email: "david.k@email.com",
    role: "Full Stack Engineer",
    matchScore: 84,
    status: "pending",
    jobId: "job-1",
  },
  "app-5": {
    id: "app-5",
    name: "Jessica Taylor",
    email: "jessica.t@email.com",
    role: "UI Engineer",
    matchScore: 79,
    status: "rejected",
    jobId: "job-1",
  },
  "app-6": {
    id: "app-6",
    name: "Alex Thompson",
    email: "alex.t@email.com",
    role: "Frontend Architect",
    matchScore: 91,
    status: "approved",
    jobId: "job-2",
  },
  "app-7": {
    id: "app-7",
    name: "Maria Garcia",
    email: "maria.g@email.com",
    role: "Senior React Developer",
    matchScore: 88,
    status: "pending",
    jobId: "job-2",
  },
  "app-8": {
    id: "app-8",
    name: "James Wilson",
    email: "james.w@email.com",
    role: "JavaScript Developer",
    matchScore: 76,
    status: "rejected",
    jobId: "job-3",
  },
};

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
