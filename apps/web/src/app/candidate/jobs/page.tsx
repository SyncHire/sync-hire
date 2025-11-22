"use client";

import { useState, useCallback } from "react";
import { getAllInterviews, getJobById, getDemoUser } from "@/lib/mock-data";
import { getCompanyLogoUrl } from "@/lib/logo-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, RefreshCw, ArrowLeft, MapPin, ArrowRight as ArrowRightIcon, Building2, Clock, CheckCircle2, Play } from "lucide-react";
import Link from "next/link";
import { CVUploadSection } from "@/components/CVUpload";
import { ProcessingProgress, ProcessingStage } from "@/components/ProgressIndicator";
import { generateJobMatches, simulateCVParsing, simulateJobMatching } from "@/lib/job-matching";

type WorkflowStage = 'upload' | 'processing' | 'results';

type InterviewWithMatch = ReturnType<typeof getAllInterviews>[0] & {
  job: NonNullable<ReturnType<typeof getJobById>>;
  matchPercentage: number;
};

export default function CandidateJobListings() {
  // Get demo user and their interviews
  const demoUser = getDemoUser();
  const allInterviews = getAllInterviews();

  // Get interviews with job details, excluding completed ones for job matching
  const interviews = allInterviews
    .filter(interview => interview.status !== 'COMPLETED')
    .map((interview) => {
      const job = getJobById(interview.jobId);
      return {
        ...interview,
        job,
      };
    });

  // Get completed interviews for history section
  const completedInterviews = allInterviews
    .filter(interview => interview.status === 'COMPLETED')
    .map((interview) => {
      const job = getJobById(interview.jobId);
      return {
        ...interview,
        job,
      };
    });

  // CV upload state
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('upload');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('upload');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [matchedInterviews, setMatchedInterviews] = useState<InterviewWithMatch[]>([]);

  /**
   * Trigger background CV extraction without blocking the main flow
   */
  const triggerCVExtraction = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/cv/extract', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('CV extraction completed:', result.data.id, result.data.cached ? 'from cache' : 'new extraction');
      } else {
        console.warn('CV extraction failed:', await response.text());
      }
    } catch (error) {
      console.error('CV extraction error:', error);
      // Don't let extraction failures affect the user experience
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setWorkflowStage('processing');
    setProcessingStage('parsing');
    setProcessingProgress(0);

    // Trigger background CV extraction (non-blocking)
    triggerCVExtraction(file);

    try {
      // Simulate CV parsing
      await simulateCVParsing((progress) => {
        setProcessingProgress(progress);
      }, 2000);

      // Move to matching stage
      setProcessingStage('matching');
      setProcessingProgress(0);

      // Simulate job matching
      await simulateJobMatching((progress) => {
        setProcessingProgress(progress);
      }, 2500);

      // Generate matches for interviews
      const interviewJobs = interviews
        .map(interview => interview.job)
        .filter((job): job is NonNullable<typeof job> => Boolean(job));
      const jobMatches = generateJobMatches(interviewJobs, file.name);

      // Combine interviews with their match percentages
      const interviewsWithMatches: InterviewWithMatch[] = interviews.map(interview => {
        const jobMatch = jobMatches.find(match => match.id === interview.jobId);
        return {
          ...interview,
          job: interview.job!,
          matchPercentage: jobMatch?.matchPercentage || Math.floor(Math.random() * 30) + 70 // 70-100% fallback
        };
      }).sort((a, b) => b.matchPercentage - a.matchPercentage);

      setMatchedInterviews(interviewsWithMatches);

      setProcessingStage('complete');
      setProcessingProgress(100);

      // Show results after a longer delay to let users see the success message
      setTimeout(() => {
        setWorkflowStage('results');
      }, 1500);

    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProcessingStage('error');
    }
  }, []);

  const handleTryAgain = useCallback(() => {
    setError(null);
    setWorkflowStage('upload');
    setProcessingStage('upload');
    setProcessingProgress(0);
    setMatchedInterviews([]);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-16 p-6 relative z-10">

        {/* Dynamic Hero Section */}
        <div className="space-y-6 text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">Welcome, {demoUser.name}</span>
          </div>

          {workflowStage === 'upload' && (
            <>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Building2 className="w-8 h-8 text-blue-400" />
                <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-tight">
                  Your <span className="text-emerald-600 dark:text-emerald-400">Engineering Journey</span>
                </h1>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload your CV to get personalized job matches.
              </p>
            </>
          )}

          {workflowStage === 'processing' && (
            <>
              <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-tight">
                Analyzing your <span className="text-blue-400">CV</span>...
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                We're parsing your resume and finding the best matches for your skills and experience.
              </p>
            </>
          )}

          {workflowStage === 'results' && (
            <>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-tight">
                  Your <span className="text-emerald-600 dark:text-emerald-400">Matches</span>
                </h1>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Found {matchedInterviews.length} personalized interview {matchedInterviews.length === 1 ? 'opportunity' : 'opportunities'} based on your CV
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={handleTryAgain}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Upload Different CV
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">
          {workflowStage === 'upload' && (
            <CVUploadSection
              onFileSelect={handleFileSelect}
              isProcessing={false}
              error={error}
            />
          )}

          {workflowStage === 'processing' && (
            <ProcessingProgress
              currentStage={processingStage}
              progress={processingProgress}
              error={error}
            />
          )}

          {workflowStage === 'results' && (
            <>
              {matchedInterviews.length > 0 ? (
                <>
                  {/* Results Summary */}
                  {(() => {
                    const excellentMatches = matchedInterviews.filter(interview => interview.matchPercentage >= 90);
                    const strongMatches = matchedInterviews.filter(interview => interview.matchPercentage >= 80 && interview.matchPercentage < 90);
                    const avgMatch = Math.round(matchedInterviews.reduce((sum, interview) => sum + interview.matchPercentage, 0) / matchedInterviews.length);

                    return (
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full dark:bg-emerald-500/5 dark:border-emerald-500/30">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse dark:bg-emerald-400" />
                            <span className="text-amber-600 font-medium dark:text-amber-400">
                              {excellentMatches.length} Excellent Match{excellentMatches.length !== 1 ? 'es' : ''}
                            </span>
                            <span className="text-emerald-600 font-medium dark:text-emerald-400">
                              {strongMatches.length} Strong Match{strongMatches.length !== 1 ? 'es' : ''}
                            </span>
                          </div>
                          <span className="text-emerald-600/50 dark:text-emerald-400/50">•</span>
                          <span className="text-emerald-600 font-medium dark:text-emerald-400">
                            Avg Match: {avgMatch}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Matched Interview Cards */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {matchedInterviews.map((interview, index) => {
                      const statusConfig = {
                        PENDING: { label: "Ready", icon: Play, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                        IN_PROGRESS: { label: "In Progress", icon: Clock, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
                        COMPLETED: { label: "Completed", icon: CheckCircle2, color: "bg-green-500/10 text-green-400 border-green-500/20" },
                      };

                      const config = statusConfig[interview.status];

                      // Determine match quality colors
                      const getMatchColor = (percentage: number) => {
                        if (percentage >= 90) return "text-amber-600 dark:text-amber-400 border-amber-500/20";
                        if (percentage >= 80) return "text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                        return "text-blue-600 dark:text-blue-400 border-blue-500/20";
                      };

                      const getMatchDescription = (percentage: number) => {
                        if (percentage >= 90) return "Excellent Match";
                        if (percentage >= 80) return "Strong Match";
                        if (percentage >= 70) return "Good Match";
                        return "Potential Match";
                      };

                      return (
                        <div
                          key={interview.id}
                          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <Link href={interview.status === "COMPLETED" ? `/interview/${interview.id}/results` : `/interview/${interview.id}`} className="group block">
                            <div className="relative h-full group-hover:bg-gradient-to-br group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-transparent bg-card/50 backdrop-blur-sm border border-border group-hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 cursor-pointer overflow-hidden">
                              <div className="relative z-10 flex flex-col h-full">

                              <div className="flex justify-between items-start mb-6">
                                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center border border-border group-hover:border-blue-500/30 transition-colors overflow-hidden">
                                  {interview.job?.company && getCompanyLogoUrl(interview.job.company) ? (
                                    <img
                                      src={getCompanyLogoUrl(interview.job.company)!}
                                      alt={`${interview.job.company} logo`}
                                      className="h-8 w-8 object-contain"
                                    />
                                  ) : (
                                    <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                                  )}
                                </div>
                                <Badge variant="outline" className={`${config.color} flex items-center gap-1.5 px-3 py-1`}>
                                  <config.icon className="h-3 w-3" /> {config.label}
                                </Badge>
                              </div>

                              <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-blue-400 transition-colors">
                                {interview.job?.title || "Unknown Position"}
                              </h3>

                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-6">
                                <span className="flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5" /> {interview.job?.company}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" /> {interview.job?.location}
                                </span>
                              </div>

                              <div className="mb-4 flex items-center gap-2">
                                <span className={`text-sm font-medium ${getMatchColor(interview.matchPercentage).split(' ')[0]}`}>
                                  {getMatchDescription(interview.matchPercentage)}
                                </span>
                                <Badge variant="outline" className={getMatchColor(interview.matchPercentage)}>
                                  <Trophy className="h-3.5 w-3.5 mr-1.5" />
                                  {interview.matchPercentage}%
                                </Badge>
                              </div>

                              <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{interview.durationMinutes} min</span>
                                </div>
                                <span className="text-sm font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                  {interview.status === "COMPLETED" ? "View Results" : "Start Interview"} <ArrowRightIcon className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No interviews found that match your profile.</p>
                  <Button
                    onClick={handleTryAgain}
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </>
          )}

          {error && workflowStage !== 'processing' && (
            <div className="flex justify-center">
              <Button
                onClick={handleTryAgain}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}