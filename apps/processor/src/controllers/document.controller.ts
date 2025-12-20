// src/controllers/document.controller.ts
import type { Request, Response } from "express";
import { z } from "zod";
import { processDocument } from "../services/processing.service.js";
import * as processingRepo from "../repositories/processing.repository.js";
import { logger } from "../utils/logger.js";

const ProcessRequestSchema = z.object({
  type: z.literal("jd"),
  webhookUrl: z.string().url(),
  correlationId: z.string().optional(),
  config: z.object({
    disabledNodes: z.array(z.string()).optional(),
    confidenceThreshold: z.number().min(0).max(1).optional(),
  }).optional(),
});

export async function processDocumentHandler(req: Request, res: Response) {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({
        error: { code: "MISSING_FILE", message: "No file uploaded" },
      });
    }

    // Parse body fields (multipart/form-data sends strings)
    let bodyData: Record<string, unknown> = {};
    if (req.body.type) bodyData.type = req.body.type;
    if (req.body.webhookUrl) bodyData.webhookUrl = req.body.webhookUrl;
    if (req.body.correlationId) bodyData.correlationId = req.body.correlationId;
    if (req.body.config) {
      try {
        bodyData.config = typeof req.body.config === "string" 
          ? JSON.parse(req.body.config) 
          : req.body.config;
      } catch {
        return res.status(400).json({
          error: { code: "INVALID_CONFIG", message: "config must be valid JSON" },
        });
      }
    }

    // Validate with Zod
    const bodyResult = ProcessRequestSchema.safeParse(bodyData);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid request body",
          details: bodyResult.error.format(),
        },
      });
    }

    const { type, webhookUrl, correlationId, config } = bodyResult.data;

    // Start processing
    const processingId = await processDocument({
      file: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      type,
      webhookUrl,
      correlationId,
      config,
    });

    logger.info("Document processing started", {
      processingId,
      type,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

    // Return 202 Accepted
    res.status(202).json({
      success: true,
      processingId,
      status: "processing",
      message: "Document processing started. Results will be sent to webhook.",
    });
  } catch (error) {
    logger.error("Process document handler error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to start processing",
      },
    });
  }
}

export async function getStatusHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const job = await processingRepo.getJob(id);
    if (!job) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Processing job not found",
        },
      });
    }

    res.json({
      processingId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.status === "completed" ? job.result : undefined,
      error: job.error,
      timestamps: {
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Get status handler error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get status",
      },
    });
  }
}
