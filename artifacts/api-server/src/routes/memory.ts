import { Router, type IRouter } from "express";
import { db, memoryTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const memories = await db.select().from(memoryTable)
      .where(eq(memoryTable.userId, userId))
      .orderBy(desc(memoryTable.createdAt));

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
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { agentId, key, value, category } = req.body;
    const inserted = await db.insert(memoryTable).values({
      agentId,
      userId,
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
