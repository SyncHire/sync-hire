"use client";

import { getAllInterviews, getJobById, getDemoUser } from "@/lib/mock-data";
import { getCompanyLogoUrl } from "@/lib/logo-utils";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Building2, Sparkles, Clock, CheckCircle2, Play } from "lucide-react";
import Link from "next/link";

export default function CandidateJobListings() {
  // Get demo user and their interviews
  const demoUser = getDemoUser();
  const allInterviews = getAllInterviews();

  // Get interviews with job details
  const interviews = allInterviews.map((interview) => {
    const job = getJobById(interview.jobId);
    return {
      ...interview,
      job,
    };
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-16 py-20 px-6 relative z-10">

        {/* Hero Section */}
        <div className="space-y-6 text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">Welcome, {demoUser.name}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
            Your Engineering Interviews
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Practice AI-powered interviews for top engineering roles. Each interview is tailored to the specific position.
          </p>
        </div>

        {/* Interactive Interview Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {interviews.map((interview, i) => {
            const statusConfig = {
              PENDING: { label: "Ready", icon: Play, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
              IN_PROGRESS: { label: "In Progress", icon: Clock, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
              COMPLETED: { label: "Completed", icon: CheckCircle2, color: "bg-green-500/10 text-green-400 border-green-500/20" },
            };
            const status = statusConfig[interview.status];
            const StatusIcon = status.icon;

            return (
              <div
                key={interview.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <Link href={interview.status === "COMPLETED" ? `/interview/${interview.id}/results` : `/interview/${interview.id}`}>
                  <div className="group relative h-full bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 hover:bg-card/80 transition-all cursor-pointer overflow-hidden">
                    {/* Hover Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-duration-500" />

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
                        <Badge variant="outline" className={`${status.color} flex items-center gap-1.5 px-3 py-1`}>
                          <StatusIcon className="h-3 w-3" /> {status.label}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-blue-400 transition-colors">
                        {interview.job?.title || "Interview"}
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

                      <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{interview.durationMinutes} min</span>
                        </div>
                        <span className="text-sm font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                          {interview.status === "COMPLETED" ? "View Results" : "Start Interview"} <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
