import { db } from "@workspace/db";
import { memoryTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "./error-monitor";

export interface MemoryEntry {
  key: string;
  value: string;
  category: "fact" | "preference" | "task" | "context" | "error" | "learn";
}

export class MemoryManager {
  async save(
    key: string,
    value: string,
    category: string = "fact",
    userId?: number,
    agentId?: string
  ): Promise<void> {
    if (!userId) return;

    try {
      const conditions = [eq(memoryTable.key, key), eq(memoryTable.userId, userId)];

      const existing = await db
        .select()
        .from(memoryTable)
        .where(and(...conditions))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(memoryTable)
          .set({ value, category })
          .where(eq(memoryTable.id, existing[0].id));
      } else {
        await db.insert(memoryTable).values({
          key,
          value,
          category,
          userId: userId ?? null,
          agentId: agentId ?? null,
        });
      }

      logger.info("Memory saved", { key, category, userId });
    } catch (error) {
      logger.error("Memory save failed", { error: String(error), key });
    }
  }

  async get(key: string, userId?: number): Promise<string | null> {
    try {
      const conditions = [eq(memoryTable.key, key)];
      if (userId) conditions.push(eq(memoryTable.userId, userId));

      const result = await db
        .select()
        .from(memoryTable)
        .where(and(...conditions))
        .limit(1);

      return result[0]?.value ?? null;
    } catch (error) {
      logger.error("Memory get failed", { error: String(error), key });
      return null;
    }
  }

  async getRelevant(query: string, userId?: number, limit = 10): Promise<MemoryEntry[]> {
    if (!userId) return [];

    try {
      const keywords = query.split(" ").filter(w => w.length > 3).slice(0, 5);

      const results = await db
        .select()
        .from(memoryTable)
        .where(eq(memoryTable.userId, userId))
        .orderBy(desc(memoryTable.createdAt))
        .limit(50);

      const scored = results.map(r => ({
        ...r,
        score: keywords.filter(kw =>
          r.key.toLowerCase().includes(kw.toLowerCase()) ||
          r.value.toLowerCase().includes(kw.toLowerCase())
        ).length,
      }));

      return scored
        .filter(r => r.score > 0 || results.length < 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => ({ key: r.key, value: r.value, category: r.category as MemoryEntry["category"] }));
    } catch (error) {
      logger.error("Memory getRelevant failed", { error: String(error) });
      return [];
    }
  }

  async getByCategory(category: string, userId?: number): Promise<MemoryEntry[]> {
    try {
      const conditions = [eq(memoryTable.category, category)];
      if (userId) conditions.push(eq(memoryTable.userId, userId));

      const results = await db
        .select()
        .from(memoryTable)
        .where(and(...conditions))
        .orderBy(desc(memoryTable.createdAt));

      return results.map(r => ({ key: r.key, value: r.value, category: r.category as MemoryEntry["category"] }));
    } catch (error) {
      logger.error("Memory getByCategory failed", { error: String(error) });
      return [];
    }
  }

  async delete(key: string, userId?: number): Promise<void> {
    const conditions = [eq(memoryTable.key, key)];
    if (userId) conditions.push(eq(memoryTable.userId, userId));

    await db
      .delete(memoryTable)
      .where(and(...conditions));
  }

  async dump(userId: number): Promise<MemoryEntry[]> {
    const results = await db
      .select()
      .from(memoryTable)
      .where(eq(memoryTable.userId, userId))
      .orderBy(desc(memoryTable.createdAt));

    return results.map(r => ({ key: r.key, value: r.value, category: r.category as MemoryEntry["category"] }));
  }
}
