"use client";

import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  showSize?: boolean;
}

export function FilePreview({
  file,
  onRemove,
  showSize = true,
}: FilePreviewProps) {
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

  return (
    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-500/5 dark:border-emerald-500/30">
      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{file.name}</p>
        {showSize && (
          <p className="text-xs text-muted-foreground">{fileSizeMB} MB</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
