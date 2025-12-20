/**
 * Interview Results Page
 * Shows candidate's interview performance and feedback
 * Supports both interview IDs and application IDs
 * URL: /candidate/interview/[id]/results
 */

import { InterviewStatus } from "@sync-hire/database";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { getCompanyLogoUrl } from "@/lib/logo-utils";
import { getStorage } from "@/lib/storage/storage-factory";
import type { Interview, Job } from "@/lib/storage/storage-interface";
import ResultsContent from "./ResultsContent";

interface ResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const session = await getServerSession();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  const _user = session.user;
  const storage = getStorage();

  // Try to get interview from database
  const interview: Interview | null = await storage.getInterview(id);
  let job: Job | null = interview
    ? await storage.getJob(interview.jobId)
    : null;

  // If not found as interview, try as application ID
  if (!interview) {
    const application = await storage.getApplication(id);
    if (application) {
      job = await storage.getJob(application.jobId);
      // Results page requires a completed interview - application lookup alone is not enough
    }
  }

  if (!interview || !job) {
    notFound();
  }

  // Results page only shows completed interviews
  if (interview.status !== InterviewStatus.COMPLETED) {
    notFound();
  }

  const companyLogo = getCompanyLogoUrl(job.organization.name);

  return (
    <>
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)] pointer-events-none opacity-50 -z-10" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto pb-16">
        <ResultsContent
          interview={interview}
          job={job}
          companyLogo={companyLogo}
        />
      </div>
    </>
  );
}
