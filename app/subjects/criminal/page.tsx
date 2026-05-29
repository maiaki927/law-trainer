import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subjects, topics, questions, attempts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CriminalPage() {
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.slug, "criminal"),
  });
  if (!subject) notFound();

  const topicList = await db
    .select()
    .from(topics)
    .where(eq(topics.subjectId, subject.id))
    .orderBy(topics.orderIdx);

  // 題目數量 group by topic
  const counts = await db
    .select({
      topicId: questions.topicId,
      total: sql<number>`count(*)`.as("total"),
    })
    .from(questions)
    .where(
      and(
        eq(questions.status, "published"),
        inArray(
          questions.topicId,
          topicList.map((t) => t.id)
        )
      )
    )
    .groupBy(questions.topicId);

  const totalMap = new Map(counts.map((c) => [c.topicId, Number(c.total)]));

  // 每章 stats (登入才查)
  const session = await auth();
  const statsMap = new Map<
    string,
    { answered: number; correct: number; scored: number }
  >();
  if (session?.user?.id && topicList.length > 0) {
    const rows = await db
      .select({
        topicId: questions.topicId,
        answered: sql<number>`count(distinct ${attempts.questionId})`.as("answered"),
        correct: sql<number>`sum(case when ${attempts.isCorrect} = 1 then 1 else 0 end)`.as("correct"),
        scored: sql<number>`count(case when ${attempts.isCorrect} is not null then 1 end)`.as("scored"),
      })
      .from(attempts)
      .innerJoin(questions, eq(attempts.questionId, questions.id))
      .where(eq(attempts.userId, session.user.id))
      .groupBy(questions.topicId);
    for (const r of rows) {
      statsMap.set(r.topicId, {
        answered: Number(r.answered),
        correct: Number(r.correct),
        scored: Number(r.scored),
      });
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            首頁
          </Link>{" "}
          / 刑法
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">刑法章節</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {topicList.map((t) => {
          const total = totalMap.get(t.id) ?? 0;
          const st = statsMap.get(t.id);
          // 正確率只算選擇 / 複選（scored 排除申論）
          const accuracy =
            st && st.scored > 0
              ? Math.round((st.correct / st.scored) * 100)
              : null;
          const href = total > 0
            ? `/subjects/criminal/${t.slug}`
            : `/subjects/criminal/${t.slug}`;
          return (
            <Link key={t.id} href={href} className="block">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">{t.nameZh}</span>
                    <Badge variant="secondary">{total} 題</Badge>
                  </CardTitle>
                  {t.description && (
                    <CardDescription className="line-clamp-2">
                      {t.description}
                    </CardDescription>
                  )}
                </CardHeader>
                {session?.user && (
                  <CardContent className="text-xs text-muted-foreground">
                    {st ? (
                      <span>
                        已答 {st.answered} / {total}
                        {accuracy !== null && (
                          <> · 正確率 {accuracy}%</>
                        )}
                      </span>
                    ) : (
                      <span>尚未練習</span>
                    )}
                  </CardContent>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
