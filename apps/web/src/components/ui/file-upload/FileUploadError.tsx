"use client";

import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadErrorProps {
  error: string;
  onDismiss?: () => void;
}

export function FileUploadError({ error, onDismiss }: FileUploadErrorProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
      <p className="text-sm text-red-400 flex-1">{error}</p>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-red-400 hover:text-red-500"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
