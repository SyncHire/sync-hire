import { jdExtractionGraph, type JDExtractionStateType } from "../src/langgraph/index.js";
import path from "path";

// pnpm --filter @sync-hire/processor exec tsx scripts/test-graph.ts sample-jd/test-role.txt

async function main() {
  const targetFile = process.argv[2];

  if (!targetFile) {
    console.error("Usage: tsx scripts/test-graph.ts <path-to-file>");
    process.exit(1);
  }

  const absolutePath = path.resolve(targetFile);
  console.log(`\n🚀 Running JD Extraction Graph on: ${absolutePath}\n`);

  // Detect MIME type
  const ext = path.extname(absolutePath).toLowerCase();
  let mime = "application/pdf";
  if (ext === ".png") mime = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
  if (ext === ".txt") mime = "text/plain";
  if (ext === ".md") mime = "text/markdown";

  // Initial state
  const initialState: Partial<JDExtractionStateType> = {
    filePath: absolutePath,
    fileType: mime,
    hints: {},
  };

  // Thread ID for checkpointer (use file path hash for idempotency demo)
  const threadId = Buffer.from(absolutePath).toString("base64").slice(0, 16);

  try {
    console.log("--- Starting Graph Execution ---\n");
    
    const result = await jdExtractionGraph.invoke(initialState, {
      configurable: { thread_id: threadId },
    });

    console.log("\n--- Extraction Complete ---\n");
    
    console.log("📋 Validation:");
    console.log(JSON.stringify(result.validation, null, 2));
    
    console.log("\n📄 Extracted Job Data:");
    console.log(JSON.stringify(result.jobData, null, 2));

    console.log("\n✅ End-to-End Test Passed!");
  } catch (error) {
    console.error("\n❌ Graph execution failed:", error);
    process.exit(1);
  }
}

main();
