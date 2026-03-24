import { pgTable, text, serial, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  avatar: varchar("avatar", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("coder"),
  modelId: varchar("model_id", { length: 100 }),
  systemPrompt: text("system_prompt"),
  capabilities: text("capabilities"),
  isActive: boolean("is_active").notNull().default(true),
  memoryEnabled: boolean("memory_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({ id: true, createdAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
