import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import healthRouter from "./routes/health.js";
import documentsRouter from "./routes/documents.js";
import { errorHandler } from "./middleware/error-handler.js";

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  // Routes
  app.use("/", healthRouter);
  app.use("/api/documents", documentsRouter);

  // Error Handler
  app.use(errorHandler);

  return app;
};
