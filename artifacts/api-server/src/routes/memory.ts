import { Router, type IRouter } from "express";
import { db, memoryTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const memories = await db.select().from(memoryTable);
    res.json({
      memories: memories.map(m => ({
        id: String(m.id),
        agentId: m.agentId,
        key: m.key,
        value: m.value,
        category: m.category,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Get memory error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { agentId, key, value, category } = req.body;
    const inserted = await db.insert(memoryTable).values({
      agentId,
      key,
      value,
      category: category || "fact",
    }).returning();
    const m = inserted[0];
    res.status(201).json({
      id: String(m.id),
      agentId: m.agentId,
      key: m.key,
      value: m.value,
      category: m.category,
      createdAt: m.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Add memory error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
