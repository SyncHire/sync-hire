/**
 * Interview Results Page
 * Shows candidate's interview performance and feedback
 */
import { mockInterviews, getDemoUser, getJobById } from '@/lib/mock-data';
import { getCompanyLogoUrl } from '@/lib/logo-utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowLeft,
  Clock,
  Star,
  TrendingUp,
  MessageSquare,
  Award,
  Target,
  Zap,
  Building2
} from 'lucide-react';

interface ResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Mock evaluation data (in real app, this comes from AI analysis)
const mockEvaluation = {
  overallScore: 87,
  categories: [
    { name: 'Technical Knowledge', score: 92, feedback: 'Demonstrated strong understanding of core concepts and best practices.' },
    { name: 'Problem Solving', score: 85, feedback: 'Approached problems methodically with clear reasoning.' },
    { name: 'Communication', score: 88, feedback: 'Articulated ideas clearly and provided relevant examples.' },
    { name: 'Experience Relevance', score: 82, feedback: 'Background aligns well with role requirements.' },
  ],
  strengths: [
    'Strong technical foundation in mobile development',
    'Clear communication of complex concepts',
    'Good problem-solving approach',
  ],
  improvements: [
    'Could elaborate more on system design decisions',
    'Consider discussing scalability implications',
  ],
  summary: 'The candidate demonstrated solid technical skills and communication abilities. They showed good problem-solving methodology and relevant experience for the role. Overall, a strong performance that indicates readiness for the position.',
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;

  // Get interview from mock data
  const interview = mockInterviews[id];

  if (!interview || interview.status !== 'COMPLETED') {
    notFound();
  }

  const demoUser = getDemoUser();
  const job = getJobById(interview.jobId);

  if (!job) {
    notFound();
  }

  const companyLogo = getCompanyLogoUrl(job.company);

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)] pointer-events-none opacity-50" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 py-12 pb-24">
        {/* Back Button */}
        <Link
          href="/candidate/jobs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Interviews
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center border border-border overflow-hidden">
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
              <h1 className="text-2xl font-semibold text-foreground">{job.title}</h1>
              <p className="text-muted-foreground">{job.company} - {job.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {interview.durationMinutes} min interview
            </span>
            <span className="flex items-center gap-1.5 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </span>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="mb-8 p-8 rounded-2xl bg-card/60 backdrop-blur-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-muted-foreground mb-1">Overall Score</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-bold text-foreground">{mockEvaluation.overallScore}</span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <p className="mt-2 text-sm text-green-400 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Above average performance
              </p>
            </div>
            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 border-4 border-green-500/30 flex items-center justify-center">
              <Award className="h-16 w-16 text-green-400" />
            </div>
          </div>
        </div>

        {/* Category Scores */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" />
            Performance by Category
          </h2>
          <div className="grid gap-4">
            {mockEvaluation.categories.map((category) => (
              <div
                key={category.name}
                className="p-5 rounded-xl bg-card/40 backdrop-blur-sm border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <span className="text-lg font-semibold text-foreground">{category.score}%</span>
                </div>
                <div className="h-2 bg-secondary/50 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-400 rounded-full transition-all duration-1000"
                    style={{ width: `${category.score}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{category.feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-xl bg-green-500/5 border border-green-500/20">
            <h3 className="text-base font-semibold text-green-400 mb-4 flex items-center gap-2">
              <Star className="h-5 w-5" />
              Key Strengths
            </h3>
            <ul className="space-y-3">
              {mockEvaluation.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <h3 className="text-base font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Areas for Growth
            </h3>
            <ul className="space-y-3">
              {mockEvaluation.improvements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <div className="h-4 w-4 rounded-full border-2 border-blue-400 mt-0.5 shrink-0" />
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 rounded-xl bg-card/40 backdrop-blur-sm border border-border">
          <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-400" />
            AI Interviewer Summary
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {mockEvaluation.summary}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex gap-4">
          <Link
            href="/candidate/jobs"
            className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2 transition-colors"
          >
            View More Interviews
          </Link>
        </div>
      </div>
    </div>
  );
}
