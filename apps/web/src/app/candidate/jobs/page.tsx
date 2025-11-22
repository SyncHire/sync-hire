"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getAllInterviews, getJobById, getDemoUser } from "@/lib/mock-data";
import { getCompanyLogoUrl } from "@/lib/logo-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, RefreshCw, ArrowLeft, MapPin, ArrowRight as ArrowRightIcon, Building2, Clock, CheckCircle2, Play, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { CVUploadSection } from "@/components/CVUpload";
import { ProcessingProgress, ProcessingStage } from "@/components/ProgressIndicator";
import { generateJobMatches, simulateCVParsing, simulateJobMatching } from "@/lib/job-matching";
import { toast } from "@/lib/hooks/use-toast";
import type { Job } from "@/lib/mock-data";

type WorkflowStage = 'upload' | 'processing' | 'results';

type ApplicationState = 'not_applied' | 'applying' | 'applied' | 'error';

type InterviewWithMatch = ReturnType<typeof getAllInterviews>[0] & {
  job: NonNullable<ReturnType<typeof getJobById>>;
  matchPercentage: number;
};

export default function CandidateJobListings() {
  // Get demo user and their interviews
  const demoUser = getDemoUser();
  const allInterviews = getAllInterviews();

  /**
   * Transform real jobs into interview-compatible format
   */
  const transformJobsToInterviews = useCallback((jobs: Job[]): InterviewWithMatch[] => {
    return jobs.map(job => ({
      id: `interview-${job.id}`, // Generate interview ID from job ID
      jobId: job.id,
      candidateId: demoUser.id,
      status: 'PENDING' as const,
      durationMinutes: 30, // Default interview duration
      createdAt: new Date(job.createdAt),
      job: job,
      matchPercentage: Math.floor(Math.random() * 30) + 70 // 70-100% random match
    }));
  }, [demoUser.id]);

  // Get interviews with job details, excluding completed ones for job matching
  const mockInterviews: InterviewWithMatch[] = allInterviews
    .filter(interview => interview.status !== 'COMPLETED')
    .map((interview) => {
      const job = getJobById(interview.jobId);
      return {
        ...interview,
        job: job || { // Fallback job if not found
          id: interview.jobId,
          title: "Unknown Position",
          company: "Unknown Company",
          department: "",
          location: "",
          type: "",
          salary: "",
          postedAt: "",
          applicantsCount: 0,
          description: "",
          requirements: [],
          questions: [],
          employerId: "",
          createdAt: interview.createdAt
        },
        matchPercentage: Math.floor(Math.random() * 30) + 70 // 70-100% random match
      };
    });

  // Get completed interviews for history section
  const _completedInterviews = allInterviews
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
  const [cvId, setCvId] = useState<string | null>(null);
  const [applicationStates, setApplicationStates] = useState<Record<string, ApplicationState>>({});
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [_realJobs, setRealJobs] = useState<Job[]>([]);

  /**
   * Fetch real jobs from API and merge with mock interviews on mount
   * Fetches once only, no continuous polling
   */
  useEffect(() => {
    const fetchAndMergeJobs = async () => {
      try {
        const response = await fetch('/api/jobs');
        if (response.ok) {
          const result = await response.json();
          const fetchedJobs = result.data || [];
          setRealJobs(fetchedJobs);

          // Transform real jobs into interview format
          const realJobInterviews = transformJobsToInterviews(fetchedJobs);

          // Merge real jobs with mock interviews, real jobs first (newest)
          const allInterviews = [
            ...realJobInterviews,
            ...mockInterviews.filter(interview =>
              !fetchedJobs.some((job: Job) => job.id === interview.jobId)
            )
          ];

          setMatchedInterviews(allInterviews);
        } else {
          // Fallback to mock interviews if API fails
          console.warn('Failed to fetch jobs from API, using mock data');
          setMatchedInterviews(mockInterviews);
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
        // Fallback to mock interviews if API fails
        console.warn('API error, using fallback mock interviews');
        setMatchedInterviews(mockInterviews);
      }
    };

    // Initial fetch once on mount
    fetchAndMergeJobs();
  }, [transformJobsToInterviews, mockInterviews]);


  /**
   * Fetch question sets for a given CV
   */
  const fetchQuestionSets = useCallback(async (cvIdValue: string) => {
    try {
      const response = await fetch('/api/jobs/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvId: cvIdValue }),
      });

      if (response.ok) {
        const result = await response.json();
        const questionsData = result.data || [];

        // Map results to application states
        const newStates: Record<string, ApplicationState> = {};
        questionsData.forEach(({ jobId, hasQuestions }: { jobId: string; hasQuestions: boolean }) => {
          // Find the interview ID for this job
          const interview = matchedInterviews.find(i => i.jobId === jobId);
          if (interview) {
            newStates[interview.id] = hasQuestions ? 'applied' : 'not_applied';
          }
        });

        setApplicationStates(newStates);
      }
    } catch (error) {
      console.error('Failed to fetch question sets:', error);
    }
  }, [matchedInterviews]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setWorkflowStage('processing');
    setProcessingStage('parsing');
    setProcessingProgress(0);
    setApplicationStates({}); // Reset application states for new CV

    // Trigger background CV extraction (non-blocking)
    let extractedCvId: string | null = null;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/cv/extract', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        extractedCvId = result.data.id;
        setCvId(extractedCvId);
        console.log('CV extraction completed:', result.data.id, result.data.cached ? 'from cache' : 'new extraction');
      } else {
        console.warn('CV extraction failed:', await response.text());
      }
    } catch (error) {
      console.error('CV extraction error:', error);
      // Don't let extraction failures affect the user experience
    }

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

      // Generate matches for current interviews (both real and mock)
      const currentInterviewJobs = matchedInterviews
        .map(interview => interview.job)
        .filter((job): job is NonNullable<typeof job> => Boolean(job));
      const jobMatches = generateJobMatches(currentInterviewJobs, file.name);

      // Update match percentages for current interviews
      const updatedInterviews: InterviewWithMatch[] = matchedInterviews.map(interview => {
        const jobMatch = jobMatches.find(match => match.id === interview.jobId);
        return {
          ...interview,
          matchPercentage: jobMatch?.matchPercentage || interview.matchPercentage
        };
      }).sort((a, b) => b.matchPercentage - a.matchPercentage);

      setMatchedInterviews(updatedInterviews);

      // Initialize application states for all interviews (not applied)
      const newStates: Record<string, ApplicationState> = {};
      updatedInterviews.forEach(interview => {
        newStates[interview.id] = 'not_applied';
      });
      setApplicationStates(newStates);

      setProcessingStage('complete');
      setProcessingProgress(100);

      // Show results after a longer delay to let users see the success message
      setTimeout(() => {
        setWorkflowStage('results');

        // Fetch question sets for this CV if we have a cvId
        if (extractedCvId) {
          fetchQuestionSets(extractedCvId);
        }
      }, 1500);

    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProcessingStage('error');
    }
  }, [matchedInterviews, fetchQuestionSets]);

  const handleApplyToJob = useCallback(async (interviewId: string, jobId: string) => {
    if (!cvId) {
      toast({
        title: "Error",
        description: "CV ID not found. Please upload your CV again.",
        variant: "destructive",
      });
      return;
    }

    setApplyingJobId(interviewId);
    setApplicationStates(prev => ({
      ...prev,
      [interviewId]: 'applying'
    }));

    try {
      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvId, jobId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply');
      }

      await response.json();

      setApplicationStates(prev => ({
        ...prev,
        [interviewId]: 'applied'
      }));

      toast({
        title: "Success",
        description: "Application submitted! Ready to start interview.",
      });
    } catch (error) {
      console.error('Apply error:', error);

      setApplicationStates(prev => ({
        ...prev,
        [interviewId]: 'error'
      }));

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplyingJobId(null);
    }
  }, [cvId]);

  const handleTryAgain = useCallback(() => {
    setError(null);
    setWorkflowStage('upload');
    setProcessingStage('upload');
    setProcessingProgress(0);
    setMatchedInterviews([]);
    setCvId(null);
    setApplicationStates({});
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
                          <div className="relative h-full bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 transition-all duration-300 overflow-hidden hover:bg-gradient-to-br hover:from-blue-500/10 hover:via-blue-500/5 hover:to-transparent hover:border-blue-500/50">
                            <div className="relative z-10 flex flex-col h-full">

                              <div className="flex justify-between items-start mb-6">
                                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center border border-border transition-colors overflow-hidden">
                                  {interview.job?.company && getCompanyLogoUrl(interview.job.company) ? (
                                    <img
                                      src={getCompanyLogoUrl(interview.job.company)!}
                                      alt={`${interview.job.company} logo`}
                                      className="h-8 w-8 object-contain"
                                    />
                                  ) : (
                                    <Building2 className="h-6 w-6 text-muted-foreground transition-colors" />
                                  )}
                                </div>
                                <Badge variant="outline" className={`${config.color} flex items-center gap-1.5 px-3 py-1`}>
                                  <config.icon className="h-3 w-3" /> {config.label}
                                </Badge>
                              </div>

                              <h3 className="text-xl font-semibold text-foreground mb-2 transition-colors">
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

                              <div className="mt-auto pt-6 border-t border-border space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{interview.durationMinutes} min</span>
                                </div>

                                {/* Buttons - Apply CV and Start Interview */}
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  {applicationStates[interview.id] !== 'applied' && (
                                    <Button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleApplyToJob(interview.id, interview.jobId);
                                      }}
                                      disabled={applyingJobId === interview.id || !cvId}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 gap-2"
                                    >
                                      {applyingJobId === interview.id ? (
                                        <>
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          <span className="text-xs">Generating...</span>
                                        </>
                                      ) : applicationStates[interview.id] === 'error' ? (
                                        <>
                                          <span>Try Again</span>
                                        </>
                                      ) : (
                                        <>
                                          <span>Apply CV</span>
                                        </>
                                      )}
                                    </Button>
                                  )}

                                  <Link
                                    href={interview.status === "COMPLETED" ? `/interview/${interview.id}/results` : `/interview/${interview.id}`}
                                    className="flex-1"
                                    onClick={(e) => {
                                      if (interview.status !== "COMPLETED" && applicationStates[interview.id] !== 'applied') {
                                        e.preventDefault();
                                      }
                                    }}
                                  >
                                    <Button
                                      disabled={interview.status !== "COMPLETED" && applicationStates[interview.id] !== 'applied'}
                                      size="sm"
                                      className="w-full gap-2"
                                      variant={applicationStates[interview.id] === 'applied' ? 'default' : 'ghost'}
                                    >
                                      {applicationStates[interview.id] === 'applied' && (
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      )}
                                      {interview.status === "COMPLETED" ? "View Results" : "Start Interview"}
                                      {interview.status !== "COMPLETED" && <ArrowRightIcon className="h-4 w-4" />}
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
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