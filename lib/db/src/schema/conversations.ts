import { pgTable, text, serial, timestamp, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: varchar("title", { length: 500 }).notNull(),
  agentId: varchar("agent_id", { length: 100 }),
  mode: varchar("mode", { length: 50 }).notNull().default("chat"),
  repositoryId: varchar("repository_id", { length: 100 }),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  content: text("content").notNull(),
  agentName: varchar("agent_name", { length: 100 }),
  agentAvatar: varchar("agent_avatar", { length: 255 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
