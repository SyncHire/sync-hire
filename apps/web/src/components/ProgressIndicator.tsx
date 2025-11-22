"use client";

import React from 'react';
import { CheckCircle2, Circle, Loader2, Brain, Sparkles, Trophy } from 'lucide-react';

export type ProcessingStage = 'upload' | 'parsing' | 'matching' | 'complete' | 'error';

interface StageConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
}

const stages: Record<ProcessingStage, StageConfig> = {
  upload: {
    label: 'Upload',
    description: 'Uploading your CV',
    icon: <Circle className="w-4 h-4" />
  },
  parsing: {
    label: 'Parsing',
    description: 'Analyzing your skills and experience',
    icon: <Brain className="w-4 h-4 animate-pulse" />
  },
  matching: {
    label: 'Matching',
    description: 'Finding the best job opportunities',
    icon: <Sparkles className="w-4 h-4 animate-pulse" />
  },
  complete: {
    label: 'Complete',
    description: 'Ready to explore your matches',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  error: {
    label: 'Error',
    description: 'Something went wrong',
    icon: <Circle className="w-4 h-4" />
  }
};

interface ProcessingProgressProps {
  currentStage: ProcessingStage;
  progress?: number;
  error?: string | null;
}

export function ProcessingProgress({ currentStage, progress = 0, error }: ProcessingProgressProps) {
  const stageOrder: ProcessingStage[] = ['upload', 'parsing', 'matching', 'complete'];
  const currentIndex = stageOrder.indexOf(currentStage);

  const getStageStatus = (stage: ProcessingStage): 'completed' | 'current' | 'pending' => {
    const stageIndex = stageOrder.indexOf(stage);
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getProgressPercentage = () => {
    if (error) return 0;
    if (currentStage === 'complete') return 100;
    if (currentStage === 'parsing') return 25 + (progress / 100) * 25;
    if (currentStage === 'matching') return 50 + (progress / 100) * 40;
    return 0;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card/50 backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl p-8">
        {/* Main Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">
              {error ? 'Processing Failed' : 'Processing Your CV'}
            </h3>
            <span className="text-sm text-muted-foreground">
              {error ? '0%' : `${Math.round(getProgressPercentage())}%`}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full w-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ transform: `translateX(-${100 - getProgressPercentage()}%)` }}
            />
          </div>
        </div>

        {/* Stage Progress */}
        <div className="space-y-4">
          {stageOrder.slice(0, 3).map((stage) => {
            const status = getStageStatus(stage);
            const config = stages[stage];
            const isCurrent = status === 'current';
            const isCompleted = status === 'completed';

            return (
              <div
                key={stage}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : isCompleted
                    ? 'bg-green-500/5 border border-green-500/10'
                    : 'bg-secondary/20 border border-transparent'
                }`}
              >
                <div className={`flex-shrink-0 ${
                  isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                  isCurrent ? 'text-blue-400' :
                  'text-muted-foreground'
                }`}>
                  {isCurrent ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    config.icon
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${
                    isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                    isCurrent ? 'text-blue-400' :
                    'text-muted-foreground'
                  }`}>
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
        {currentStage === 'complete' && (
          <div className="mt-6 text-center p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 rounded-xl">
            <Trophy className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              Great! We found personalized job matches for you
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