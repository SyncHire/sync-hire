import { metadataExtractorNode } from "../src/langgraph/nodes/extractors/metadata.js";
import { skillsExtractorNode } from "../src/langgraph/nodes/extractors/skills.js";
import { requirementsExtractorNode } from "../src/langgraph/nodes/extractors/requirements.js";
import path from "path";
import type { JDExtractionStateType } from "../src/langgraph/state.js";

// Fix 8: Test Script Type Coercion - Use Factory Function
function createMinimalState(filePath: string, fileType: string, hints: any = {}): JDExtractionStateType {
  return {
    filePath,
    fileType,
    hints,
    documentInfo: { pageCount: 0, isReadable: false },
    metadataResult: null,
    skillsResult: null,
    requirementsResult: null,
    jobData: null,
    validation: {
      isValid: false,
      overallConfidence: 0,
      issues: [],
      warnings: []
    },
    messages: [],
  };
}

async function main() {
  // pnpm --filter @sync-hire/processor exec tsx scripts/test-extractor.ts sample-jd/test-role.txt all
  const targetFile = process.argv[2];
  const nodeType = process.argv[3] || "all";

  if (!targetFile) {
    console.error("Usage: tsx scripts/test-extractor.ts <path-to-file> [metadata|skills|requirements|all]");
    process.exit(1);
  }

  const absolutePath = path.resolve(targetFile);
  console.log(`Testing extractor for: ${absolutePath}`);
  console.log(`Node(s): ${nodeType}\n`);

  // Detect mime manually
  const ext = path.extname(absolutePath).toLowerCase();
  let mime = "application/pdf";
  if (ext === ".png") mime = "image/png";
  if (ext === ".jpg") mime = "image/jpeg";
  if (ext === ".txt") mime = "text/plain";
  if (ext === ".md") mime = "text/markdown";

  // Initialize state using factory
  const state = createMinimalState(absolutePath, mime, {
    metadata: "This is a Senior Frontend Engineer role at Google.",
  });

  try {
    if (nodeType === "metadata" || nodeType === "all") {
      console.log("=== METADATA EXTRACTOR ===");
      const result = await metadataExtractorNode(state);
      console.log(JSON.stringify(result.metadataResult, null, 2));
      console.log();
    }

    if (nodeType === "skills" || nodeType === "all") {
      console.log("=== SKILLS EXTRACTOR ===");
      const result = await skillsExtractorNode(state);
      console.log(JSON.stringify(result.skillsResult, null, 2));
      console.log();
    }

    if (nodeType === "requirements" || nodeType === "all") {
      console.log("=== REQUIREMENTS EXTRACTOR ===");
      const result = await requirementsExtractorNode(state);
      console.log(JSON.stringify(result.requirementsResult, null, 2));
      console.log();
    }

    console.log("✅ Extraction complete!");
  } catch (error) {
    console.error("❌ Extraction failed:", error);
    process.exit(1);
  }
}

main();
