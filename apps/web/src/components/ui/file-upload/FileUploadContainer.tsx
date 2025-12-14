"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { FilePreview } from "./FilePreview";
import { FileUploadError } from "./FileUploadError";
import { type FileValidationConfig, validateFiles } from "./FileValidation";
import { UploadProgress } from "./UploadProgress";

interface FileUploadContainerProps {
  config: FileValidationConfig;
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
  acceptedFormatsText?: string;
}

export function FileUploadContainer({
  config,
  onFileSelect,
  isProcessing = false,
  error,
  title = "Drag and drop your file here",
  description = "or click to browse files",
  acceptedFormatsText = "PDF only, Max 10MB",
}: FileUploadContainerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validation = validateFiles([file], config);

      if (!validation.valid) {
        setValidationError(validation.error || "Invalid file");
        return;
      }

      setValidationError(null);
      setSelectedFile(file);
      onFileSelect(file);
    },
    [config, onFileSelect],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (isProcessing) return;

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile, isProcessing],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isProcessing) return;

      const files = e.target.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile, isProcessing],
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
  }, []);

  if (isProcessing) {
    return <UploadProgress isProcessing />;
  }

  // Map mime types to file extensions
  const mimeToExtension: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
  };

  const fileTypeExtensions = config.allowedTypes
    .map((t) => mimeToExtension[t] || "." + t.split("/")[1])
    .join(",");

  return (
    <div className="w-full">
      <div className="bg-card/50 backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl p-8">
        {selectedFile ? (
          <div className="space-y-4">
            <FilePreview file={selectedFile} onRemove={clearFile} />
          </div>
        ) : (
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-500/5"
                : "border-gray-300 hover:border-gray-400 dark:border-white/10 dark:hover:border-white/20"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={fileTypeExtensions}
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />

            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/50 rounded-xl">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>

              <div>
                <p className="text-lg font-medium text-foreground mb-1">
                  {title}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {description}
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span>{acceptedFormatsText}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {(validationError || error) && (
          <div className="mt-4">
            <FileUploadError
              error={validationError || error || ""}
              onDismiss={validationError ? clearFile : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
