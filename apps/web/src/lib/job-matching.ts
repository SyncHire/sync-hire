import { Job } from './mock-data';

export interface JobWithMatch extends Job {
  matchPercentage: number;
}

// Simple hash function to generate deterministic but seemingly random values
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate mock match percentages for jobs based on CV filename
 * Uses a deterministic hash to ensure same CV always produces same results
 */
export function generateJobMatches(jobs: Job[], cvFilename: string): JobWithMatch[] {
  const seed = hashString(cvFilename);

  return jobs.map((job) => {
    // Combine job hash with CV seed for deterministic but varied results
    const jobHash = hashString(job.id + job.title);
    const combinedHash = (seed + jobHash) % 1000;

    // Generate match percentage between 70-99%
    // Higher seeds tend to produce higher matches
    let matchPercentage = 70 + (combinedHash % 30);

    // Boost match for certain job titles based on common keywords
    const titleLower = job.title.toLowerCase();
    const filenameLower = cvFilename.toLowerCase();

    if (titleLower.includes('senior') && filenameLower.includes('senior')) {
      matchPercentage = Math.min(99, matchPercentage + 5);
    }
    if (titleLower.includes('frontend') && filenameLower.includes('frontend')) {
      matchPercentage = Math.min(99, matchPercentage + 8);
    }
    if (titleLower.includes('backend') && filenameLower.includes('backend')) {
      matchPercentage = Math.min(99, matchPercentage + 8);
    }
    if (titleLower.includes('engineer') && filenameLower.includes('engineer')) {
      matchPercentage = Math.min(99, matchPercentage + 3);
    }
    if (titleLower.includes('designer') && filenameLower.includes('design')) {
      matchPercentage = Math.min(99, matchPercentage + 10);
    }

    return {
      ...job,
      matchPercentage: Math.round(matchPercentage)
    };
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Simulate CV parsing with progress updates
 */
export async function simulateCVParsing(
  onProgress: (progress: number) => void,
  delay: number = 2000
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const duration = delay;

    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);

      onProgress(Math.round(progress));

      if (progress >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

/**
 * Simulate job matching with progress updates
 */
export async function simulateJobMatching(
  onProgress: (progress: number) => void,
  delay: number = 2500
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const duration = delay;

    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);

      onProgress(Math.round(progress));

      if (progress >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 150);
  });
}

/**
 * Get status messages for different processing stages
 */
export function getProcessingStatusMessage(stage: 'parsing' | 'matching', progress: number): string {
  if (stage === 'parsing') {
    if (progress < 30) return 'Extracting text from PDF...';
    if (progress < 60) return 'Analyzing skills and experience...';
    if (progress < 90) return 'Identifying qualifications...';
    return 'Finalizing profile analysis...';
  } else {
    if (progress < 25) return 'Scanning job database...';
    if (progress < 50) return 'Comparing skills to job requirements...';
    if (progress < 75) return 'Calculating match scores...';
    if (progress < 90) return 'Ranking best opportunities...';
    return 'Preparing personalized recommendations...';
  }
}