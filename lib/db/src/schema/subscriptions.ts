import { pgTable, text, serial, timestamp, varchar, integer, boolean, real } from "drizzle-orm/pg-core";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  planId: varchar("plan_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: real("price").notNull().default(0),
  discountPercent: integer("discount_percent").notNull().default(0),
  tokensPerMonth: integer("tokens_per_month").notNull().default(50000),
  agentsLimit: integer("agents_limit").notNull().default(1),
  features: text("features"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountPercent: integer("discount_percent").notNull().default(10),
  planId: varchar("plan_id", { length: 50 }),
  usageLimit: integer("usage_limit").notNull().default(100),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tokenUsageTable = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokensUsed: integer("tokens_used").notNull().default(0),
  date: varchar("date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type PromoCode = typeof promoCodesTable.$inferSelect;
export type TokenUsage = typeof tokenUsageTable.$inferSelect;
