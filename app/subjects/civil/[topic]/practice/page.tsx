import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  subjects,
  topics,
  questions,
  attempts,
  dismissedQuestions,
  savedQuestions,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { PracticeRunner } from "@/components/practice-runner";

interface Params {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ mode?: string; type?: string }>;
}

export const dynamic = "force-dynamic";

export default async function PracticePage({ params, searchParams }: Params) {
  const { topic: topicSlug } = await params;
  const { mode = "all", type: typeParam } = await searchParams;

  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.slug, "civil"),
  });
  if (!subject) notFound();
  const topic = await db.query.topics.findFirst({
    where: and(eq(topics.subjectId, subject.id), eq(topics.slug, topicSlug)),
  });
  if (!topic) notFound();

  const session = await auth();

  // 錯題複習與收藏（wrong/saved）主人明講混類型 → 忽略 typeParam；
  // 其他 mode 若帶 ?type=choice 則濾出 choice+multi、?type=essay 則濾出 essay。
  const respectType = mode !== "wrong" && mode !== "saved";
  const typeFilter =
    respectType && typeParam === "choice"
      ? inArray(questions.type, ["choice", "multi"])
      : respectType && typeParam === "essay"
        ? eq(questions.type, "essay")
        : undefined;

  let qs = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.topicId, topic.id),
        eq(questions.status, "published"),
        ...(typeFilter ? [typeFilter] : [])
      )
    );

  if (
    (mode === "wrong" || mode === "unseen" || mode === "saved") &&
    !session?.user?.id
  ) {
    return (
      <div className="space-y-4">
        <p>該模式需要登入。</p>
        <Link href="/login" className="underline">
          前往登入
        </Link>
      </div>
    );
  }

  if (mode === "wrong" && session?.user?.id) {
    const wrongIds = await db
      .selectDistinct({ qid: attempts.questionId })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, session.user.id),
          eq(attempts.isCorrect, false),
          sql`${attempts.questionId} not in (select ${dismissedQuestions.questionId} from ${dismissedQuestions} where ${dismissedQuestions.userId} = ${session.user.id})`
        )
      );
    const wrongSet = new Set(wrongIds.map((r) => r.qid));
    qs = qs.filter((q) => wrongSet.has(q.id));
  } else if (mode === "unseen" && session?.user?.id) {
    const seen = await db
      .selectDistinct({ qid: attempts.questionId })
      .from(attempts)
      .where(eq(attempts.userId, session.user.id));
    const seenSet = new Set(seen.map((r) => r.qid));
    qs = qs.filter((q) => !seenSet.has(q.id));
  } else if (mode === "saved" && session?.user?.id) {
    const savedRows = await db
      .selectDistinct({ qid: savedQuestions.questionId })
      .from(savedQuestions)
      .where(eq(savedQuestions.userId, session.user.id));
    const savedSet = new Set(savedRows.map((r) => r.qid));
    qs = qs.filter((q) => savedSet.has(q.id));
  } else if (mode === "random") {
    // shuffle
    qs = qs
      .map((q) => ({ q, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.q)
      .slice(0, 10);
  }

  if (qs.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{topic.nameZh} · 練習</h1>
        <p>此模式目前沒有題目。</p>
        <Link href={`/subjects/civil/${topicSlug}`} className="underline">
          回章節
        </Link>
      </div>
    );
  }

  const payload = qs.map((q) => ({
    id: q.id,
    topicSlug,
    topicId: topic.id,
    type: q.type,
    questionMd: q.questionMd,
    options: q.optionsJson ? (JSON.parse(q.optionsJson) as { key: string; text: string }[]) : [],
    correctAnswer: q.correctAnswerJson ? JSON.parse(q.correctAnswerJson) : null,
    explanationMd: q.explanationMd,
    references: q.referencesJson ? (JSON.parse(q.referencesJson) as { label: string; url: string }[]) : [],
    difficulty: q.difficulty,
    source: q.source,
  }));

  // 預先把該 user 收藏中、且出現在這頁的題目 id 算出來給 runner
  let initialSavedIds: string[] | undefined;
  if (session?.user?.id && payload.length > 0) {
    const savedRows = await db
      .select({ qid: savedQuestions.questionId })
      .from(savedQuestions)
      .where(
        and(
          eq(savedQuestions.userId, session.user.id),
          sql`${savedQuestions.questionId} in (${sql.join(
            payload.map((p) => sql`${p.id}`),
            sql`, `
          )})`
        )
      );
    initialSavedIds = savedRows.map((r) => r.qid);
  }

  return (
    <PracticeRunner
      topicName={topic.nameZh}
      topicSlug={topicSlug}
      subjectSlug="civil"
      subjectName="民法"
      mode={mode}
      questions={payload}
      isLoggedIn={!!session?.user?.id}
      initialSavedIds={initialSavedIds}
    />
  );
}
