import { Router, type IRouter } from "express";
import { db, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { parseStoredStringArray, stringifyStoredStringArray } from "../lib/serialized-arrays";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const agents = await db.select().from(agentsTable);
    res.json({
      agents: agents.map(a => ({
        id: String(a.id),
        name: a.name,
        description: a.description,
        avatar: a.avatar,
        role: a.role,
        modelId: a.modelId,
        systemPrompt: a.systemPrompt,
        capabilities: parseStoredStringArray(a.capabilities),
        isActive: a.isActive,
        memoryEnabled: a.memoryEnabled,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List agents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, avatar, role, modelId, systemPrompt, capabilities, memoryEnabled } = req.body;
    const inserted = await db.insert(agentsTable).values({
      name,
      description,
      avatar,
      role: role || "coder",
      modelId,
      systemPrompt,
      capabilities: stringifyStoredStringArray(capabilities),
      memoryEnabled: memoryEnabled !== false,
    }).returning();
    const a = inserted[0];
    res.status(201).json({
      id: String(a.id),
      name: a.name,
      description: a.description,
      avatar: a.avatar,
      role: a.role,
      modelId: a.modelId,
      systemPrompt: a.systemPrompt,
      capabilities: parseStoredStringArray(a.capabilities),
      isActive: a.isActive,
      memoryEnabled: a.memoryEnabled,
      createdAt: a.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create agent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const agents = await db.select().from(agentsTable).where(eq(agentsTable.id, Number(req.params.id))).limit(1);
    if (agents.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const a = agents[0];
    res.json({
      id: String(a.id),
      name: a.name,
      description: a.description,
      avatar: a.avatar,
      role: a.role,
      modelId: a.modelId,
      systemPrompt: a.systemPrompt,
      capabilities: parseStoredStringArray(a.capabilities),
      isActive: a.isActive,
      memoryEnabled: a.memoryEnabled,
      createdAt: a.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Get agent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, avatar, modelId, systemPrompt, capabilities, isActive, memoryEnabled } = req.body;
    const updated = await db.update(agentsTable).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(avatar !== undefined && { avatar }),
      ...(modelId !== undefined && { modelId }),
      ...(systemPrompt !== undefined && { systemPrompt }),
      ...(capabilities !== undefined && { capabilities: stringifyStoredStringArray(capabilities) }),
      ...(isActive !== undefined && { isActive }),
      ...(memoryEnabled !== undefined && { memoryEnabled }),
    }).where(eq(agentsTable.id, id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const a = updated[0];
    res.json({
      id: String(a.id),
      name: a.name,
      description: a.description,
      avatar: a.avatar,
      role: a.role,
      modelId: a.modelId,
      systemPrompt: a.systemPrompt,
      capabilities: parseStoredStringArray(a.capabilities),
      isActive: a.isActive,
      memoryEnabled: a.memoryEnabled,
      createdAt: a.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Update agent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(agentsTable).where(eq(agentsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete agent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
