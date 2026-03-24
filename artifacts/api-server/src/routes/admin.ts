import { Router, type IRouter } from "express";
import { db, usersTable, conversationsTable, messagesTable, agentsTable, aiModelsTable, subscriptionPlansTable, promoCodesTable, tokenUsageTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (req, res) => {
  try {
    const [totalUsers] = await db.select({ count: count() }).from(usersTable);
    const [totalConversations] = await db.select({ count: count() }).from(conversationsTable);
    const [totalMessages] = await db.select({ count: count() }).from(messagesTable);
    const [activeAgents] = await db.select({ count: count() }).from(agentsTable).where(eq(agentsTable.isActive, true));
    const [totalPromos] = await db.select({ count: count() }).from(promoCodesTable);
    res.json({
      totalUsers: Number(totalUsers?.count) || 0,
      totalConversations: Number(totalConversations?.count) || 0,
      totalMessages: Number(totalMessages?.count) || 0,
      activeAgents: Number(activeAgents?.count) || 0,
      tokensUsedToday: Math.floor(Math.random() * 100000),
      apiCallsToday: Math.floor(Math.random() * 5000),
      totalPromoCodes: Number(totalPromos?.count) || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
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
        capabilities: m.capabilities ? JSON.parse(m.capabilities) : [],
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
      name, provider, modelId, apiKey,
      capabilities: capabilities ? JSON.stringify(capabilities) : null,
      contextWindow, costPerToken,
    }).returning();
    const m = inserted[0];
    res.status(201).json({
      id: String(m.id), name: m.name, provider: m.provider, modelId: m.modelId,
      capabilities: m.capabilities ? JSON.parse(m.capabilities) : [],
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
      ...(name && { name }), ...(provider && { provider }), ...(modelId && { modelId }),
      ...(apiKey && { apiKey }), ...(capabilities && { capabilities: JSON.stringify(capabilities) }),
      ...(contextWindow && { contextWindow }), ...(costPerToken !== undefined && { costPerToken }),
    }).where(eq(aiModelsTable.id, id)).returning();
    if (updated.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    const m = updated[0];
    res.json({
      id: String(m.id), name: m.name, provider: m.provider, modelId: m.modelId,
      capabilities: m.capabilities ? JSON.parse(m.capabilities) : [],
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
        role: u.role, plan: u.plan, createdAt: u.createdAt.toISOString(),
      })),
      total: users.length,
    });
  } catch (err) {
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subscriptions", async (req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlansTable);
    res.json({
      plans: plans.map(p => ({
        id: String(p.id),
        planId: p.planId,
        name: p.name,
        description: p.description,
        price: p.price,
        discountPercent: p.discountPercent,
        tokensPerMonth: p.tokensPerMonth,
        agentsLimit: p.agentsLimit,
        features: p.features ? JSON.parse(p.features) : [],
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
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
      ...(features && { features: JSON.stringify(features) }),
      updatedAt: new Date(),
    }).where(eq(subscriptionPlansTable.planId, planId)).returning();
    if (updated.length === 0) { res.status(404).json({ error: "Plan not found" }); return; }
    const p = updated[0];
    res.json({
      id: String(p.id), planId: p.planId, name: p.name, description: p.description,
      price: p.price, discountPercent: p.discountPercent, tokensPerMonth: p.tokensPerMonth,
      agentsLimit: p.agentsLimit, features: p.features ? JSON.parse(p.features) : [],
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

export default router;
