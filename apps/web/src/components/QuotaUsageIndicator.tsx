"use client";

/**
 * Quota Usage Indicator
 *
 * Compact warning indicator showing AI usage quota in the header.
 * Only shows when usage is at warning threshold (80%+) or exceeded.
 */

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOrgQuota } from "@/lib/hooks/use-org-quota";

export function QuotaUsageIndicator() {
  const { data: quota, isLoading } = useOrgQuota();

  if (isLoading || !quota) {
    return null;
  }

  const isUnlimited = quota.limit === null;
  const percentUsed = quota.percentUsed ?? 0;
  const isWarning = percentUsed >= 80 && percentUsed < 100;
  const isDanger = percentUsed >= 100;

  // Only show when at warning or danger level
  if (isUnlimited || (!isWarning && !isDanger)) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/hr/settings"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer transition-colors ${
              isDanger
                ? "bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20"
                : "bg-destructive/5 border-destructive/30 text-destructive/80 hover:bg-destructive/10"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium tabular-nums">
              {quota.currentUsage}/{quota.limit}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isDanger ? (
            <p className="text-xs">Quota exceeded - AI features disabled</p>
          ) : (
            <p className="text-xs">
              {quota.remaining} AI requests remaining this month
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
