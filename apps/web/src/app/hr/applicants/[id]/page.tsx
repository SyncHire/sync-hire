"use client";

import {
  ArrowLeft,
  BrainCircuit,
  Check,
  Download,
  Filter,
  Inbox,
  PlayCircle,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJobApplicants } from "@/lib/hooks/use-job-applicants";

// Generate avatar URL from name
function getAvatarUrl(name: string, index: number): string {
  const colors = ["10b981", "f59e0b", "ec4899", "8b5cf6", "3b82f6", "ef4444"];
  const color = colors[index % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=256`;
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function HRApplicantDetail() {
  const params = useParams();
  const jobId = params?.id as string;

  const { data: response, isLoading, error } = useJobApplicants(jobId);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading applicants...</p>
        </div>
      </div>
    );
  }

  if (error || !response?.data) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
        <Link href="/hr/jobs">
          <Button
            variant="ghost"
            className="pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-foreground w-fit -ml-3 h-auto py-0 gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Jobs
          </Button>
        </Link>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {error ? "Failed to load applicants" : "Job not found"}
          </h2>
          <p className="text-muted-foreground mb-4">
            Unable to load applicants for this job.
          </p>
          <Link href="/hr/jobs">
            <Button>Return to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { job, applicants, stats } = response.data;
  const topApplicant = applicants.find(
    (a) => a.status === "COMPLETED" && a.score !== undefined,
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-4">
          <Link href={`/hr/jobs/${jobId}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 -ml-2 rounded-full hover:bg-secondary"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Applicants
              </h1>
              <Badge
                variant="secondary"
                className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-normal"
              >
                <BrainCircuit className="h-3 w-3 mr-1" /> AI Scoring Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Reviewing candidates for{" "}
              <span className="text-foreground font-medium">{job.title}</span>
              {job.company && (
                <span className="text-muted-foreground"> at {job.company}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 border-border bg-secondary/50 hover:bg-secondary"
          >
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-border bg-secondary/50 hover:bg-secondary"
          >
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Top Pick Card */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Top Pick
            </span>
          </div>
          {topApplicant ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-blue-500/30 bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-emerald-400">
                    {getInitials(topApplicant.name)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {topApplicant.name}
                  </div>
                  <div className="text-xs text-blue-400">
                    {topApplicant.score}% Match Score
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Top performer based on AI interview analysis.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              No completed interviews yet. Top pick will appear here.
            </p>
          )}
        </div>

        {/* Average Score Card */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Average Match Score
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.averageScore !== null ? `${stats.averageScore}%` : "N/A"}
          </div>
          {stats.averageScore !== null && (
            <div className="w-full bg-secondary/50 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${stats.averageScore}%` }}
              />
            </div>
          )}
        </div>

        {/* Applicant Count Card */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Total Applicants
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span className="text-green-500">{stats.completed} completed</span>
            <span>•</span>
            <span>{stats.pending} pending</span>
          </div>
        </div>
      </div>

      {/* Applicants Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xl shadow-black/10 dark:shadow-black/20">
        {applicants.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No applicants yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Candidates will appear here once they apply and complete interviews.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-[300px] h-12 text-xs font-medium uppercase tracking-wider text-muted-foreground pl-6">
                  Candidate
                </TableHead>
                <TableHead className="h-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Skills
                </TableHead>
                <TableHead className="h-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Match Score
                </TableHead>
                <TableHead className="h-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="h-12 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicants.map((applicant, i) => (
                <TableRow
                  key={applicant.id}
                  className="group hover:bg-secondary/30 border-border transition-colors"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-border group-hover:border-blue-500/30 transition-colors">
                        <img
                          src={getAvatarUrl(applicant.name, i)}
                          alt={applicant.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {applicant.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {applicant.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {applicant.skills.slice(0, 3).map((skill, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {applicant.skills.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          +{applicant.skills.length - 3}
                        </Badge>
                      )}
                      {applicant.skills.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {applicant.score !== undefined ? (
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex items-center justify-center">
                          <svg
                            className="h-full w-full rotate-[-90deg]"
                            viewBox="0 0 36 36"
                          >
                            <path
                              className="text-secondary"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            />
                            <path
                              className={`${applicant.score > 85 ? "text-green-500" : applicant.score > 70 ? "text-amber-500" : "text-red-500"}`}
                              strokeDasharray={`${applicant.score}, 100`}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-bold">
                            {applicant.score}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`px-2.5 py-0.5 text-xs font-medium border ${
                        applicant.status === "COMPLETED"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : applicant.status === "IN_PROGRESS"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      }`}
                    >
                      {applicant.status === "COMPLETED"
                        ? "Completed"
                        : applicant.status === "IN_PROGRESS"
                          ? "In Progress"
                          : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {applicant.status === "COMPLETED" && (
                        <Link href={`/interview/${applicant.interviewId}/results`}>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 hover:bg-foreground hover:text-background transition-colors"
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <div className="w-px h-4 bg-border/50 mx-1 self-center" />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
