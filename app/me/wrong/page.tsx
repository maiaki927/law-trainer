import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  attempts,
  dismissedQuestions,
  questions,
  topics,
} from "@/lib/db/schema";
import { WrongList, type WrongRow } from "./wrong-list";

export const dynamic = "force-dynamic";

export default async function WrongListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/me/wrong");

  const uid = session.user.id;

  // 找出曾答錯且未 dismissed 的題目
  // 申論題沒有對錯 (is_correct = NULL) → 不會被列入
  const rows = await db
    .select({
      questionId: attempts.questionId,
      lastWrongAt: sql<number>`max(${attempts.attemptedAt})`.as("lastWrongAt"),
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, uid),
        eq(attempts.isCorrect, false),
        sql`${attempts.questionId} not in (select ${dismissedQuestions.questionId} from ${dismissedQuestions} where ${dismissedQuestions.userId} = ${uid})`
      )
    )
    .groupBy(attempts.questionId)
    .orderBy(sql`max(${attempts.attemptedAt}) desc`)
    .limit(500);

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">答錯題複習</h1>
        <p className="text-muted-foreground">目前沒有答錯題，繼續加油。</p>
      </div>
    );
  }

  const qList = await db
    .select({
      id: questions.id,
      questionMd: questions.questionMd,
      topicSlug: topics.slug,
      topicName: topics.nameZh,
      difficulty: questions.difficulty,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .where(
      sql`${questions.id} in (${sql.join(
        rows.map((r) => sql`${r.questionId}`),
        sql`, `
      )})`
    );

  const qMap = new Map(qList.map((q) => [q.id, q]));

  const items: WrongRow[] = rows
    .map((r) => {
      const q = qMap.get(r.questionId);
      if (!q) return null;
      const preview =
        q.questionMd.length > 80 ? q.questionMd.slice(0, 80) + "..." : q.questionMd;
      return {
        questionId: q.id,
        topicSlug: q.topicSlug,
        topicName: q.topicName,
        difficulty: q.difficulty,
        preview,
      } satisfies WrongRow;
    })
    .filter((x): x is WrongRow => x !== null);

  return <WrongList items={items} />;
}
