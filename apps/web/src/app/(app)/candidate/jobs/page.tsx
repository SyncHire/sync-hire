"use client";

import {
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  Building2,
  CheckCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CVUploadSection } from "@/components/CVUpload";
import {
  ProcessingProgress,
  type ProcessingStage,
} from "@/components/ProgressIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCandidateContext } from "@/lib/context/candidate-context";
import {
  useApplyToJob,
  useInvalidateCVQueries,
  useQuestionSets,
} from "@/lib/hooks/use-candidate-jobs";
import { useHasOrganization } from "@/lib/hooks/use-organizations";
import { toast } from "@/lib/hooks/use-toast";
import {
  generateJobMatches,
  simulateCVParsing,
  simulateJobMatching,
} from "@/lib/job-matching";
import { getOrganizationLogoUrl } from "@/lib/logo-utils";
import type { JobApplication } from "@/lib/types/interview-types";

type WorkflowStage = "upload" | "processing" | "results";

type UIApplicationState = "not_applied" | "applying" | "applied" | "error";

export default function CandidateJobListings() {
  // Get user, applications, and saved CV from context (loaded at layout level)
  const {
    user,
    applications: initialApplications,
    cv: savedCV,
    isLoading,
  } = useCandidateContext();

  // Check if user has an organization (to hide hiring CTA)
  const { hasOrganization } = useHasOrganization();

  // Local state for job applications (can be modified by CV processing)
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);

  // Sync context data to local state when it changes
  useEffect(() => {
    if (initialApplications.length > 0 && jobApplications.length === 0) {
      setJobApplications(initialApplications);
    }
  }, [initialApplications, jobApplications.length]);

  // CV upload state
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>("upload");
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("upload");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cvId, setCvId] = useState<string | null>(null);
  const [uiApplicationStates, setUiApplicationStates] = useState<
    Record<string, UIApplicationState>
  >({});
  const [hasInitializedFromSavedCV, setHasInitializedFromSavedCV] =
    useState(false);

  // Use custom hooks for question sets and applying to jobs
  const activeCvId = cvId || savedCV?.id || null;
  const { data: questionSetsData } = useQuestionSets(
    activeCvId,
    workflowStage === "results",
  );
  const applyToJobMutation = useApplyToJob();
  const { invalidateUserCV } = useInvalidateCVQueries();

  // Update UI states when question sets data changes
  useEffect(() => {
    if (questionSetsData?.data && jobApplications.length > 0) {
      const questionsData = questionSetsData.data || [];
      const newStates: Record<string, UIApplicationState> = {};

      // Initialize all as not_applied first
      jobApplications.forEach((app) => {
        newStates[app.id] = "not_applied";
      });

      // Mark ones with questions as applied
      questionsData.forEach(
        ({ jobId, hasQuestions }: { jobId: string; hasQuestions: boolean }) => {
          const app = jobApplications.find((a) => a.job.id === jobId);
          if (app && hasQuestions) {
            newStates[app.id] = "applied";
          }
        },
      );

      setUiApplicationStates(newStates);
    }
  }, [questionSetsData, jobApplications]);

  // If user has a saved CV, skip upload and go directly to results
  useEffect(() => {
    if (
      !isLoading &&
      savedCV &&
      !hasInitializedFromSavedCV &&
      initialApplications.length > 0
    ) {
      setCvId(savedCV.id);
      setWorkflowStage("results");
      setHasInitializedFromSavedCV(true);
    }
  }, [isLoading, savedCV, hasInitializedFromSavedCV, initialApplications]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setWorkflowStage("processing");
      setProcessingStage("parsing");
      setProcessingProgress(0);
      setUiApplicationStates({}); // Reset application states for new CV

      // Trigger background CV extraction (non-blocking)
      let extractedCvId: string | null = null;
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/candidate/cv/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          extractedCvId = result.data.id;
          setCvId(extractedCvId);
        } else {
        }
      } catch (_error) {
        // Don't let extraction failures affect the user experience
      }

      try {
        // Simulate CV parsing
        await simulateCVParsing((progress) => {
          setProcessingProgress(progress);
        }, 2000);

        // Move to matching stage
        setProcessingStage("matching");
        setProcessingProgress(0);

        // Simulate job matching
        await simulateJobMatching((progress) => {
          setProcessingProgress(progress);
        }, 2500);

        // Generate matches for current job applications
        const currentJobs = jobApplications
          .map((app) => app.job)
          .filter((job): job is NonNullable<typeof job> => Boolean(job));
        const jobMatches = generateJobMatches(currentJobs, file.name);

        // Update match percentages for job applications
        const updatedApplications: JobApplication[] = jobApplications
          .map((app) => {
            const jobMatch = jobMatches.find(
              (match) => match.id === app.job.id,
            );
            return {
              ...app,
              matchPercentage: jobMatch?.matchPercentage || app.matchPercentage,
            };
          })
          .sort((a, b) => b.matchPercentage - a.matchPercentage);

        setJobApplications(updatedApplications);

        // Initialize UI application states
        const newStates: Record<string, UIApplicationState> = {};
        updatedApplications.forEach((app) => {
          newStates[app.id] = "not_applied";
        });
        setUiApplicationStates(newStates);

        setProcessingStage("complete");
        setProcessingProgress(100);

        // Show results after a delay - react-query will auto-fetch question sets when stage changes
        setTimeout(() => {
          setWorkflowStage("results");
        }, 1500);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
        setProcessingStage("error");
      }
    },
    [jobApplications],
  );

  const handleApplyToJob = useCallback(
    async (currentAppId: string, jobId: string) => {
      if (!activeCvId) {
        toast({
          title: "Error",
          description: "CV ID not found. Please upload your CV again.",
          variant: "destructive",
        });
        return;
      }

      setUiApplicationStates((prev) => ({
        ...prev,
        [currentAppId]: "applying",
      }));

      applyToJobMutation.mutate(
        { cvId: activeCvId, jobId },
        {
          onSuccess: (response) => {
            const realApplicationId = response.data?.applicationId;

            // Update jobApplications with the real application ID
            if (realApplicationId && realApplicationId !== currentAppId) {
              setJobApplications((prev) =>
                prev.map((app) =>
                  app.job.id === jobId
                    ? { ...app, id: realApplicationId, status: "APPLIED" }
                    : app,
                ),
              );
              // Update UI state with new ID
              setUiApplicationStates((prev) => {
                const newStates = { ...prev };
                delete newStates[currentAppId];
                newStates[realApplicationId] = "applied";
                return newStates;
              });
            } else {
              setUiApplicationStates((prev) => ({
                ...prev,
                [currentAppId]: "applied",
              }));
            }
          },
          onError: () => {
            setUiApplicationStates((prev) => ({
              ...prev,
              [currentAppId]: "error",
            }));
          },
        },
      );
    },
    [activeCvId, applyToJobMutation],
  );

  const handleTryAgain = useCallback(() => {
    setError(null);
    setWorkflowStage("upload");
    setProcessingStage("upload");
    setProcessingProgress(0);
    setJobApplications([]);
    setCvId(null);
    setUiApplicationStates({});
    setHasInitializedFromSavedCV(true); // Prevent re-initialization from saved CV
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-16 p-6 relative z-10">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-muted-foreground">Loading jobs...</p>
            </div>
          </div>
        )}

        {/* Dynamic Hero Section */}
        {!isLoading && (
          <>
            <div className="space-y-6 text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-medium text-muted-foreground">
                  Welcome, {user?.name || "Candidate"}
                </span>
              </div>

              {workflowStage === "upload" && (
                <>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Building2 className="w-8 h-8 text-blue-400" />
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-tight">
                      Your{" "}
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Engineering Journey
                      </span>
                    </h1>
                  </div>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Upload your CV to get personalized job matches.
                  </p>
                </>
              )}

              {workflowStage === "processing" && (
                <>
                  <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-tight">
                    Analyzing your <span className="text-blue-400">CV</span>...
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    We're parsing your resume and finding the best matches for
                    your skills and experience.
                  </p>
                </>
              )}

              {workflowStage === "results" && (
                <>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-tight">
                      Your{" "}
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Matches
                      </span>
                    </h1>
                  </div>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Found {jobApplications.length} personalized interview{" "}
                    {jobApplications.length === 1
                      ? "opportunity"
                      : "opportunities"}{" "}
                    based on your CV
                  </p>
                  <div className="flex justify-center gap-4 mt-6">
                    <Button
                      variant="outline"
                      onClick={handleTryAgain}
                      className="flex items-center gap-2 cursor-pointer"
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
              {workflowStage === "upload" && (
                <CVUploadSection
                  onFileSelect={handleFileSelect}
                  isProcessing={false}
                  error={error}
                />
              )}

              {workflowStage === "processing" && (
                <ProcessingProgress
                  currentStage={processingStage}
                  progress={processingProgress}
                  error={error}
                />
              )}

              {workflowStage === "results" &&
                (jobApplications.length > 0 ? (
                  <>
                    {/* Results Summary */}
                    {(() => {
                      const excellentMatches = jobApplications.filter(
                        (app) => app.matchPercentage >= 90,
                      );
                      const strongMatches = jobApplications.filter(
                        (app) =>
                          app.matchPercentage >= 80 && app.matchPercentage < 90,
                      );
                      const avgMatch = Math.round(
                        jobApplications.reduce(
                          (sum, app) => sum + app.matchPercentage,
                          0,
                        ) / jobApplications.length,
                      );

                      return (
                        <div className="text-center mb-8">
                          <div className="inline-flex items-center gap-4 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full dark:bg-emerald-500/5 dark:border-emerald-500/30">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse dark:bg-emerald-400" />
                              <span className="text-amber-600 font-medium dark:text-amber-400">
                                {excellentMatches.length} Excellent Match
                                {excellentMatches.length !== 1 ? "es" : ""}
                              </span>
                              <span className="text-emerald-600 font-medium dark:text-emerald-400">
                                {strongMatches.length} Strong Match
                                {strongMatches.length !== 1 ? "es" : ""}
                              </span>
                            </div>
                            <span className="text-emerald-600/50 dark:text-emerald-400/50">
                              •
                            </span>
                            <span className="text-emerald-600 font-medium dark:text-emerald-400">
                              Avg Match: {avgMatch}%
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Hiring CTA Banner - only show if user doesn't have an organization */}
                    {!hasOrganization && (
                      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 mb-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-center sm:text-left">
                            <h3 className="font-semibold text-base">
                              Hiring for your company?
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              Post jobs and find great candidates with
                              AI-powered interviews
                            </p>
                          </div>
                          <Link href="/create-organization">
                            <Button
                              variant="outline"
                              size="sm"
                              className="whitespace-nowrap"
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              Post a Job
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Job Application Cards */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {jobApplications.map((application, index) => {
                        const statusConfig = {
                          NOT_APPLIED: {
                            label: "Available",
                            icon: Play,
                            color:
                              "bg-blue-500/10 text-blue-400 border-blue-500/20",
                          },
                          APPLIED: {
                            label: "Applied",
                            icon: CheckCircle2,
                            color:
                              "bg-green-500/10 text-green-400 border-green-500/20",
                          },
                          INTERVIEWING: {
                            label: "Interviewing",
                            icon: Clock,
                            color:
                              "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                          },
                          COMPLETED: {
                            label: "Completed",
                            icon: CheckCircle2,
                            color:
                              "bg-green-500/10 text-green-400 border-green-500/20",
                          },
                        };

                        const config = statusConfig[application.status];
                        const orgLogo = getOrganizationLogoUrl(
                          application.job?.organization,
                        );

                        // Determine match quality colors
                        const getMatchColor = (percentage: number) => {
                          if (percentage >= 90)
                            return "text-amber-600 dark:text-amber-400 border-amber-500/20";
                          if (percentage >= 80)
                            return "text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
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
                            key={application.id}
                            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="relative h-full bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 transition-all duration-300 overflow-hidden hover:bg-gradient-to-br hover:from-blue-500/10 hover:via-blue-500/5 hover:to-transparent hover:border-blue-500/50">
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                  <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center border border-border transition-colors overflow-hidden">
                                      {orgLogo ? (
                                        <Image
                                          src={orgLogo}
                                          alt={`${application.job?.organization?.name} logo`}
                                          width={32}
                                          height={32}
                                          className="h-8 w-8 object-contain"
                                          unoptimized
                                        />
                                      ) : (
                                        <Building2 className="h-6 w-6 text-muted-foreground transition-colors" />
                                      )}
                                    </div>
                                    <span className="text-lg font-bold text-foreground">
                                      {application.job?.organization?.name}
                                    </span>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`${config.color} flex items-center gap-1.5 px-3 py-1`}
                                  >
                                    <config.icon className="h-3 w-3" />{" "}
                                    {config.label}
                                  </Badge>
                                </div>

                                <h3 className="text-xl font-semibold text-foreground mb-2 transition-colors">
                                  {application.job?.title || "Unknown Position"}
                                </h3>

                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-6">
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />{" "}
                                    {application.job?.location}
                                  </span>
                                </div>

                                <div className="mb-4 flex items-center gap-2">
                                  <span
                                    className={`text-sm font-medium ${getMatchColor(application.matchPercentage).split(" ")[0]}`}
                                  >
                                    {getMatchDescription(
                                      application.matchPercentage,
                                    )}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={getMatchColor(
                                      application.matchPercentage,
                                    )}
                                  >
                                    <Trophy className="h-3.5 w-3.5 mr-1.5" />
                                    {application.matchPercentage}%
                                  </Badge>
                                </div>

                                <div className="mt-auto pt-6 border-t border-border space-y-3">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>15-30 min</span>
                                  </div>

                                  {/* Buttons - Apply CV and Start Interview */}
                                  <div className="flex flex-col gap-2 sm:flex-row">
                                    {uiApplicationStates[application.id] !==
                                      "applied" &&
                                      application.status !== "COMPLETED" && (
                                        <Button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleApplyToJob(
                                              application.id,
                                              application.job.id,
                                            );
                                          }}
                                          disabled={
                                            uiApplicationStates[
                                              application.id
                                            ] === "applying" || !activeCvId
                                          }
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 gap-2 cursor-pointer"
                                        >
                                          {uiApplicationStates[
                                            application.id
                                          ] === "applying" ? (
                                            <>
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              <span className="text-xs">
                                                Generating...
                                              </span>
                                            </>
                                          ) : uiApplicationStates[
                                              application.id
                                            ] === "error" ? (
                                            <span>Try Again</span>
                                          ) : (
                                            <span>Apply CV</span>
                                          )}
                                        </Button>
                                      )}

                                    {(uiApplicationStates[application.id] ===
                                      "applied" ||
                                      application.status === "COMPLETED") && (
                                      <Link
                                        href={
                                          application.status === "COMPLETED"
                                            ? `/candidate/interview/${application.id}/results`
                                            : `/interview/${application.id}`
                                        }
                                        className="flex-1"
                                      >
                                        <Button
                                          size="sm"
                                          className="w-full gap-2 cursor-pointer"
                                        >
                                          <CheckCircle className="h-3.5 w-3.5" />
                                          {application.status === "COMPLETED"
                                            ? "View Results"
                                            : "Start Interview"}
                                          {application.status !==
                                            "COMPLETED" && (
                                            <ArrowRightIcon className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </Link>
                                    )}
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
                    <p className="text-muted-foreground">
                      No interviews found that match your profile.
                    </p>
                    <Button
                      onClick={handleTryAgain}
                      className="mt-4 cursor-pointer"
                    >
                      Try Again
                    </Button>
                  </div>
                ))}

              {error && workflowStage !== "processing" && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleTryAgain}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
