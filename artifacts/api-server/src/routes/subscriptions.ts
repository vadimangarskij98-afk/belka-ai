import { Router, type IRouter } from "express";
import { db, subscriptionPlansTable, promoCodesTable, tokenUsageTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { parseStoredStringArray } from "../lib/serialized-arrays";

const router: IRouter = Router();
const ENABLE_PAID_PLAN_SELF_SERVICE = process.env.ENABLE_PAID_PLAN_SELF_SERVICE === "true";

function getUserId(req: any): number | null {
  return req.userId ?? null;
}

router.get("/plans", async (req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.isActive, true));
    res.json({
      plans: plans.map((plan) => ({
        ...plan,
        features: parseStoredStringArray(plan.features),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Get plans error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subscribe", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { planId, promoCode } = req.body;

    const plans = await db.select().from(subscriptionPlansTable)
      .where(and(eq(subscriptionPlansTable.planId, planId), eq(subscriptionPlansTable.isActive, true)))
      .limit(1);

    if (plans.length === 0) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const plan = plans[0];
    if (plan.price > 0 && !ENABLE_PAID_PLAN_SELF_SERVICE) {
      res.status(503).json({
        error: "Paid plan activation is disabled until billing is configured",
      });
      return;
    }

    let discount = 0;

    if (promoCode) {
      const promos = await db.select().from(promoCodesTable)
        .where(and(eq(promoCodesTable.code, promoCode), eq(promoCodesTable.isActive, true)))
        .limit(1);

      if (promos.length > 0) {
        const promo = promos[0];
        if (promo.usageCount < promo.usageLimit && (!promo.expiresAt || promo.expiresAt > new Date())) {
          discount = promo.discountPercent;
          await db.update(promoCodesTable)
            .set({ usageCount: promo.usageCount + 1 })
            .where(eq(promoCodesTable.id, promo.id));
        }
      }
    }

    await db.update(usersTable).set({ plan: planId }).where(eq(usersTable.id, userId));

    const finalPrice = plan.price * (1 - discount / 100);

    res.json({
      success: true,
      plan: plan.name,
      price: finalPrice,
      discount,
      tokensPerMonth: plan.tokensPerMonth,
    });
  } catch (err) {
    req.log.error({ err }, "Subscribe error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/usage", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const today = new Date().toISOString().slice(0, 10);
    const usage = await db.select().from(tokenUsageTable)
      .where(and(eq(tokenUsageTable.userId, userId), eq(tokenUsageTable.date, today)))
      .limit(1);

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const userPlan = users[0]?.plan || "free";

    const plans = await db.select().from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.planId, userPlan))
      .limit(1);

    const limit = plans.length > 0 ? plans[0].tokensPerMonth : 10000;
    const used = usage.length > 0 ? usage[0].tokensUsed : 0;

    res.json({
      used,
      limit,
      plan: userPlan,
      remaining: Math.max(0, limit - used),
      percentage: Math.min(100, Math.round((used / limit) * 100)),
    });
  } catch (err) {
    req.log.error({ err }, "Get usage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/track-usage", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { tokens } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const existing = await db.select().from(tokenUsageTable)
      .where(and(eq(tokenUsageTable.userId, userId), eq(tokenUsageTable.date, today)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(tokenUsageTable)
        .set({ tokensUsed: existing[0].tokensUsed + (tokens || 0) })
        .where(eq(tokenUsageTable.id, existing[0].id));
    } else {
      await db.insert(tokenUsageTable).values({
        userId,
        tokensUsed: tokens || 0,
        date: today,
      });
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Track usage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/apply-promo", async (req, res) => {
  try {
    const { code } = req.body;
    const promos = await db.select().from(promoCodesTable)
      .where(and(eq(promoCodesTable.code, code), eq(promoCodesTable.isActive, true)))
      .limit(1);

    if (promos.length === 0) {
      res.status(404).json({ error: "Promo code not found" });
      return;
    }

    const promo = promos[0];
    if (promo.usageCount >= promo.usageLimit) {
      res.status(400).json({ error: "Promo code usage limit reached" });
      return;
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      res.status(400).json({ error: "Promo code expired" });
      return;
    }

    res.json({
      valid: true,
      discount: promo.discountPercent,
      planId: promo.planId,
    });
  } catch (err) {
    req.log.error({ err }, "Apply promo error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
