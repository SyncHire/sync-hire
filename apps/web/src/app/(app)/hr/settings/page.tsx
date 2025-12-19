"use client";

/**
 * Organization Settings Page
 *
 * Shows organization details and AI usage quota stats.
 */

import { Building2, Zap } from "lucide-react";
import { useActiveOrganization } from "@/lib/auth-client";
import { useOrgQuota } from "@/lib/hooks/use-org-quota";

const tierLabels = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
} as const;

const tierColors = {
  FREE: "bg-muted text-muted-foreground",
  STARTER: "bg-primary/10 text-primary",
  PROFESSIONAL: "bg-accent text-accent-foreground",
  ENTERPRISE: "bg-secondary text-secondary-foreground border border-primary/20",
} as const;

const endpointLabels: Record<string, string> = {
  "cv/extract": "CV Extraction",
  "jobs/extract-jd": "JD Extraction",
  "jobs/generate-questions": "Question Generation",
  "jobs/apply": "Application Questions",
  "jobs/match-candidates": "Candidate Matching",
  "jobs/create": "Job Creation",
  "interviews/analyze": "Interview Analysis",
};

export default function SettingsPage() {
  const { data: activeOrg } = useActiveOrganization();
  const { data: quota, isLoading: quotaLoading } = useOrgQuota();

  const percentUsed = quota?.percentUsed ?? 0;
  const isWarning = percentUsed >= 80 && percentUsed < 100;
  const isDanger = percentUsed >= 100;

  const progressColor = isDanger
    ? "bg-destructive"
    : isWarning
      ? "bg-destructive/70"
      : "bg-primary";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings and view usage
        </p>
      </div>

      {/* Organization Info */}
      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">{activeOrg?.name || "Organization"}</h2>
            <p className="text-sm text-muted-foreground">Organization details</p>
          </div>
        </div>
      </section>

      {/* AI Usage Quota */}
      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">AI Usage</h2>
            <p className="text-sm text-muted-foreground">
              Monthly AI request quota and usage
            </p>
          </div>
        </div>

        {quotaLoading ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        ) : quota ? (
          <div className="space-y-6">
            {/* Tier and Usage */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${tierColors[quota.tier]}`}
                >
                  {tierLabels[quota.tier]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {quota.periodKey.replace("-", "/")}
                </span>
              </div>
              {quota.limit !== null && (
                <span className="text-sm font-medium tabular-nums">
                  {quota.currentUsage} / {quota.limit} requests
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {quota.limit !== null ? (
              <div className="space-y-2">
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${progressColor} transition-all`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{percentUsed.toFixed(0)}% used</span>
                  <span>
                    {quota.remaining !== null ? `${quota.remaining} remaining` : ""}
                  </span>
                </div>
                {isDanger && (
                  <p className="text-sm text-destructive font-medium">
                    Quota exceeded. AI features are disabled until next month.
                  </p>
                )}
                {isWarning && !isDanger && (
                  <p className="text-sm text-destructive/80">
                    Approaching quota limit. Consider upgrading your plan.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Unlimited AI requests with Enterprise plan
              </p>
            )}

            {/* Endpoint Breakdown */}
            {quota.breakdown && Object.keys(quota.breakdown).length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">Usage by Feature</h3>
                <div className="space-y-2">
                  {Object.entries(quota.breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([endpoint, count]) => (
                      <div
                        key={endpoint}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {endpointLabels[endpoint] || endpoint}
                        </span>
                        <span className="font-medium tabular-nums">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            No quota data available
          </div>
        )}
      </section>
    </div>
  );
}
