import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import router from "./routes";
import authRouter from "./routes/auth";
import { logger } from "./lib/logger";
import { createBelkaRateLimiter } from "./lib/rate-limit";
import { warmRedisConnection } from "./lib/redis";
import { getCsrfToken, getVerifiedSessionUserId, hasValidCsrfToken, setCsrfCookie } from "./lib/auth-session";
import { IS_PRODUCTION } from "./config";

const app: Express = express();

app.set("trust proxy", 1);
warmRedisConnection();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
  : (IS_PRODUCTION ? [] : ["http://localhost:5173", "http://127.0.0.1:5173"]);

function isOriginAllowed(origin?: string): boolean {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

app.use(cookieParser());
app.use(async (req: Request, _res: Response, next: NextFunction) => {
  try {
    req.userId = await getVerifiedSessionUserId(req) ?? undefined;
  } catch {
    req.userId = undefined;
  }

  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) return callback(null, true);
    callback(new Error("CORS not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
}));

const globalLimiter = createBelkaRateLimiter({
  prefix: "global",
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = createBelkaRateLimiter({
  prefix: "auth",
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many authentication attempts" },
});

const chatLimiter = createBelkaRateLimiter({
  prefix: "chat",
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many chat requests, please slow down" },
});

const voiceLimiter = createBelkaRateLimiter({
  prefix: "voice",
  windowMs: 60 * 1000,
  max: 40,
  message: { error: "Too many voice requests, please slow down" },
});

const mcpLimiter = createBelkaRateLimiter({
  prefix: "mcp",
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many MCP requests, please slow down" },
});

app.use(globalLimiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.cookies?.belka_csrf) {
    setCsrfCookie(res);
  }

  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  if (!hasValidCsrfToken(req)) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }

  next();
});

app.disable("x-powered-by");

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/belka/chat", chatLimiter);
app.use("/api/voice", voiceLimiter);
app.use("/api/mcp", mcpLimiter);

function serializeSessionUser(user: typeof usersTable.$inferSelect) {
  return {
    id: String(user.id),
    email: user.email,
    username: user.username,
    role: user.role,
    plan: user.plan,
    referralCode: user.referralCode,
    bonusRequests: user.bonusRequests,
    createdAt: user.createdAt.toISOString(),
  };
}

app.get("/api/auth/csrf", (req: Request, res: Response) => {
  req.log.info("Auth csrf bootstrap hit");
  const token = setCsrfCookie(res, getCsrfToken(req) ?? undefined);
  res.json({ csrfToken: token });
});

app.get("/api/auth/session", async (req: Request, res: Response) => {
  req.log.info("Auth session bootstrap hit");

  try {
    if (!getCsrfToken(req)) {
      setCsrfCookie(res);
    }

    const userId = req.userId;
    if (!userId) {
      res.json({ authenticated: false, user: null });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) {
      res.json({ authenticated: false, user: null });
      return;
    }

    res.json({ authenticated: true, user: serializeSessionUser(users[0]) });
  } catch (err) {
    req.log.warn({ err }, "Auth session bootstrap failed");
    res.json({ authenticated: false, user: null });
  }
});

// Mount the rest of auth routes directly so login/register/logout stay public
// and do not depend on downstream router composition.
app.use("/api/auth", authRouter);
app.use("/api", router);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
