/**
 * File Validation Logic
 */

export interface FileValidationConfig {
  allowedTypes: string[];
  maxSize: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Map mime types to file extensions for validation
const mimeToExtension: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
  "text/markdown": ".md",
};

export function validateFiles(
  files: File[],
  config: FileValidationConfig,
): ValidationResult {
  if (files.length === 0) {
    return { valid: false, error: "No file selected" };
  }

  const file = files[0];

  // Check file type - match by mime type or file extension
  const typeValid = config.allowedTypes.some((type) => {
    if (file.type === type) {
      return true;
    }
    const ext = mimeToExtension[type];
    if (ext && file.name.toLowerCase().endsWith(ext)) {
      return true;
    }
    return false;
  });

  if (!typeValid) {
    const formats = config.allowedTypes
      .map((t) => {
        const ext = mimeToExtension[t];
        return ext ? ext.slice(1).toUpperCase() : t.split("/")[1].toUpperCase();
      })
      .join(", ");
    return {
      valid: false,
      error: `Only ${formats} files are supported`,
    };
  }

  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = (config.maxSize / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}
