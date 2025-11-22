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
  role: 'EMPLOYER' | 'CANDIDATE';
  createdAt: Date;
}

export interface Question {
  id: string;
  text: string;
  type: 'video' | 'text' | 'code';
  duration: number;
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
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  callId?: string;
  transcript?: string;
  score?: number;
  createdAt: Date;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  role: string;
  matchScore: number;
  status: 'pending' | 'approved' | 'rejected';
  jobId: string;
}

// =============================================================================
// Mock Data Storage (will be replaced by database)
// =============================================================================

const users: Record<string, User> = {
  'employer-1': {
    id: 'employer-1',
    name: 'Sarah Chen',
    email: 'sarah@techcorp.com',
    role: 'EMPLOYER',
    createdAt: new Date('2025-01-01'),
  },
  'candidate-1': {
    id: 'candidate-1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'CANDIDATE',
    createdAt: new Date('2025-01-05'),
  },
  'candidate-2': {
    id: 'candidate-2',
    name: 'Jamie Rodriguez',
    email: 'jamie@example.com',
    role: 'CANDIDATE',
    createdAt: new Date('2025-01-06'),
  },
  'candidate-3': {
    id: 'candidate-3',
    name: 'Alex Thompson',
    email: 'alex@example.com',
    role: 'CANDIDATE',
    createdAt: new Date('2025-01-07'),
  },
  'candidate-4': {
    id: 'candidate-4',
    name: 'Maria Garcia',
    email: 'maria@example.com',
    role: 'CANDIDATE',
    createdAt: new Date('2025-01-08'),
  },
  'candidate-5': {
    id: 'candidate-5',
    name: 'David Kim',
    email: 'david@example.com',
    role: 'CANDIDATE',
    createdAt: new Date('2025-01-09'),
  },
};

const jobs: Record<string, Job> = {
  'job-1': {
    id: 'job-1',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: '$180k - $220k',
    postedAt: '2 days ago',
    applicantsCount: 24,
    description: 'We are looking for an experienced Frontend Engineer to join our growing team. You will work on building beautiful, performant user interfaces using React and TypeScript.',
    requirements: [
      '5+ years of experience with React and TypeScript',
      'Strong understanding of modern CSS and responsive design',
      'Experience with state management solutions (Redux, Zustand, etc.)',
      'Familiarity with testing frameworks (Jest, React Testing Library)',
      'Excellent communication and collaboration skills',
    ],
    questions: [
      { id: 'q1', text: 'Tell me about your experience with React and TypeScript. What patterns do you find most effective?', type: 'video', duration: 3 },
      { id: 'q2', text: 'How do you approach state management in large applications? Walk me through your decision process.', type: 'video', duration: 3 },
      { id: 'q3', text: 'Describe a challenging performance issue you solved. What tools and techniques did you use?', type: 'video', duration: 3 },
      { id: 'q4', text: 'How do you ensure code quality and maintainability in your projects?', type: 'video', duration: 2 },
      { id: 'q5', text: 'Tell me about a time you had to learn a new technology quickly. How did you approach it?', type: 'video', duration: 2 },
    ],
    employerId: 'employer-1',
    createdAt: new Date('2025-01-03'),
  },
  'job-2': {
    id: 'job-2',
    title: 'Backend Engineer',
    company: 'Databricks',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salary: '$160k - $200k',
    postedAt: '5 days ago',
    applicantsCount: 18,
    description: 'Join our backend team to build scalable APIs and services. You will work with Python, FastAPI, and PostgreSQL to power our growing platform.',
    requirements: [
      '4+ years of experience with Python',
      'Experience with FastAPI or similar frameworks',
      'Strong SQL and database design skills',
      'Understanding of distributed systems',
      'Experience with Docker and Kubernetes',
    ],
    questions: [
      { id: 'q1', text: 'Describe your experience with Python and FastAPI. What do you enjoy most about backend development?', type: 'video', duration: 3 },
      { id: 'q2', text: 'How do you design RESTful APIs? Walk me through your approach to API versioning and documentation.', type: 'video', duration: 3 },
      { id: 'q3', text: 'Tell me about a complex database query you optimized. What was the impact?', type: 'video', duration: 2 },
      { id: 'q4', text: 'How do you handle error handling and logging in production systems?', type: 'video', duration: 2 },
    ],
    employerId: 'employer-1',
    createdAt: new Date('2025-01-04'),
  },
  'job-3': {
    id: 'job-3',
    title: 'Product Designer',
    company: 'Vercel',
    department: 'Design',
    location: 'New York, NY',
    type: 'Full-time',
    salary: '$140k - $180k',
    postedAt: '1 week ago',
    applicantsCount: 32,
    description: 'We are seeking a talented Product Designer to create intuitive and beautiful user experiences. You will collaborate closely with engineering and product teams.',
    requirements: [
      '3+ years of product design experience',
      'Proficiency in Figma and design systems',
      'Strong portfolio demonstrating UX process',
      'Experience with user research and testing',
      'Excellent visual design skills',
    ],
    questions: [
      { id: 'q1', text: 'Walk me through a recent project from your portfolio. What was your design process?', type: 'video', duration: 4 },
      { id: 'q2', text: 'How do you approach user research? Give me an example of how research influenced your design.', type: 'video', duration: 3 },
      { id: 'q3', text: 'Describe how you collaborate with engineers during the implementation phase.', type: 'video', duration: 2 },
    ],
    employerId: 'employer-1',
    createdAt: new Date('2025-01-05'),
  },
};

