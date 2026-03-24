import { pgTable, text, serial, timestamp, varchar, boolean, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiModelsTable = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  modelId: varchar("model_id", { length: 100 }).notNull(),
  apiKey: text("api_key"),
  capabilities: text("capabilities"),
  contextWindow: integer("context_window"),
  costPerToken: doublePrecision("cost_per_token"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiModelSchema = createInsertSchema(aiModelsTable).omit({ id: true, createdAt: true });
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModel = typeof aiModelsTable.$inferSelect;
