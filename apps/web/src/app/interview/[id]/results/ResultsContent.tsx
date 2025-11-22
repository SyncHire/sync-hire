"use client";

/**
 * Interview Results Content (Client Component)
 * Shows results with loading state while AI evaluation generates
 * Uses react-query for polling
 */

import {
  Award,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { AIEvaluation, Interview, Job } from "@/lib/mock-data";
import { useInterviewDetails } from "@/lib/hooks/use-interview";

interface ResultsContentProps {
  interview: Interview;
  job: Job;
  companyLogo: string | null;
}

// Default evaluation data (used when no AI analysis is available yet)
const defaultEvaluation = {
  overallScore: 87,
  categories: [
    {
      name: "Technical Knowledge",
      score: 92,
      feedback:
        "Demonstrated strong understanding of core concepts and best practices.",
    },
    {
      name: "Problem Solving",
      score: 85,
      feedback: "Approached problems methodically with clear reasoning.",
    },
    {
      name: "Communication",
      score: 88,
      feedback: "Articulated ideas clearly and provided relevant examples.",
    },
    {
      name: "Experience Relevance",
      score: 82,
      feedback: "Background aligns well with role requirements.",
    },
  ],
  strengths: [
    "Strong technical foundation in mobile development",
    "Clear communication of complex concepts",
    "Good problem-solving approach",
  ],
  improvements: [
    "Could elaborate more on system design decisions",
    "Consider discussing scalability implications",
  ],
  summary:
    "The candidate demonstrated solid technical skills and communication abilities. They showed good problem-solving methodology and relevant experience for the role. Overall, a strong performance that indicates readiness for the position.",
};

function buildEvaluation(aiEvaluation: AIEvaluation | undefined, score?: number) {
  if (aiEvaluation) {
    return {
      overallScore: aiEvaluation.overallScore,
      categories: [
        {
          name: "Technical Knowledge",
          score: aiEvaluation.categories.technicalKnowledge,
          feedback:
            "Demonstrated understanding of core concepts and best practices.",
        },
        {
          name: "Problem Solving",
          score: aiEvaluation.categories.problemSolving,
          feedback: "Approached problems methodically with clear reasoning.",
        },
        {
          name: "Communication",
          score: aiEvaluation.categories.communication,
          feedback: "Articulated ideas clearly and provided relevant examples.",
        },
        {
          name: "Experience Relevance",
          score: aiEvaluation.categories.experienceRelevance,
          feedback: "Background aligns well with role requirements.",
        },
      ],
      strengths: aiEvaluation.strengths,
      improvements: aiEvaluation.improvements,
      summary: aiEvaluation.summary,
    };
  }
  return {
    ...defaultEvaluation,
    overallScore: score ?? defaultEvaluation.overallScore,
  };
}

export default function ResultsContent({
  interview: initialInterview,
  job,
  companyLogo,
}: ResultsContentProps) {
  // Use react-query for polling when evaluation is not ready
  const shouldPoll =
    initialInterview.status === "COMPLETED" && !initialInterview.aiEvaluation;

  const { data: polledData } = useInterviewDetails(
    shouldPoll ? initialInterview.id : null,
  );

  // Use polled data if available and has evaluation, otherwise use initial
  const interview =
    polledData?.data?.interview?.aiEvaluation
      ? polledData.data.interview
      : initialInterview;

  const isGenerating = shouldPoll && !interview.aiEvaluation;

  const evaluation = buildEvaluation(interview.aiEvaluation, interview.score);
  const hasTranscript = Boolean(interview.transcript);

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-14 w-14 rounded-xl bg-background flex items-center justify-center border border-border overflow-hidden">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${job.company} logo`}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <Building2 className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {job.title}
            </h1>
            <p className="text-muted-foreground">
              {job.company} - {job.location}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {interview.durationMinutes} min interview
          </span>
          <span className="flex items-center gap-1.5 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </span>
        </div>
      </div>

      {/* Generating Insights Banner */}
      {isGenerating && (
        <div className="mb-8 p-6 rounded-2xl bg-primary/5 border border-primary/20 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Generating Insights...
              </h2>
              <p className="text-sm text-muted-foreground">
                Our AI is analyzing your interview performance. This usually
                takes 10-20 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Score Card */}
      <div className="mb-8 p-8 rounded-2xl bg-card/60 backdrop-blur-xl border border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-muted-foreground mb-1">
              Overall Score
            </h2>
            {isGenerating ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="text-lg text-muted-foreground">
                  Calculating...
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-foreground">
                    {evaluation.overallScore}
                  </span>
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <p className="mt-2 text-sm text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {evaluation.overallScore >= 80
                    ? "Above average performance"
                    : evaluation.overallScore >= 60
                      ? "Good performance"
                      : "Room for improvement"}
                </p>
              </>
            )}
          </div>
          <div
            className={`h-32 w-32 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 border-4 border-green-500/30 flex items-center justify-center ${isGenerating ? "animate-pulse" : ""}`}
          >
            <Award
              className={`h-16 w-16 text-green-500 ${isGenerating ? "opacity-50" : ""}`}
            />
          </div>
        </div>
      </div>

      {/* Transcript Section (if available) */}
      {hasTranscript && (
        <div className="mb-8 p-6 rounded-xl bg-card/40 backdrop-blur-sm border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            Interview Transcript
          </h2>
          <div className="max-h-64 overflow-y-auto">
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {interview.transcript}
            </pre>
          </div>
        </div>
      )}

      {/* Category Scores */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Performance by Category
        </h2>
        <div className="grid gap-4">
          {evaluation.categories.map((category) => (
            <div
              key={category.name}
              className={`p-5 rounded-xl bg-card/40 backdrop-blur-sm border border-border ${isGenerating ? "animate-pulse" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-foreground">
                  {category.name}
                </span>
                {isGenerating ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  <span className="text-lg font-semibold text-foreground">
                    {category.score}%
                  </span>
                )}
              </div>
              <div className="h-2 bg-secondary/50 rounded-full overflow-hidden mb-3">
                {!isGenerating && (
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${category.score}%` }}
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isGenerating ? "Analyzing..." : category.feedback}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div
          className={`p-6 rounded-xl bg-green-500/5 border border-green-500/20 ${isGenerating ? "animate-pulse" : ""}`}
        >
          <h3 className="text-base font-semibold text-green-500 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Key Strengths
          </h3>
          {isGenerating ? (
            <p className="text-sm text-muted-foreground">
              Identifying strengths...
            </p>
          ) : (
            <ul className="space-y-3">
              {evaluation.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={`p-6 rounded-xl bg-blue-500/5 border border-blue-500/20 ${isGenerating ? "animate-pulse" : ""}`}
        >
          <h3 className="text-base font-semibold text-blue-500 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Areas for Growth
          </h3>
          {isGenerating ? (
            <p className="text-sm text-muted-foreground">
              Analyzing areas for improvement...
            </p>
          ) : (
            <ul className="space-y-3">
              {evaluation.improvements.map((improvement, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <div className="h-4 w-4 rounded-full border-2 border-blue-500 mt-0.5 shrink-0" />
                  {improvement}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Summary */}
      <div
        className={`p-6 rounded-xl bg-card/40 backdrop-blur-sm border border-border ${isGenerating ? "animate-pulse" : ""}`}
      >
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-500" />
          AI Interviewer Summary
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {isGenerating
            ? "Generating comprehensive summary of your interview performance..."
            : evaluation.summary}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-10 flex flex-col gap-4">
        <div className="flex gap-4">
          <Link
            href="/candidate/history"
            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-2 transition-colors"
          >
            View Interview History
          </Link>
          <Link
            href={`/hr/applicants/${interview.jobId}`}
            className="flex-1 h-12 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium flex items-center justify-center gap-2 transition-colors border border-border"
          >
            <Building2 className="h-4 w-4" />
            View in HR Dashboard
          </Link>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Switch to HR view to see how recruiters review candidates
        </p>
      </div>
    </>
  );
}
