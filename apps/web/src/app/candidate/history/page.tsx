"use client";

import { useState } from "react";
import { getAllInterviews, getJobById, getDemoUser } from "@/lib/mock-data";
import { getCompanyLogoUrl } from "@/lib/logo-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, Clock, Trophy, Building2, ArrowRight as ArrowRightIcon, Briefcase, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CompletedInterview = ReturnType<typeof getAllInterviews>[0] & {
  job: NonNullable<ReturnType<typeof getJobById>>;
  formattedDate: string;
};

type SortField = 'score' | 'date' | 'company' | 'position';
type SortDirection = 'asc' | 'desc';

export default function InterviewHistory() {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get demo user and completed interviews
  const demoUser = getDemoUser();
  const allInterviews = getAllInterviews();

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection(field === 'score' ? 'desc' : 'asc');
    }
  };

  // Filter and process completed interviews
  const completedInterviews: CompletedInterview[] = allInterviews
    .filter(interview => interview.status === 'COMPLETED')
    .map((interview) => {
      const job = getJobById(interview.jobId);
      // Format completion date - using createdAt for completed interviews
      const completionDate = interview.createdAt;
      return {
        ...interview,
        job: job!, // We know job exists for completed interviews
        formattedDate: completionDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
      };
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'company':
          comparison = (a.job?.company || '').localeCompare(b.job?.company || '');
          break;
        case 'position':
          comparison = (a.job?.title || '').localeCompare(b.job?.title || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (score >= 80) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (score >= 70) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1.5 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 ml-1.5" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1.5" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Link href="/candidate/jobs">
            <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2 rounded-full hover:bg-secondary">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Interview History</h1>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-normal">
                <Briefcase className="h-3 w-3 mr-1" /> {completedInterviews.length} Completed
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Review your past interview performance and results
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Best Score</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {completedInterviews.length > 0
              ? Math.max(...completedInterviews.map(i => i.score || 0)) + '%'
              : 'N/A'
            }
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your highest interview score
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1">Average Score</div>
          <div className="text-2xl font-bold text-foreground">
            {completedInterviews.length > 0
              ? Math.round(completedInterviews.reduce((sum, i) => sum + (i.score || 0), 0) / completedInterviews.length) + '%'
              : 'N/A'
            }
          </div>
          <div className="w-full bg-secondary/50 h-1.5 rounded-full mt-3 overflow-hidden">
            {completedInterviews.length > 0 && (
              <div
                className="bg-blue-500 h-full transition-all duration-500"
                style={{
                  width: `${Math.round(completedInterviews.reduce((sum, i) => sum + (i.score || 0), 0) / completedInterviews.length)}%`
                }}
              />
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1">Total Interviews</div>
          <div className="text-2xl font-bold text-foreground">{completedInterviews.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Completed interviews
          </p>
        </div>
      </div>

      {/* Interviews Table */}
      {completedInterviews.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xl shadow-black/10 dark:shadow-black/20">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-[350px] h-12 pl-6">
                  <button
                    onClick={() => handleSort('position')}
                    className="flex items-center text-xs font-medium uppercase cursor-pointer tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Position
                    {getSortIcon('position')}
                  </button>
                </TableHead>
                <TableHead className="h-12">
                  <button
                    onClick={() => handleSort('company')}
                    className="flex items-center text-xs font-medium uppercase cursor-pointer tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Company
                    {getSortIcon('company')}
                  </button>
                </TableHead>
                <TableHead className="h-12">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center text-xs font-medium uppercase cursor-pointer tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Completion Date
                    {getSortIcon('date')}
                  </button>
                </TableHead>
                <TableHead className="h-12">
                  <button
                    onClick={() => handleSort('score')}
                    className="flex items-center text-xs font-medium uppercase cursor-pointer tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Interview Score
                    {getSortIcon('score')}
                  </button>
                </TableHead>
                <TableHead className="h-12 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedInterviews.map((interview, i) => (
                <TableRow
                  key={interview.id}
                  className="group hover:bg-secondary/30 border-border transition-colors cursor-pointer"
                  onClick={() => router.push(`/interview/${interview.id}/results`)}
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border border-border group-hover:border-blue-500/30 transition-colors overflow-hidden">
                        {interview.job?.company && getCompanyLogoUrl(interview.job.company) ? (
                          <img
                            src={getCompanyLogoUrl(interview.job.company)!}
                            alt={`${interview.job.company} logo`}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground group-hover:text-blue-400 transition-colors">
                          {interview.job?.title || "Interview"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {interview.durationMinutes} min • {interview.job?.location}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {interview.job?.company && getCompanyLogoUrl(interview.job.company) && (
                        <img
                          src={getCompanyLogoUrl(interview.job.company)!}
                          alt={`${interview.job.company} logo`}
                          className="h-5 w-5 object-contain rounded"
                        />
                      )}
                      <span className="text-sm font-medium text-foreground">{interview.job?.company}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{interview.formattedDate}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 flex items-center justify-center">
                        <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                          <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                          <path
                            className={getScoreColor(interview.score || 0)}
                            strokeDasharray={`${interview.score || 0}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-bold">{interview.score || 0}</span>
                      </div>
                      <Badge variant="outline" className={getScoreBadgeColor(interview.score || 0)}>
                        {interview.score || 0}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <span className="hidden sm:inline">View Results</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No completed interviews</h3>
            <p className="text-muted-foreground mb-6">
              You haven't completed any interviews yet. Start your first interview to see your results here.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/candidate/jobs">
                <Button className="gap-2">
                  Browse Opportunities
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}