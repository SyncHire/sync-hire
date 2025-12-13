// Employment types
export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACT = "contract",
  INTERNSHIP = "internship",
  FREELANCE = "freelance",
  OTHER = "other",
}

// Work arrangements
export enum WorkArrangement {
  ONSITE = "onsite",
  REMOTE = "remote",
  HYBRID = "hybrid",
}

// Processing status
export type ProcessingStatus = "queued" | "processing" | "completed" | "failed" | "needs_review";

// Processing step status
export type StepStatus = "pending" | "processing" | "completed" | "failed" | "skipped";
