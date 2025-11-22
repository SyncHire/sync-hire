"use client";

import { ArrowRight, Briefcase, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Applicants index page - redirects users to select a job first
 * Candidates/applicants are always viewed in the context of a specific job
 */
export default function HRApplicantsIndex() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="mb-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-3">
          View Candidates by Job
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Candidates are organized by job posting. Select a job to view its applicants
          and their AI-powered interview scores.
        </p>
      </div>

      <Link href="/hr/jobs">
        <Button className="gap-2">
          <Briefcase className="h-4 w-4" />
          Go to Jobs
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
