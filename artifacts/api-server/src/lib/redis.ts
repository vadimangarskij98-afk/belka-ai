import { createClient } from "redis";
import { REDIS_URL } from "../config";
import { logger } from "./logger";

type BelkaRedisClient = ReturnType<typeof createClient>;

let redisClient: BelkaRedisClient | null = null;
let connectPromise: Promise<BelkaRedisClient | null> | null = null;
let lastConnectionErrorAt = 0;
const REDIS_RETRY_COOLDOWN_MS = 15_000;

export function isRedisConfigured(): boolean {
  return Boolean(REDIS_URL);
}

function createRedisClientInstance(): BelkaRedisClient {
  const client = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 1_200,
      reconnectStrategy(retries) {
        return Math.min(250 * retries, 2_500);
      },
    },
  });

  client.on("ready", () => {
    logger.info("Redis connection ready");
  });

  client.on("reconnecting", () => {
    logger.info("Redis reconnecting");
  });

  client.on("error", (err) => {
    logger.warn({ err }, "Redis client error");
  });

  client.on("end", () => {
    logger.warn("Redis connection closed");
  });

  return client;
}

export async function getRedisClient(): Promise<BelkaRedisClient | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  if (redisClient?.isReady) {
    return redisClient;
  }

  if (connectPromise) {
    return connectPromise;
  }

  if (lastConnectionErrorAt && Date.now() - lastConnectionErrorAt < REDIS_RETRY_COOLDOWN_MS) {
    return null;
  }

  if (!redisClient) {
    redisClient = createRedisClientInstance();
  }

  connectPromise = redisClient.connect()
    .then(() => redisClient)
    .catch((err) => {
      const now = Date.now();
      if (now - lastConnectionErrorAt > 30_000) {
        logger.warn({ err }, "Redis unavailable; continuing with graceful fallback");
        lastConnectionErrorAt = now;
      }

      try {
        redisClient?.destroy();
      } catch {
        // no-op
      }

      redisClient = null;
      return null;
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

export async function sendRedisCommand(args: string[]): Promise<unknown> {
  const client = await getRedisClient();
  if (!client) {
    throw new Error("Redis unavailable");
  }

  return client.sendCommand(args);
}

export async function setRedisValue(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  if (ttlSeconds && ttlSeconds > 0) {
    await client.set(key, value, { EX: ttlSeconds });
  } else {
    await client.set(key, value);
  }

  return true;
}

export async function getRedisValue(key: string): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  return client.get(key);
}

export async function deleteRedisKey(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  await client.del(key);
  return true;
}

export function warmRedisConnection(): void {
  if (!isRedisConfigured()) {
    return;
  }

  void getRedisClient();
}

export async function getRedisStatus(): Promise<{ configured: boolean; connected: boolean }> {
  const client = await getRedisClient();
  return {
    configured: isRedisConfigured(),
    connected: Boolean(client?.isReady),
  };
}
