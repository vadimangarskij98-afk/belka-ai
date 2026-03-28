import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db, usersTable, tokenUsageTable, subscriptionPlansTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ENABLE_ADMIN_EMAIL_BOOTSTRAP, IS_PRODUCTION } from "../config";
import {
  clearAuthCookie,
  clearCsrfCookie,
  getAuthTokenFromRequest,
  getCsrfToken,
  revokeSessionToken,
  setAuthCookie,
  setCsrfCookie,
  signAuthToken,
} from "../lib/auth-session";

const router: IRouter = Router();
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

function generateReferralCode(): string {
  return "BLK" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function sanitizeInput(str: string): string {
  return str.trim().slice(0, 255);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPgConstraintName(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const constraint = (error as { constraint?: unknown }).constraint;
  return typeof constraint === "string" ? constraint : null;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: unknown }).code === "23505";
}

function isAdminEmail(email: string): boolean {
  return !IS_PRODUCTION
    && ENABLE_ADMIN_EMAIL_BOOTSTRAP
    && ADMIN_EMAILS.has(email.trim().toLowerCase());
}

function serializeUser(user: typeof usersTable.$inferSelect) {
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

router.get("/csrf", (_req, res) => {
  const token = setCsrfCookie(res);
  res.json({ csrfToken: token });
});

router.get("/session", async (req, res) => {
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

    res.json({ authenticated: true, user: serializeUser(users[0]) });
  } catch {
    res.json({ authenticated: false, user: null });
  }
});

router.get("/me", async (req, res) => {
  try {
    if (!getCsrfToken(req)) {
      setCsrfCookie(res);
    }

    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(serializeUser(users[0]));
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      res.status(400).json({ error: "All fields required" });
      return;
    }

    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanUsername = sanitizeInput(username);

    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }
    if (cleanUsername.length < 2 || cleanUsername.length > 50) {
      res.status(400).json({ error: "Username must be 2-50 characters" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, cleanUsername)).limit(1);
    if (existingUsername.length > 0) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const referralCode = generateReferralCode();
    let inserted;

    try {
      inserted = await db.insert(usersTable).values({
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        role: isAdminEmail(cleanEmail) ? "admin" : "user",
        referralCode,
      }).returning();
    } catch (err) {
      if (isUniqueViolation(err)) {
        const constraint = getPgConstraintName(err);

        if (constraint === "users_email_unique") {
          res.status(409).json({ error: "Email already registered" });
          return;
        }

        if (constraint === "users_username_unique") {
          res.status(409).json({ error: "Username already taken" });
          return;
        }

        if (constraint === "users_referral_code_key") {
          res.status(409).json({ error: "Please retry registration" });
          return;
        }
      }

      throw err;
    }

    const user = inserted[0];
    const token = signAuthToken(user.id);
    setAuthCookie(res, token);
    setCsrfCookie(res, getCsrfToken(req) ?? undefined);
    res.status(201).json({
      user: serializeUser(user),
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const users = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    let effectiveUser = user;
    if (isAdminEmail(cleanEmail) && user.role !== "admin") {
      const updated = await db.update(usersTable)
        .set({ role: "admin" })
        .where(eq(usersTable.id, user.id))
        .returning();
      if (updated[0]) {
        effectiveUser = updated[0];
      }
    }
    const token = signAuthToken(effectiveUser.id);
    setAuthCookie(res, token);
    setCsrfCookie(res, getCsrfToken(req) ?? undefined);
    res.json({
      user: serializeUser(effectiveUser),
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", async (req, res) => {
  await revokeSessionToken(getAuthTokenFromRequest(req));
  clearAuthCookie(res);
  clearCsrfCookie(res);
  res.json({ message: "Logged out" });
});

router.get("/token-usage", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const today = new Date().toISOString().slice(0, 10);
    const usage = await db.select().from(tokenUsageTable)
      .where(and(eq(tokenUsageTable.userId, userId), eq(tokenUsageTable.date, today)))
      .limit(1);
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const userPlan = users[0]?.plan || "free";
    const plans = await db.select().from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.planId, userPlan)).limit(1);
    const tokenLimit = plans[0]?.tokensPerMonth || 50000;
    const tokensUsed = usage[0]?.tokensUsed || 0;
    res.json({ tokensUsed, tokenLimit, date: today, plan: userPlan });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/token-usage", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const tokens = Number(req.body.tokens);
    if (!Number.isInteger(tokens) || tokens <= 0) { res.status(400).json({ error: "Invalid token count" }); return; }
    const today = new Date().toISOString().slice(0, 10);
    const existing = await db.select().from(tokenUsageTable)
      .where(and(eq(tokenUsageTable.userId, userId), eq(tokenUsageTable.date, today)))
      .limit(1);
    if (existing.length > 0) {
      await db.update(tokenUsageTable).set({ tokensUsed: existing[0].tokensUsed + tokens })
        .where(eq(tokenUsageTable.id, existing[0].id));
    } else {
      await db.insert(tokenUsageTable).values({ userId, tokensUsed: tokens, date: today });
    }
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
