import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "processor",
    version: "0.1.0"
  });
});

export default router;
