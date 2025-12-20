import { fileToGeminiPart } from "../src/langgraph/utils/file-utils.js";
import path from "path";


async function main() {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error("Usage: tsx scripts/test-loader.ts <path-to-file>");
    process.exit(1);
  }

  const absolutePath = path.resolve(targetFile);
  console.log(`Testing loader for: ${absolutePath}`);

  try {
    // Detect mime manually for test script
    const ext = path.extname(absolutePath).toLowerCase();
    let mime = "application/pdf";
    if (ext === ".png") mime = "image/png";
    if (ext === ".jpg") mime = "image/jpeg";
    if (ext === ".txt") mime = "text/plain";

    console.log(`Assumed MIME: ${mime}`);

    const part = await fileToGeminiPart(absolutePath, mime);
    
    console.log("\n✅ SUCCESS: File converted to Gemini Part");
    console.log(`Data Length (Base64): ${part.inlineData.data.length} chars`);
    console.log(`MIME: ${part.inlineData.mimeType}`);
    
    // Preview
    console.log(`Preview: ${part.inlineData.data.substring(0, 50)}...`);

  } catch (error) {
    console.error("\n❌ FAILED:", error);
    process.exit(1);
  }
}

main();
