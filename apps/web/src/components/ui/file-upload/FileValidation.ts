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

export function validateFiles(
  files: File[],
  config: FileValidationConfig
): ValidationResult {
  if (files.length === 0) {
    return { valid: false, error: "No file selected" };
  }

  const file = files[0];

  // Check file type
  const typeValid = config.allowedTypes.some(
    (type) => file.type === type || file.name.endsWith(type.split("/")[1])
  );

  if (!typeValid) {
    const formats = config.allowedTypes
      .map((t) => t.split("/")[1].toUpperCase())
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
