import { Router, type IRouter, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable, referralsTable, referralSettingsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "belka-ai-secret-key-2024";

function getUserId(req: Request): number | null {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    return decoded.id;
  } catch { return null; }
}

function generateReferralCode(): string {
  return "BLK" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

router.get("/my-code", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) { res.status(404).json({ error: "User not found" }); return; }

    let referralCode = users[0].referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode();
      await db.update(usersTable).set({ referralCode }).where(eq(usersTable.id, userId));
    }

    const [referralCount] = await db.select({ count: count() }).from(referralsTable)
      .where(eq(referralsTable.referrerId, userId));

    const [bonusCount] = await db.select({ count: count() }).from(referralsTable)
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.bonusAwarded, true)));

    const settings = await db.select().from(referralSettingsTable).limit(1);
    const bonusPerReferral = settings[0]?.bonusRequests || 7;

    res.json({
      referralCode,
      totalReferrals: Number(referralCount?.count) || 0,
      bonusesEarned: Number(bonusCount?.count) || 0,
      bonusRequests: users[0].bonusRequests,
      bonusPerReferral,
    });
  } catch (err) {
    req.log.error({ err }, "Get referral code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/apply", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { code } = req.body;
    if (!code) { res.status(400).json({ error: "Referral code required" }); return; }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) { res.status(404).json({ error: "User not found" }); return; }

    if (users[0].referredBy) {
      res.status(400).json({ error: "You already used a referral code" }); return;
    }

    if (users[0].referralCode === code) {
      res.status(400).json({ error: "Cannot use your own referral code" }); return;
    }

    const referrers = await db.select().from(usersTable)
      .where(eq(usersTable.referralCode, code)).limit(1);
    if (referrers.length === 0) {
      res.status(404).json({ error: "Invalid referral code" }); return;
    }

    const referrer = referrers[0];
    const settings = await db.select().from(referralSettingsTable).limit(1);
    const bonus = settings[0]?.bonusRequests || 7;
    const isActive = settings[0]?.isActive !== false;

    if (!isActive) {
      res.status(400).json({ error: "Referral program is currently inactive" }); return;
    }

    await db.insert(referralsTable).values({
      referrerId: referrer.id,
      referredId: userId,
      bonusAwarded: true,
    });

    await db.update(usersTable).set({
      referredBy: referrer.id,
      bonusRequests: users[0].bonusRequests + bonus,
    }).where(eq(usersTable.id, userId));

    await db.update(usersTable).set({
      bonusRequests: referrer.bonusRequests + bonus,
    }).where(eq(usersTable.id, referrer.id));

    res.json({
      success: true,
      bonusAwarded: bonus,
      message: `You and the referrer each received ${bonus} bonus requests!`,
    });
  } catch (err) {
    req.log.error({ err }, "Apply referral error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const referrals = await db.select().from(referralsTable)
      .where(eq(referralsTable.referrerId, userId));

    const user = await db.select({ bonusRequests: usersTable.bonusRequests }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const referredUsers = await Promise.all(
      referrals.map(async (r) => {
        const u = await db.select({ username: usersTable.username, createdAt: usersTable.createdAt })
          .from(usersTable).where(eq(usersTable.id, r.referredId)).limit(1);
        return {
          username: u[0]?.username || "Unknown",
          joinedAt: u[0]?.createdAt?.toISOString() || r.createdAt.toISOString(),
          bonusAwarded: r.bonusAwarded,
        };
      })
    );

    res.json({
      referrals: referredUsers,
      totalReferred: referrals.length,
      bonusRequests: user[0]?.bonusRequests || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Referral stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
