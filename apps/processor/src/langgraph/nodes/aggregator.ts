import type { JDExtractionStateType } from "../state.js";
import { logger } from "../../utils/logger.js";
import type { ExtractedJobData } from "@sync-hire/shared";

export async function aggregatorNode(
  state: JDExtractionStateType
): Promise<Partial<JDExtractionStateType>> {
  const { metadataResult, skillsResult, requirementsResult } = state;

  logger.info("AggregatorNode: Merging results");

  const issues: string[] = [];
  const warnings: string[] = [];

  // Collect issues from failed extractions
  if (metadataResult?.error) {
    issues.push(`Metadata extraction failed: ${metadataResult.error}`);
  }
  if (skillsResult?.error) {
    warnings.push(`Skills extraction failed: ${skillsResult.error}`);
  }
  if (requirementsResult?.error) {
    warnings.push(`Requirements extraction failed: ${requirementsResult.error}`);
  }

  // Merge data (partial success is OK)
  const mergedData: ExtractedJobData = {
    title: metadataResult?.data?.title || "Unknown",
    company: metadataResult?.data?.company || "Unknown",
    location: metadataResult?.data?.location,
    salary: metadataResult?.data?.salary,
    employmentType: metadataResult?.data?.employmentType,
    workArrangement: metadataResult?.data?.workArrangement,
    description: metadataResult?.data?.description || "",
    requirements: {
      skills: skillsResult?.data || [],
      // Improve regex logic for experience extraction (Fix 7)
      experience: requirementsResult?.data?.required?.find(r => 
        /(\d+\+?\s*(-?\d+)?\s*years?)|(experience|worked as|track record)/i.test(r)
      ),
      education: requirementsResult?.data?.required?.find(r =>
        r.toLowerCase().includes("degree") || r.toLowerCase().includes("bachelor") || r.toLowerCase().includes("master")
      ),
    },
    benefits: [], // Could be extracted in a future node
  };

  // Calculate overall confidence (weighted average)
  const scores = [
    metadataResult?.evaluation?.confidenceScore ?? 0,
    skillsResult?.evaluation?.confidenceScore ?? 0,
    requirementsResult?.evaluation?.confidenceScore ?? 0,
  ];
  const overallConfidence = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Cross-validation checks
  if (mergedData.title === "Unknown" && mergedData.company === "Unknown") {
    issues.push("Critical metadata missing: both title and company are unknown");
  }
  if (mergedData.requirements.skills.length === 0) {
    warnings.push("No skills were extracted from the document");
  }

  const isValid = issues.length === 0 && overallConfidence >= 0.6;

  logger.info("AggregatorNode: Aggregation complete", {
    isValid,
    overallConfidence,
    issueCount: issues.length,
    warningCount: warnings.length,
  });

  return {
    jobData: mergedData,
    validation: {
      isValid,
      overallConfidence,
      issues,
      warnings,
    },
  };
}
