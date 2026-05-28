// Smoke test: 直接用 DB layer 驗 attempt insert + wrong-mode query
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and } from "drizzle-orm";
import path from "node:path";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

const dbFile = process.env.DATABASE_URL ?? "data/dev.sqlite";
const absPath = path.isAbsolute(dbFile)
  ? dbFile
  : path.join(process.cwd(), dbFile);

const sqlite = new Database(absPath);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });
const { users, questions, attempts, subjects, topics } = schema;

async function main() {
  // 建 smoke user
  const email = "smoke-test@example.com";
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    const hash = await bcrypt.hash("test123456", 12);
    const id = uuid();
    await db.insert(users).values({
      id,
      email,
      passwordHash: hash,
      displayName: "Smoke",
      role: "user",
    });
    user = await db.query.users.findFirst({ where: eq(users.email, email) });
  }
  if (!user) throw new Error("user create fail");

  // 拿總則第一題
  const civil = await db.query.subjects.findFirst({
    where: eq(subjects.slug, "civil"),
  });
  if (!civil) throw new Error("civil not found");
  const t = await db.query.topics.findFirst({
    where: and(eq(topics.subjectId, civil.id), eq(topics.slug, "general")),
  });
  if (!t) throw new Error("topic not found");
  const q = await db.query.questions.findFirst({
    where: eq(questions.topicId, t.id),
  });
  if (!q) throw new Error("question not found");

  // 答錯
  await db.insert(attempts).values({
    id: uuid(),
    userId: user.id,
    questionId: q.id,
    answerJson: JSON.stringify("A"),
    isCorrect: false,
    timeSpentS: 15,
  });

  // 答對
  await db.insert(attempts).values({
    id: uuid(),
    userId: user.id,
    questionId: q.id,
    answerJson: JSON.stringify("C"),
    isCorrect: true,
    timeSpentS: 8,
  });

  // 撈 wrong-only set
  const wrongIds = await db
    .selectDistinct({ qid: attempts.questionId })
    .from(attempts)
    .where(and(eq(attempts.userId, user.id), eq(attempts.isCorrect, false)));
  console.log("wrong question count:", wrongIds.length);
  console.log("smoke ok");
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
