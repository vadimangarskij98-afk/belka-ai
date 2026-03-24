import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db, usersTable, tokenUsageTable, subscriptionPlansTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "belka-ai-secret-key-2024";

function generateReferralCode(): string {
  return "BLK" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function sanitizeInput(str: string): string {
  return str.trim().slice(0, 255);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const users = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id)).limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const user = users[0];
    res.json({
      id: String(user.id),
      email: user.email,
      username: user.username,
      role: user.role,
      plan: user.plan,
      referralCode: user.referralCode,
      bonusRequests: user.bonusRequests,
      createdAt: user.createdAt.toISOString(),
    });
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
    const inserted = await db.insert(usersTable).values({
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      referralCode,
    }).returning();
    const user = inserted[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({
      user: {
        id: String(user.id),
        email: user.email,
        username: user.username,
        role: user.role,
        plan: user.plan,
        referralCode: user.referralCode,
        bonusRequests: user.bonusRequests,
        createdAt: user.createdAt.toISOString(),
      },
      token,
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
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      user: {
        id: String(user.id),
        email: user.email,
        username: user.username,
        role: user.role,
        plan: user.plan,
        referralCode: user.referralCode,
        bonusRequests: user.bonusRequests,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/token-usage", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const today = new Date().toISOString().slice(0, 10);
    const usage = await db.select().from(tokenUsageTable)
      .where(and(eq(tokenUsageTable.userId, decoded.id), eq(tokenUsageTable.date, today)))
      .limit(1);
    const users = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id)).limit(1);
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
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const tokens = Number(req.body.tokens);
    if (!Number.isInteger(tokens) || tokens <= 0) { res.status(400).json({ error: "Invalid token count" }); return; }
    const today = new Date().toISOString().slice(0, 10);
    const existing = await db.select().from(tokenUsageTable)
      .where(and(eq(tokenUsageTable.userId, decoded.id), eq(tokenUsageTable.date, today)))
      .limit(1);
    if (existing.length > 0) {
      await db.update(tokenUsageTable).set({ tokensUsed: existing[0].tokensUsed + tokens })
        .where(eq(tokenUsageTable.id, existing[0].id));
    } else {
      await db.insert(tokenUsageTable).values({ userId: decoded.id, tokensUsed: tokens, date: today });
    }
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
