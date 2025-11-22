/**
 * Date and time utility functions
 */

/**
 * Format seconds to MM:SS string
 * @param seconds - Number of seconds to format
 * @returns Formatted string like "05:30"
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds to HH:MM:SS string (for longer durations)
 * @param seconds - Number of seconds to format
 * @returns Formatted string like "01:05:30"
 */
export function formatTimeWithHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
