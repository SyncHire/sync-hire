// src/routes/documents.ts
import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { processDocumentHandler, getStatusHandler } from "../controllers/document.controller.js";

const router = Router();

// POST /api/documents/process
router.post(
  "/process",
  upload.single("file"),
  processDocumentHandler
);

// GET /api/documents/:id/status
router.get("/:id/status", getStatusHandler);

export default router;
