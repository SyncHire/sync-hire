import winston from "winston";
import { config } from "../config.js";

const { combine, timestamp, json, colorize, simple, printf } = winston.format;

const logFormat = config.NODE_ENV === "development"
  ? combine(
      colorize(),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    )
  : combine(
      timestamp(),
      json()
    );

export const logger = winston.createLogger({
  level: config.NODE_ENV === "development" ? "debug" : "info",
  format: logFormat,
  transports: [
    new winston.transports.Console()
  ],
});
