import { Router, type IRouter } from "express";
import { db, usersTable, conversationsTable, messagesTable, agentsTable, aiModelsTable, subscriptionPlansTable, promoCodesTable, tokenUsageTable, referralsTable, referralSettingsTable, apiRequestsTable } from "@workspace/db";
import { eq, count, and, gte, sql, desc } from "drizzle-orm";
import { encryptSecret } from "../lib/secrets";
import { parseStoredStringArray, stringifyStoredStringArray } from "../lib/serialized-arrays";

const router: IRouter = Router();

router.get("/stats", async (req, res) => {
  try {
    const [totalUsers] = await db.select({ count: count() }).from(usersTable);
    const [totalConversations] = await db.select({ count: count() }).from(conversationsTable);
    const [totalMessages] = await db.select({ count: count() }).from(messagesTable);
    const [activeAgents] = await db.select({ count: count() }).from(agentsTable).where(eq(agentsTable.isActive, true));
    const [totalPromos] = await db.select({ count: count() }).from(promoCodesTable);
    const [totalReferrals] = await db.select({ count: count() }).from(referralsTable);

    const today = new Date().toISOString().slice(0, 10);
    const todayUsage = await db.select({ total: sql<number>`COALESCE(SUM(${tokenUsageTable.tokensUsed}), 0)` })
      .from(tokenUsageTable).where(eq(tokenUsageTable.date, today));
    const requestsToday = Number(todayUsage[0]?.total) || 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [apiCallsResult] = await db.select({ count: count() }).from(apiRequestsTable)
      .where(gte(apiRequestsTable.createdAt, todayStart));

    res.json({
      totalUsers: Number(totalUsers?.count) || 0,
      totalConversations: Number(totalConversations?.count) || 0,
      totalMessages: Number(totalMessages?.count) || 0,
      activeAgents: Number(activeAgents?.count) || 0,
      tokensUsedToday: requestsToday,
      apiCallsToday: Number(apiCallsResult?.count) || 0,
      totalPromoCodes: Number(totalPromos?.count) || 0,
      totalReferrals: Number(totalReferrals?.count) || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const analytics = await Promise.all(days.map(async (date) => {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [usageResult] = await db.select({ total: sql<number>`COALESCE(SUM(${tokenUsageTable.tokensUsed}), 0)` })
        .from(tokenUsageTable).where(eq(tokenUsageTable.date, date));

      const [messagesResult] = await db.select({ count: count() }).from(messagesTable)
        .where(and(gte(messagesTable.createdAt, dayStart), sql`${messagesTable.createdAt} < ${dayEnd}`));

      const [newUsersResult] = await db.select({ count: count() }).from(usersTable)
        .where(and(gte(usersTable.createdAt, dayStart), sql`${usersTable.createdAt} < ${dayEnd}`));

      return {
        date,
        requests: Number(usageResult?.total) || 0,
        messages: Number(messagesResult?.count) || 0,
        newUsers: Number(newUsersResult?.count) || 0,
      };
    }));

    res.json({ analytics });
  } catch (err) {
    req.log.error({ err }, "Analytics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/models", async (req, res) => {
  try {
    const models = await db.select().from(aiModelsTable);
    res.json({
      models: models.map(m => ({
        id: String(m.id),
        name: m.name,
        provider: m.provider,
        modelId: m.modelId,
        apiKey: m.apiKey ? "***" : undefined,
        capabilities: parseStoredStringArray(m.capabilities),
        contextWindow: m.contextWindow,
        costPerToken: m.costPerToken,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List models error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/models", async (req, res) => {
  try {
    const { name, provider, modelId, apiKey, capabilities, contextWindow, costPerToken } = req.body;
    const inserted = await db.insert(aiModelsTable).values({
      name, provider, modelId, apiKey: encryptSecret(apiKey),
      capabilities: stringifyStoredStringArray(capabilities),
      contextWindow, costPerToken,
    }).returning();
    const m = inserted[0];
    res.status(201).json({
      id: String(m.id), name: m.name, provider: m.provider, modelId: m.modelId,
      capabilities: parseStoredStringArray(m.capabilities),
      contextWindow: m.contextWindow, costPerToken: m.costPerToken,
      isActive: m.isActive, createdAt: m.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Add model error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/models/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, provider, modelId, apiKey, capabilities, contextWindow, costPerToken } = req.body;
    const updated = await db.update(aiModelsTable).set({
      ...(name !== undefined && { name }),
      ...(provider !== undefined && { provider }),
      ...(modelId !== undefined && { modelId }),
      ...(apiKey !== undefined && { apiKey: apiKey ? encryptSecret(apiKey) : null }),
      ...(capabilities !== undefined && { capabilities: stringifyStoredStringArray(capabilities) }),
      ...(contextWindow !== undefined && { contextWindow }),
      ...(costPerToken !== undefined && { costPerToken }),
    }).where(eq(aiModelsTable.id, id)).returning();
    if (updated.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    const m = updated[0];
    res.json({
      id: String(m.id), name: m.name, provider: m.provider, modelId: m.modelId,
      capabilities: parseStoredStringArray(m.capabilities),
      contextWindow: m.contextWindow, costPerToken: m.costPerToken,
      isActive: m.isActive, createdAt: m.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Update model error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/models/:id", async (req, res) => {
  try {
    await db.delete(aiModelsTable).where(eq(aiModelsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete model error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    res.json({
      users: users.map(u => ({
        id: String(u.id), email: u.email, username: u.username,
        role: u.role, plan: u.plan, referralCode: u.referralCode,
        bonusRequests: u.bonusRequests,
        createdAt: u.createdAt.toISOString(),
      })),
      total: users.length,
    });
  } catch (err) {
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" }); return;
    }
    const updated = await db.update(usersTable).set({ role }).where(eq(usersTable.id, id)).returning();
    if (updated.length === 0) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true, user: { id: String(updated[0].id), role: updated[0].role } });
  } catch (err) {
    req.log.error({ err }, "Update user role error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id/plan", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { plan } = req.body;
    if (!["free", "pro", "enterprise"].includes(plan)) {
      res.status(400).json({ error: "Invalid plan" }); return;
    }
    const updated = await db.update(usersTable).set({ plan }).where(eq(usersTable.id, id)).returning();
    if (updated.length === 0) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true, user: { id: String(updated[0].id), plan: updated[0].plan } });
  } catch (err) {
    req.log.error({ err }, "Update user plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subscriptions", async (req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlansTable);
    res.json({
      plans: plans.map(p => ({
        id: String(p.id), planId: p.planId, name: p.name, description: p.description,
        price: p.price, discountPercent: p.discountPercent, tokensPerMonth: p.tokensPerMonth,
        agentsLimit: p.agentsLimit, features: parseStoredStringArray(p.features),
        isActive: p.isActive, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List subscriptions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/subscriptions/:planId", async (req, res) => {
  try {
    const { planId } = req.params;
    const { name, description, price, discountPercent, tokensPerMonth, agentsLimit, features } = req.body;
    const updated = await db.update(subscriptionPlansTable).set({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(tokensPerMonth !== undefined && { tokensPerMonth }),
      ...(agentsLimit !== undefined && { agentsLimit }),
      ...(features !== undefined && { features: stringifyStoredStringArray(features) }),
      updatedAt: new Date(),
    }).where(eq(subscriptionPlansTable.planId, planId)).returning();
    if (updated.length === 0) { res.status(404).json({ error: "Plan not found" }); return; }
    const p = updated[0];
    res.json({
      id: String(p.id), planId: p.planId, name: p.name, description: p.description,
      price: p.price, discountPercent: p.discountPercent, tokensPerMonth: p.tokensPerMonth,
      agentsLimit: p.agentsLimit, features: parseStoredStringArray(p.features),
      isActive: p.isActive, updatedAt: p.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Update subscription error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/promo-codes", async (req, res) => {
  try {
    const promos = await db.select().from(promoCodesTable);
    res.json({
      promoCodes: promos.map(p => ({
        id: String(p.id), code: p.code, discountPercent: p.discountPercent,
        planId: p.planId, usageLimit: p.usageLimit, usageCount: p.usageCount,
        isActive: p.isActive, expiresAt: p.expiresAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List promo codes error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/promo-codes", async (req, res) => {
  try {
    const { code, discountPercent, planId, usageLimit, expiresAt } = req.body;
    if (!code || !discountPercent) {
      res.status(400).json({ error: "Code and discount are required" }); return;
    }
    const inserted = await db.insert(promoCodesTable).values({
      code: code.toUpperCase(), discountPercent,
      planId: planId || null, usageLimit: usageLimit || 100,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();
    const p = inserted[0];
    res.status(201).json({
      id: String(p.id), code: p.code, discountPercent: p.discountPercent,
      planId: p.planId, usageLimit: p.usageLimit, usageCount: p.usageCount,
      isActive: p.isActive, expiresAt: p.expiresAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create promo code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/promo-codes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { code, discountPercent, planId, usageLimit, isActive, expiresAt } = req.body;
    const updated = await db.update(promoCodesTable).set({
      ...(code && { code: code.toUpperCase() }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(planId !== undefined && { planId }),
      ...(usageLimit !== undefined && { usageLimit }),
      ...(isActive !== undefined && { isActive }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    }).where(eq(promoCodesTable.id, id)).returning();
    if (updated.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    const p = updated[0];
    res.json({
      id: String(p.id), code: p.code, discountPercent: p.discountPercent,
      planId: p.planId, usageLimit: p.usageLimit, usageCount: p.usageCount,
      isActive: p.isActive, expiresAt: p.expiresAt?.toISOString() || null,
    });
  } catch (err) {
    req.log.error({ err }, "Update promo code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/promo-codes/:id", async (req, res) => {
  try {
    await db.delete(promoCodesTable).where(eq(promoCodesTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete promo code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/promo-codes/validate", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ valid: false, error: "Code required" }); return; }
    const promos = await db.select().from(promoCodesTable)
      .where(and(eq(promoCodesTable.code, code.toUpperCase()), eq(promoCodesTable.isActive, true)))
      .limit(1);
    if (promos.length === 0) { res.json({ valid: false }); return; }
    const promo = promos[0];
    if (promo.expiresAt && promo.expiresAt < new Date()) { res.json({ valid: false, error: "Expired" }); return; }
    if (promo.usageCount >= promo.usageLimit) { res.json({ valid: false, error: "Usage limit reached" }); return; }
    res.json({ valid: true, discountPercent: promo.discountPercent, planId: promo.planId });
  } catch (err) {
    req.log.error({ err }, "Validate promo error");
    res.status(500).json({ valid: false, error: "Internal server error" });
  }
});

router.get("/token-usage/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const today = new Date().toISOString().slice(0, 10);
    const usage = await db.select().from(tokenUsageTable)
      .where(and(eq(tokenUsageTable.userId, userId), eq(tokenUsageTable.date, today)))
      .limit(1);
    res.json({ tokensUsed: usage[0]?.tokensUsed || 0, date: today });
  } catch (err) {
    req.log.error({ err }, "Token usage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/referral-settings", async (req, res) => {
  try {
    const settings = await db.select().from(referralSettingsTable).limit(1);
    if (settings.length === 0) {
      res.json({ bonusRequests: 7, isActive: true });
      return;
    }
    res.json({
      bonusRequests: settings[0].bonusRequests,
      isActive: settings[0].isActive,
    });
  } catch (err) {
    req.log.error({ err }, "Get referral settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/referral-settings", async (req, res) => {
  try {
    const { bonusRequests, isActive } = req.body;
    const existing = await db.select().from(referralSettingsTable).limit(1);
    if (existing.length === 0) {
      await db.insert(referralSettingsTable).values({
        bonusRequests: bonusRequests || 7,
        isActive: isActive !== false,
      });
    } else {
      await db.update(referralSettingsTable).set({
        ...(bonusRequests !== undefined && { bonusRequests }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      }).where(eq(referralSettingsTable.id, existing[0].id));
    }
    res.json({ success: true, bonusRequests: bonusRequests || existing[0]?.bonusRequests || 7, isActive: isActive !== undefined ? isActive : existing[0]?.isActive });
  } catch (err) {
    req.log.error({ err }, "Update referral settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/referrals", async (req, res) => {
  try {
    const referrals = await db.select().from(referralsTable).orderBy(desc(referralsTable.createdAt));
    const data = await Promise.all(referrals.map(async (r) => {
      const referrer = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, r.referrerId)).limit(1);
      const referred = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, r.referredId)).limit(1);
      return {
        id: r.id,
        referrer: referrer[0]?.username || "Unknown",
        referred: referred[0]?.username || "Unknown",
        bonusAwarded: r.bonusAwarded,
        createdAt: r.createdAt.toISOString(),
      };
    }));
    res.json({ referrals: data });
  } catch (err) {
    req.log.error({ err }, "Admin referrals error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
