"use client";

import { getAllInterviews, getJobById, getUserById } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Search, Building2, Sparkles, Zap, Clock, CheckCircle2, Play } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export default function CandidateJobListings() {
  // Get all interviews with their job details
  const allInterviews = getAllInterviews();
  // Show first 6 interviews for display
  const interviews = allInterviews.slice(0, 6).map((interview) => {
    const job = getJobById(interview.jobId);
    const candidate = getUserById(interview.candidateId);
    return {
      ...interview,
      job,
      candidate,
    };
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-16 py-20 px-6 relative z-10">

        {/* Dynamic Hero Section */}
        <div className="space-y-8 text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-white/10 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">Next-Gen AI Recruiting</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-medium tracking-tight leading-tight">
            Interview once. <br/>
            <span className="ai-gradient-text font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Get matched instantly.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Our AI analyzes your conversation, coding skills, and soft skills to match you with the world&apos;s top engineering teams.
          </p>

          <div className="max-w-xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition duration-500" />
            <div className="relative flex gap-2 p-2 bg-background/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by role (e.g. Senior React Engineer)..."
                  className="pl-10 h-11 bg-transparent border-transparent focus:bg-transparent focus:ring-0 text-base"
                />
              </div>
              <Button size="lg" className="h-11 px-8 bg-foreground text-background hover:bg-foreground/90 transition-all">
                Search
              </Button>
            </div>
          </div>
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
                <Link href={`/interview/${interview.id}`}>
                  <div className="group relative h-full bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:bg-card/80 transition-all cursor-pointer overflow-hidden">
                    {/* Hover Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-duration-500" />

                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-colors">
                          <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                        </div>
                        <Badge variant="outline" className={`${status.color} flex items-center gap-1.5 px-3 py-1`}>
                          <StatusIcon className="h-3 w-3" /> {status.label}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-blue-400 transition-colors">
                        {interview.job?.title || "Interview"}
                      </h3>

                      <p className="text-sm text-muted-foreground mb-2">
                        {interview.candidate?.name || "Candidate"}
                      </p>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-6">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" /> {interview.job?.company}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> {interview.job?.location}
                        </span>
                      </div>

                      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
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
