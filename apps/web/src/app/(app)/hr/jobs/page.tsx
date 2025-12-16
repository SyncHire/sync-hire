"use client";

import {
  ArrowRight,
  Building2,
  Clock,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJobs } from "@/lib/hooks/use-job-questions";
import { useActiveOrganization } from "@/lib/hooks/use-organizations";
import { getCompanyLogoUrl } from "@/lib/logo-utils";

function CompanyLogo({ name }: { name: string }) {
  const logoUrl = getCompanyLogoUrl(name);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className="h-8 w-8 object-contain"
      />
    );
  }

  return (
    <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
  );
}

export default function HRJDListings() {
  const { data: activeOrg } = useActiveOrganization();
  const { data, isLoading } = useJobs({
    organizationId: activeOrg?.id,
    pollWhileScanning: true,
  });
  // Ensure jobs is always an array (safeguard against unexpected API responses)
  const jobs = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            Job Listings
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 gap-1 font-normal"
            >
              <Sparkles className="h-3 w-3" /> AI Active
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your open positions and track AI-screened applicants.
          </p>
        </div>
        <Link href="/hr/jobs/create">
          <Button className="gap-2 h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20 transition-all">
            <Plus className="h-4 w-4" /> Post New Job
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Link key={job.id} href={`/hr/jobs/${job.id}`}>
            <div className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-card hover:bg-card/80 hover:border-primary/30 transition-all cursor-pointer h-full overflow-hidden">
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors overflow-hidden">
                      <CompanyLogo name={job.organization?.name || ""} />
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {job.organization?.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className="bg-accent/10 text-accent-foreground border-accent/20 text-[10px] px-2 h-5"
                    >
                      <Zap className="h-3 w-3 mr-1 fill-current" /> AI MATCHING
                      ON
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {job.postedAt instanceof Date ? job.postedAt.toLocaleDateString() : job.postedAt}
                    </span>
                  </div>
                  <h3 className="font-semibold text-xl text-foreground group-hover:text-primary transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.department}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1.5 rounded-md border border-border">
                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1.5 rounded-md border border-border">
                    <Users className="h-3.5 w-3.5" /> {job.employmentType}
                  </span>
                </div>
              </div>

              <div className="relative z-10 mt-8 pt-5 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-7 w-7 rounded-full border-2 border-card bg-secondary"
                      />
                    ))}
                  </div>
                  {job.aiMatchingStatus === "SCANNING" ? (
                    <span className="text-xs font-medium text-primary flex items-center gap-1.5 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Scanning CVs...
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      <strong className="text-foreground">
                        {job.applicantsCount}
                      </strong>{" "}
                      Applicants
                    </span>
                  )}
                </div>

                <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
