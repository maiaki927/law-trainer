import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";

// users
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_uidx").on(t.email),
  })
);

// subjects (民法/刑法)
export const subjects = sqliteTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    nameZh: text("name_zh").notNull(),
    orderIdx: integer("order_idx").notNull().default(0),
    status: text("status", { enum: ["active", "draft"] })
      .notNull()
      .default("active"),
  },
  (t) => ({
    slugIdx: uniqueIndex("subjects_slug_uidx").on(t.slug),
  })
);

// topics (章節)
export const topics = sqliteTable(
  "topics",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    nameZh: text("name_zh").notNull(),
    orderIdx: integer("order_idx").notNull().default(0),
    description: text("description"),
    parentTopicId: text("parent_topic_id"),
  },
  (t) => ({
    subjectSlugIdx: uniqueIndex("topics_subject_slug_uidx").on(
      t.subjectId,
      t.slug
    ),
  })
);

// questions
export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  topicId: text("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["choice", "multi", "essay"] }).notNull(),
  questionMd: text("question_md").notNull(),
  optionsJson: text("options_json"),
  correctAnswerJson: text("correct_answer_json"),
  explanationMd: text("explanation_md").notNull(),
  referencesJson: text("references_json"),
  // 外部來源案例 backlink（如 47c case ID + 講次 + 簡短摘要），SQLite 無 jsonb，以 text 存 JSON 字串
  casesJson: text("cases_json"),
  difficulty: integer("difficulty").notNull().default(3),
  source: text("source"),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("published"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// attempts
export const attempts = sqliteTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    answerJson: text("answer_json"),
    // is_correct 為 null 表示「不適用」(申論題)；true/false 用於選擇 / 複選
    isCorrect: integer("is_correct", { mode: "boolean" }),
    timeSpentS: integer("time_spent_s").notNull().default(0),
    attemptedAt: integer("attempted_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    userCorrectAtIdx: index("attempts_user_correct_at_idx").on(
      t.userId,
      t.isCorrect,
      t.attemptedAt
    ),
    userQuestionIdx: index("attempts_user_question_idx").on(
      t.userId,
      t.questionId
    ),
  })
);

// feedback
export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  topicId: text("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  questionId: text("question_id").references(() => questions.id, {
    onDelete: "set null",
  }),
  category: text("category").notNull(),
  message: text("message").notNull(),
  contact: text("contact"),
  status: text("status", { enum: ["new", "processing", "resolved"] })
    .notNull()
    .default("new"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// dismissed_questions — 使用者標記「不要再出現在錯題列表 / 只答錯過 mode」的題目
export const dismissedQuestions = sqliteTable(
  "dismissed_questions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    dismissedAt: integer("dismissed_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.questionId] }),
    userIdx: index("dismissed_user_idx").on(t.userId),
  })
);

// saved_questions — 使用者收藏的題目
export const savedQuestions = sqliteTable(
  "saved_questions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    savedAt: integer("saved_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.questionId] }),
    userIdx: index("saved_user_idx").on(t.userId),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type DismissedQuestion = typeof dismissedQuestions.$inferSelect;
export type SavedQuestion = typeof savedQuestions.$inferSelect;
