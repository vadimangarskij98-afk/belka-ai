import rateLimit, { type Options as RateLimitOptions } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { Request } from "express";
import { getSessionUserId } from "./auth-session";
import { isRedisConfigured, sendRedisCommand } from "./redis";

function getRequesterKey(req: Request): string {
  const userId = req.userId ?? getSessionUserId(req);
  if (userId) {
    return `user:${userId}`;
  }

  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }

  return `ip:${req.ip || "unknown"}`;
}

function buildRedisStore(prefix: string) {
  if (!isRedisConfigured()) {
    return undefined;
  }

  return new RedisStore({
    prefix: `belka:${prefix}:`,
    sendCommand: (...args: string[]) => sendRedisCommand(args) as Promise<any>,
  });
}

interface BelkaLimiterConfig {
  prefix: string;
  windowMs: number;
  max: number;
  message: { error: string };
}

export function createBelkaRateLimiter(config: BelkaLimiterConfig) {
  const options: Partial<RateLimitOptions> = {
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: config.message,
    keyGenerator: (req) => `${config.prefix}:${getRequesterKey(req)}`,
    passOnStoreError: true,
  };

  const store = buildRedisStore(config.prefix);
  if (store) {
    options.store = store;
  }

  return rateLimit(options as RateLimitOptions);
}
