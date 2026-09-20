import { boolean, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentsTable = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  recipient: text("recipient").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  status: text("status").notNull().default("completed"),
  safetyStatus: text("safety_status").notNull().default("verified"),
  source: text("source").notNull().default("voice"),
  transactionId: text("transaction_id").notNull().default("UPI-DEMO"),
  paymentType: text("payment_type").notNull().default("PERSONAL_TRANSFER"),
  learningNote: text("learning_note").notNull().default("Pause, check the name and amount, then choose."),
});

export const settingsTable = pgTable("accessibility_preferences", {
  id: serial("id").primaryKey(),
  profileName: text("profile_name").notNull().default("Aarav"),
  language: text("language").notNull().default("en"),
  voiceGuidance: boolean("voice_guidance").notNull().default(true),
  voiceSelection: text("voice_selection").notNull().default("default"),
  speechSpeed: numeric("speech_speed", { precision: 3, scale: 2 }).notNull().default("1.00"),
  largeText: boolean("large_text").notNull().default(false),
  highContrast: boolean("high_contrast").notNull().default(false),
  simplifiedMode: boolean("simplified_mode").notNull().default(false),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  dailySafetyReminders: boolean("daily_safety_reminders").notNull().default(true),
  learningReminders: boolean("learning_reminders").notNull().default(true),
  practiceReminders: boolean("practice_reminders").notNull().default(true),
});

export const tutorialsTable = pgTable("offline_tutorials", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  difficulty: text("difficulty").notNull(),
  minutes: integer("minutes").notNull(),
  progress: integer("progress").notNull().default(0),
  offline: boolean("offline").notNull().default(true),
});

export const learningProgressTable = pgTable("learning_progress", {
  id: serial("id").primaryKey(),
  tutorialId: integer("tutorial_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  quizScore: integer("quiz_score").notNull().default(0),
  bookmarked: boolean("bookmarked").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const qrHistoryTable = pgTable("qr_history", {
  id: serial("id").primaryKey(),
  merchant: text("merchant").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("245"),
  status: text("status").notNull().default("verified"),
  warning: text("warning"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fraudAlertsTable = pgTable("fraud_alerts", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  result: text("result").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assistantHistoryTable = pgTable("assistant_history", {
  id: serial("id").primaryKey(),
  from: text("from").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  activityType: text("activity_type").notNull(),
  value: integer("value").notNull().default(1),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, date: true });
export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;