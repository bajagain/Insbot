import pino from "pino";
import { env, isProduction } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "DISCORD_TOKEN",
      "INSTAGRAM_PROVIDER_API_KEY",
      "*.token",
      "*.apiKey",
      "headers.authorization",
    ],
    censor: "[redacted]",
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
});

export type Logger = typeof logger;
