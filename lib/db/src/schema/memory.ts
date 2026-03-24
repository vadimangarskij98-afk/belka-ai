import { pgTable, text, serial, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoryTable = pgTable("memory", {
  id: serial("id").primaryKey(),
  agentId: varchar("agent_id", { length: 100 }),
  userId: integer("user_id"),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("fact"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memoryTable).omit({ id: true, createdAt: true });
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoryTable.$inferSelect;

export const repositoriesTable = pgTable("repositories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: varchar("name", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  description: text("description"),
  url: text("url").notNull(),
  branch: varchar("branch", { length: 100 }).notNull().default("main"),
  isLocal: text("is_local").default("false"),
  localPath: text("local_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRepositorySchema = createInsertSchema(repositoriesTable).omit({ id: true, createdAt: true });
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositoriesTable.$inferSelect;
