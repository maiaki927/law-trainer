import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, sql, and } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  attempts,
  dismissedQuestions,
  questions,
  savedQuestions,
  subjects,
  topics,
} from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/me");

  const uid = session.user.id;

  // 總體
  const [{ totalQuestions }] = await db
    .select({ totalQuestions: sql<number>`count(*)`.as("totalQuestions") })
    .from(questions)
    .where(eq(questions.status, "published"));

  const [{ answered }] = await db
    .select({
      answered: sql<number>`count(distinct ${attempts.questionId})`.as(
        "answered"
      ),
    })
    .from(attempts)
    .where(eq(attempts.userId, uid));

  // 正確率只計算選擇 / 複選（is_correct 非 null）；申論題不計對錯
  const [{ totalAttempts, correctAttempts }] = await db
    .select({
      totalAttempts: sql<number>`count(case when ${attempts.isCorrect} is not null then 1 end)`.as(
        "totalAttempts"
      ),
      correctAttempts: sql<number>`sum(case when ${attempts.isCorrect} then 1 else 0 end)`.as(
        "correctAttempts"
      ),
    })
    .from(attempts)
    .where(eq(attempts.userId, uid));

  const accuracy =
    Number(totalAttempts) > 0
      ? Math.round((Number(correctAttempts) / Number(totalAttempts)) * 100)
      : 0;

  // 答錯題數 — distinct question_id where is_correct=false AND 不在 dismissed
  const [{ wrongCount }] = await db
    .select({
      wrongCount: sql<number>`count(distinct ${attempts.questionId})`.as(
        "wrongCount"
      ),
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, uid),
        eq(attempts.isCorrect, false),
        sql`${attempts.questionId} not in (select ${dismissedQuestions.questionId} from ${dismissedQuestions} where ${dismissedQuestions.userId} = ${uid})`
      )
    );

  // 收藏題目數 — distinct question_id 在 saved_questions
  const [{ savedCount }] = await db
    .select({
      savedCount: sql<number>`count(distinct ${savedQuestions.questionId})`.as(
        "savedCount"
      ),
    })
    .from(savedQuestions)
    .where(eq(savedQuestions.userId, uid));

  // 各章節 heat
  const civilSubject = await db.query.subjects.findFirst({
    where: eq(subjects.slug, "civil"),
  });
  const topicList = civilSubject
    ? await db
        .select()
        .from(topics)
        .where(eq(topics.subjectId, civilSubject.id))
        .orderBy(topics.orderIdx)
    : [];

  // 各章節：total 算全部已發布題目，answered 計入申論題（已寫過視為已答），
  // correct 只計 is_correct = 1（選擇 / 複選答對）
  const topicStats = await db
    .select({
      topicId: questions.topicId,
      total: sql<number>`count(distinct ${questions.id})`.as("total"),
      answered: sql<number>`count(distinct ${attempts.questionId})`.as(
        "answered"
      ),
      correct: sql<number>`sum(case when ${attempts.isCorrect} = 1 then 1 else 0 end)`.as(
        "correct"
      ),
      scored: sql<number>`count(case when ${attempts.isCorrect} is not null then 1 end)`.as(
        "scored"
      ),
    })
    .from(questions)
    .leftJoin(
      attempts,
      and(eq(attempts.questionId, questions.id), eq(attempts.userId, uid))
    )
    .where(eq(questions.status, "published"))
    .groupBy(questions.topicId);

  const statsMap = new Map(topicStats.map((s) => [s.topicId, s]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">
          歡迎，{session.user.displayName ?? session.user.name}
        </h1>
        <p className="space-x-3 text-sm text-muted-foreground">
          <Link href="/me/wrong" className="underline">
            查看答錯題複習列表
          </Link>
          <Link href="/me/saved" className="underline">
            查看收藏題目
          </Link>
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="題庫總數" value={String(totalQuestions ?? 0)} />
        <StatCard label="已答題數" value={String(answered ?? 0)} />
        <StatCard label="正確率" value={`${accuracy}%`} />
        <StatCard
          label="答錯題數"
          value={String(wrongCount ?? 0)}
          href="/me/wrong"
        />
        <StatCard
          label="收藏題目數"
          value={String(savedCount ?? 0)}
          href="/me/saved"
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">各章節進度</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topicList.map((t) => {
            const s = statsMap.get(t.id);
            const total = Number(s?.total ?? 0);
            const ans = Number(s?.answered ?? 0);
            const cor = Number(s?.correct ?? 0);
            const scored = Number(s?.scored ?? 0);
            // 正確率只算選擇 / 複選（scored 排除申論）
            const rate = scored > 0 ? Math.round((cor / scored) * 100) : null;
            return (
              <Link key={t.id} href={`/subjects/civil/${t.slug}`}>
                <Card className="transition hover:shadow-md">
                  <CardContent className="space-y-1 p-4">
                    <div className="font-medium">{t.nameZh}</div>
                    <div className="text-xs text-muted-foreground">
                      {ans} / {total} 已答
                      {rate !== null && <> · 正確率 {rate}%</>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <Card
      className={
        href
          ? "group relative cursor-pointer border-primary/40 bg-primary/5 transition hover:border-primary hover:bg-primary/10 hover:shadow-md"
          : ""
      }
    >
      <CardHeader className="pb-2">
        <CardTitle
          className={
            href
              ? "flex items-center justify-between text-sm font-semibold text-primary"
              : "text-sm font-medium text-muted-foreground"
          }
        >
          <span>{label}</span>
          {href && (
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={
          href
            ? "pt-0 text-2xl font-bold text-primary"
            : "pt-0 text-2xl font-bold"
        }
      >
        {value}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
