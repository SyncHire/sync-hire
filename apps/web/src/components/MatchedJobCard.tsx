"use client";
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, ArrowRight, Zap, Star, Trophy } from 'lucide-react';
import { JobWithMatch } from '@/lib/job-matching';

interface MatchedJobCardProps {
  job: JobWithMatch;
  index: number;
}

export function MatchedJobCard({ job, index }: MatchedJobCardProps) {
  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-amber-50 text-amber-600 border-amber-200 dark:text-amber-400 dark:bg-amber-500/5 dark:border-amber-500/30';
    if (percentage >= 80) return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/5 dark:border-emerald-500/30';
    if (percentage >= 70) return 'bg-blue-50 text-blue-600 border-blue-200 dark:text-blue-400 dark:bg-blue-500/5 dark:border-blue-500/30';
    if (percentage >= 60) return 'bg-purple-50 text-purple-600 border-purple-200 dark:text-purple-400 dark:bg-purple-500/5 dark:border-purple-500/30';
    return 'bg-orange-50 text-orange-600 border-orange-200 dark:text-orange-400 dark:bg-orange-500/5 dark:border-orange-500/30';
  };

  const getMatchIcon = (percentage: number) => {
    if (percentage >= 90) return <Trophy className="h-3 w-3 fill-current" />;
    if (percentage >= 80) return <Star className="h-3 w-3 fill-current" />;
    return <Zap className="h-3 w-3 fill-current" />;
  };

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Link href={`/interview/${job.id}`}>
        <div className="group relative h-full bg-card/50 backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl p-6 hover:bg-card/80 transition-all cursor-pointer overflow-hidden">
          {/* Hover Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-duration-500" />

          {/* Match Percentage Badge */}
          <div className="absolute top-4 right-4 z-20">
            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 px-3 py-1 font-semibold ${getMatchColor(job.matchPercentage)}`}
            >
              {getMatchIcon(job.matchPercentage)}
              {job.matchPercentage}% Match
            </Badge>
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6 pr-20">
              <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center border border-gray-300 dark:border-white/5 group-hover:border-blue-500/30 transition-colors">
                <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-blue-400 transition-colors" />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-blue-400 transition-colors">
                {job.title}
              </h3>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                {job.company}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {job.department}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {job.location}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="flex items-center gap-1.5">
                <span className="font-medium">{job.type}</span>
              </span>
            </div>

            {/* Match Description */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-500/5 dark:border-blue-500/20">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {job.matchPercentage >= 90 && "Excellent match! Your skills and experience align very closely with this role."}
                {job.matchPercentage >= 80 && job.matchPercentage < 90 && "Strong match! Your profile fits this position well."}
                {job.matchPercentage >= 70 && job.matchPercentage < 80 && "Good match! You have most of the key skills and experience required."}
                {job.matchPercentage >= 60 && job.matchPercentage < 70 && "Fair match. Many of your skills are relevant, though some areas may need emphasis."}
                {job.matchPercentage < 60 && "Partial match. You may need to highlight experience that closely aligns with this role."}
              </p>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full border border-card bg-zinc-800" />
                <div className="h-6 w-6 rounded-full border border-card bg-zinc-700" />
                <div className="h-6 w-6 rounded-full border border-card bg-zinc-600 flex items-center justify-center text-[8px]">12+</div>
              </div>
              <span className="text-sm font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                Start Interview <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}