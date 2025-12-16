"use client";

/**
 * JD Processing Progress Component
 *
 * Shows multi-step progress when processing a job description:
 * 1. Uploading - File upload
 * 2. Extracting - Parsing the JD
 * 3. AI Analysis - Generating suggestions & questions
 * 4. Complete
 */

import {
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";

export type JDProcessingStage =
  | "uploading"
  | "extracting"
  | "analyzing"
  | "complete"
  | "error";

interface StageConfig {
  label: string;
  description: string;
}

const stages: Record<JDProcessingStage, StageConfig> = {
  uploading: {
    label: "Uploading",
    description: "Uploading your job description",
  },
  extracting: {
    label: "Extracting",
    description: "Parsing job details and requirements",
  },
  analyzing: {
    label: "AI Analysis",
    description: "Generating suggestions and interview questions",
  },
  complete: {
    label: "Complete",
    description: "Ready to review and customize",
  },
  error: {
    label: "Error",
    description: "Something went wrong",
  },
};

const stageIcons: Record<JDProcessingStage, React.ReactNode> = {
  uploading: <Upload className="w-4 h-4" />,
  extracting: <FileText className="w-4 h-4" />,
  analyzing: <Sparkles className="w-4 h-4" />,
  complete: <CheckCircle2 className="w-4 h-4" />,
  error: <FileText className="w-4 h-4" />,
};

type StageStatus = "completed" | "current" | "pending";

/**
 * Get container classes based on stage status
 */
function getStageContainerClasses(status: StageStatus): string {
  switch (status) {
    case "current":
      return "bg-blue-500/10 border border-blue-500/20";
    case "completed":
      return "bg-emerald-500/5 border border-emerald-500/10";
    default:
      return "bg-secondary/20 border border-transparent";
  }
}

/**
 * Get icon/text color classes based on stage status
 */
function getStageColorClasses(status: StageStatus): string {
  switch (status) {
    case "completed":
      return "text-emerald-600 dark:text-emerald-400";
    case "current":
      return "text-blue-400";
    default:
      return "text-muted-foreground";
  }
}

interface JDProcessingProgressProps {
  currentStage: JDProcessingStage;
  error?: string | null;
}

export function JDProcessingProgress({
  currentStage,
  error,
}: JDProcessingProgressProps) {
  const stageOrder: JDProcessingStage[] = [
    "uploading",
    "extracting",
    "analyzing",
    "complete",
  ];
  const currentIndex = stageOrder.indexOf(currentStage);

  function getStageStatus(stage: JDProcessingStage): StageStatus {
    const stageIndex = stageOrder.indexOf(stage);
    if (stageIndex < currentIndex) {
      return "completed";
    }
    if (stageIndex === currentIndex) {
      return "current";
    }
    return "pending";
  }

  function getProgressPercentage(): number {
    if (error) {
      return 0;
    }
    switch (currentStage) {
      case "complete":
        return 100;
      case "uploading":
        return 10;
      case "extracting":
        return 40;
      case "analyzing":
        return 70;
      default:
        return 0;
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8">
        {/* Main Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">
              {error ? "Processing Failed" : "Processing Job Description"}
            </h3>
            <span className="text-sm text-muted-foreground">
              {error ? "0%" : `${Math.round(getProgressPercentage())}%`}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full w-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
              style={{
                transform: `translateX(-${100 - getProgressPercentage()}%)`,
              }}
            />
          </div>
        </div>

        {/* Stage Progress */}
        <div className="space-y-3">
          {stageOrder.slice(0, 3).map((stage) => {
            const status = getStageStatus(stage);
            const config = stages[stage];
            const icon = stageIcons[stage];
            const isCurrent = status === "current";
            const isCompleted = status === "completed";

            const containerClasses = getStageContainerClasses(status);
            const colorClasses = getStageColorClasses(status);

            return (
              <div
                key={stage}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all ${containerClasses}`}
              >
                <div className={`flex-shrink-0 ${colorClasses}`}>
                  {isCurrent ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    icon
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${colorClasses}`}>
                    {config.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {config.description}
                  </p>
                </div>

                {isCompleted && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Success State */}
        {currentStage === "complete" && (
          <div className="mt-6 text-center p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              Job description processed successfully!
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
