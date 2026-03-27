import { pgTable, text, serial, timestamp, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const voiceAssistantSettingsTable = pgTable("voice_assistant_settings", {
  id: serial("id").primaryKey(),
  scope: varchar("scope", { length: 32 }).notNull().unique().default("global"),
  provider: varchar("provider", { length: 32 }).notNull().default("pollinations"),
  preset: varchar("preset", { length: 64 }).notNull().default("jarvis_ru"),
  voiceEnabled: boolean("voice_enabled").notNull().default(true),
  dictationEnabled: boolean("dictation_enabled").notNull().default(true),
  autoSpeakSteps: boolean("auto_speak_steps").notNull().default(true),
  autoSpeakReplies: boolean("auto_speak_replies").notNull().default(true),
  routeUnknownCommandsToAgent: boolean("route_unknown_commands_to_agent").notNull().default(true),
  echoGuardEnabled: boolean("echo_guard_enabled").notNull().default(true),
  echoGuardDelayMs: integer("echo_guard_delay_ms").notNull().default(900),
  replyMaxChars: integer("reply_max_chars").notNull().default(360),
  updatedByUserId: integer("updated_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVoiceAssistantSettingsSchema = createInsertSchema(voiceAssistantSettingsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertVoiceAssistantSettings = z.infer<typeof insertVoiceAssistantSettingsSchema>;
export type VoiceAssistantSettings = typeof voiceAssistantSettingsTable.$inferSelect;
