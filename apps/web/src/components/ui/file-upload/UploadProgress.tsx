"use client";

interface UploadProgressProps {
  isProcessing: boolean;
  title?: string;
  description?: string;
}

export function UploadProgress({
  isProcessing,
  title = "Processing your file",
  description = "This will only take a moment",
}: UploadProgressProps) {
  if (!isProcessing) return null;

  return (
    <div className="w-full">
      <div className="bg-card/50 backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
