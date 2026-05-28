import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { questions, savedQuestions, topics } from "@/lib/db/schema";
import { SavedList, type SavedRow } from "./saved-list";

export const dynamic = "force-dynamic";

export default async function SavedListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/me/saved");

  const uid = session.user.id;

  // 拉出該 user 所有 saved questions，按收藏時間倒序
  const rows = await db
    .select({
      questionId: savedQuestions.questionId,
      savedAt: savedQuestions.savedAt,
    })
    .from(savedQuestions)
    .where(eq(savedQuestions.userId, uid))
    .orderBy(desc(savedQuestions.savedAt))
    .limit(500);

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">收藏題目</h1>
        <p className="text-muted-foreground">
          目前還沒有收藏任何題目；在練習時按「收藏」即可加入。
        </p>
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

  const items: SavedRow[] = rows
    .map((r) => {
      const q = qMap.get(r.questionId);
      if (!q) return null;
      const preview =
        q.questionMd.length > 80
          ? q.questionMd.slice(0, 80) + "..."
          : q.questionMd;
      return {
        questionId: q.id,
        topicSlug: q.topicSlug,
        topicName: q.topicName,
        difficulty: q.difficulty,
        preview,
        savedAt: r.savedAt instanceof Date ? r.savedAt.toISOString() : String(r.savedAt),
      } satisfies SavedRow;
    })
    .filter((x): x is SavedRow => x !== null);

  return <SavedList items={items} />;
}
