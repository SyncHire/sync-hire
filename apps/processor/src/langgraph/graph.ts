import { StateGraph, MemorySaver, END, START } from "@langchain/langgraph";
import { JDExtractionState, type JDExtractionStateType } from "./state.js";
import { documentLoaderNode } from "./nodes/document-loader.js";
import { metadataExtractorNode } from "./nodes/extractors/metadata.js";
import { skillsExtractorNode } from "./nodes/extractors/skills.js";
import { requirementsExtractorNode } from "./nodes/extractors/requirements.js";
import { aggregatorNode } from "./nodes/aggregator.js";
import { logger } from "../utils/logger.js";

// --- Idempotent Router Logic ---
// Determines which extractors need to run based on existing state.
// This enables efficient partial retries: if metadata already exists, skip it.

type ExtractorKey = "metadata" | "skills" | "requirements";

function routeAfterLoader(state: JDExtractionStateType): ExtractorKey[] {
  const targets: ExtractorKey[] = [];

  // Check each result: if null or has error, we need to (re-)run it
  if (!state.metadataResult || state.metadataResult.error) {
    targets.push("metadata");
  }
  if (!state.skillsResult || state.skillsResult.error) {
    targets.push("skills");
  }
  if (!state.requirementsResult || state.requirementsResult.error) {
    targets.push("requirements");
  }

  logger.info("Router: Determined targets", { targets });
  return targets.length > 0 ? targets : ["metadata", "skills", "requirements"]; // Default to all if state is fresh
}

function shouldRunAggregator(state: JDExtractionStateType): "aggregator" | typeof END {
  // Only aggregate if we have at least some data
  const hasAnyData = state.metadataResult || state.skillsResult || state.requirementsResult;
  
  if (hasAnyData) {
    return "aggregator";
  }
  
  logger.warn("Router: No extractor results, skipping aggregator");
  return END;
}

// --- Graph Definition ---

export function buildJDExtractionGraph() {
  const workflow = new StateGraph(JDExtractionState)
    // --- Nodes ---
    .addNode("loader", documentLoaderNode)
    .addNode("metadata", metadataExtractorNode)
    .addNode("skills", skillsExtractorNode)
    .addNode("requirements", requirementsExtractorNode)
    .addNode("aggregator", aggregatorNode)

    // --- Edges ---
    // Start -> Loader
    .addEdge(START, "loader")

    // Loader -> Fan-out to extractors (conditional based on idempotent check)
    .addConditionalEdges("loader", routeAfterLoader, {
      metadata: "metadata",
      skills: "skills",
      requirements: "requirements",
    })

    // Each extractor fans-in to aggregator check
    .addConditionalEdges("metadata", shouldRunAggregator, {
      aggregator: "aggregator",
      [END]: END,
    })
    .addConditionalEdges("skills", shouldRunAggregator, {
      aggregator: "aggregator",
      [END]: END,
    })
    .addConditionalEdges("requirements", shouldRunAggregator, {
      aggregator: "aggregator",
      [END]: END,
    })

    // Aggregator -> End
    .addEdge("aggregator", END);

  // Compile with checkpointer for persistence/resume
  const checkpointer = new MemorySaver();
  const graph = workflow.compile({ checkpointer });

  logger.info("JD Extraction Graph compiled successfully");
  return graph;
}

// Export a pre-built instance for convenience
export const jdExtractionGraph = buildJDExtractionGraph();