const interviews: Record<string, Interview> = {
  'interview-1': {
    id: 'interview-1',
    jobId: 'job-1',
    candidateId: 'candidate-1',
    status: 'PENDING',
    createdAt: new Date('2025-01-08'),
  },
  'interview-2': {
    id: 'interview-2',
    jobId: 'job-2',
    candidateId: 'candidate-2',
    status: 'PENDING',
    createdAt: new Date('2025-01-08'),
  },
  'interview-3': {
    id: 'interview-3',
    jobId: 'job-3',
    candidateId: 'candidate-3',
    status: 'PENDING',
    createdAt: new Date('2025-01-08'),
  },
  'interview-4': {
    id: 'interview-4',
    jobId: 'job-1',
    candidateId: 'candidate-4',
    status: 'PENDING',
    createdAt: new Date('2025-01-08'),
  },
  'interview-5': {
    id: 'interview-5',
    jobId: 'job-2',
    candidateId: 'candidate-5',
    status: 'PENDING',
    createdAt: new Date('2025-01-09'),
  },
  'interview-6': {
    id: 'interview-6',
    jobId: 'job-1',
    candidateId: 'candidate-2',
    status: 'COMPLETED',
    callId: 'call-completed-1',
    score: 85,
    createdAt: new Date('2025-01-07'),
  },
  'interview-7': {
    id: 'interview-7',
    jobId: 'job-3',
    candidateId: 'candidate-1',
    status: 'IN_PROGRESS',
    callId: 'call-in-progress-1',
    createdAt: new Date('2025-01-09'),
  },
};

const applicants: Record<string, Applicant> = {
  'app-1': { id: 'app-1', name: 'Sarah Jenkins', email: 'sarah.j@email.com', role: 'Senior Frontend Engineer', matchScore: 98, status: 'pending', jobId: 'job-1' },
  'app-2': { id: 'app-2', name: 'Michael Chen', email: 'michael.c@email.com', role: 'Frontend Developer', matchScore: 92, status: 'approved', jobId: 'job-1' },
  'app-3': { id: 'app-3', name: 'Emily Rodriguez', email: 'emily.r@email.com', role: 'React Developer', matchScore: 87, status: 'pending', jobId: 'job-1' },
  'app-4': { id: 'app-4', name: 'David Kim', email: 'david.k@email.com', role: 'Full Stack Engineer', matchScore: 84, status: 'pending', jobId: 'job-1' },
  'app-5': { id: 'app-5', name: 'Jessica Taylor', email: 'jessica.t@email.com', role: 'UI Engineer', matchScore: 79, status: 'rejected', jobId: 'job-1' },
  'app-6': { id: 'app-6', name: 'Alex Thompson', email: 'alex.t@email.com', role: 'Frontend Architect', matchScore: 91, status: 'approved', jobId: 'job-2' },
  'app-7': { id: 'app-7', name: 'Maria Garcia', email: 'maria.g@email.com', role: 'Senior React Developer', matchScore: 88, status: 'pending', jobId: 'job-2' },
  'app-8': { id: 'app-8', name: 'James Wilson', email: 'james.w@email.com', role: 'JavaScript Developer', matchScore: 76, status: 'rejected', jobId: 'job-3' },
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

export function getInterviewsByStatus(status: Interview['status']): Interview[] {
  return Object.values(interviews).filter(i => i.status === status);
}

export function createInterview(jobId: string, candidateId: string): Interview {
  const id = `interview-${Date.now()}`;
  const interview: Interview = {
    id,
    jobId,
    candidateId,
    status: 'PENDING',
    createdAt: new Date(),
  };
  interviews[id] = interview;
  return interview;
}

export function updateInterview(id: string, updates: Partial<Interview>): Interview | undefined {
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
  return Object.values(applicants).filter(a => a.jobId === jobId);
}

export function updateApplicantStatus(id: string, status: Applicant['status']): Applicant | undefined {
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
export const mockQuestions = jobs['job-1']?.questions ?? [];
