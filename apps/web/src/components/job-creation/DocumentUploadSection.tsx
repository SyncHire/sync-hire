"use client";

import { FileUploadContainer } from "@/components/ui/file-upload/FileUploadContainer";

interface DocumentUploadSectionProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  error?: string | null;
}

export function DocumentUploadSection({
  onFileSelect,
  isProcessing,
  error,
}: DocumentUploadSectionProps) {
  return (
    <FileUploadContainer
      config={{
        allowedTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "text/markdown",
        ],
        maxSize: 10 * 1024 * 1024, // 10MB
      }}
      title="Upload Job Description"
      description="Share the role you're hiring for"
      acceptedFormatsText="PDF, DOCX, TXT, or Markdown, Max 10MB"
      onFileSelect={onFileSelect}
      isProcessing={isProcessing}
      error={error}
    />
  );
}
