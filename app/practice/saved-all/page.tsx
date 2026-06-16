import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  questions,
  savedQuestions,
  subjects,
  topics,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { PracticeRunner } from "@/components/practice-runner";

export const dynamic = "force-dynamic";

export default async function SavedAllPracticePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/practice/saved-all");

  const uid = session.user.id;

  // 拉所有 user 收藏的 question_id
  const savedIds = await db
    .selectDistinct({ qid: savedQuestions.questionId })
    .from(savedQuestions)
    .where(eq(savedQuestions.userId, uid));

  if (savedIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">跨章節收藏題練習</h1>
        <p className="text-muted-foreground">目前沒有收藏題目。</p>
        <Link href="/me/saved" className="underline">
          回到收藏列表
        </Link>
      </div>
    );
  }

  // 拉題目 + topic + subject，按 topic.orderIdx、question.createdAt 排序
  const qs = await db
    .select({
      id: questions.id,
      topicId: questions.topicId,
      topicSlug: topics.slug,
      subjectSlug: subjects.slug,
      type: questions.type,
      questionMd: questions.questionMd,
      optionsJson: questions.optionsJson,
      correctAnswerJson: questions.correctAnswerJson,
      explanationMd: questions.explanationMd,
      referencesJson: questions.referencesJson,
      difficulty: questions.difficulty,
      source: questions.source,
      status: questions.status,
      createdAt: questions.createdAt,
      topicOrderIdx: topics.orderIdx,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .innerJoin(subjects, eq(topics.subjectId, subjects.id))
    .where(
      and(
        eq(questions.status, "published"),
        sql`${questions.id} in (${sql.join(
          savedIds.map((r) => sql`${r.qid}`),
          sql`, `
        )})`
      )
    )
    .orderBy(topics.orderIdx, questions.createdAt);

  if (qs.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">跨章節收藏題練習</h1>
        <p className="text-muted-foreground">目前沒有可用題目。</p>
        <Link href="/me/saved" className="underline">
          回到收藏列表
        </Link>
      </div>
    );
  }

  const payload = qs.map((q) => ({
    id: q.id,
    topicSlug: q.topicSlug,
    topicId: q.topicId,
    type: q.type,
    questionMd: q.questionMd,
    options: q.optionsJson
      ? (JSON.parse(q.optionsJson) as { key: string; text: string }[])
      : [],
    correctAnswer: q.correctAnswerJson ? JSON.parse(q.correctAnswerJson) : null,
    explanationMd: q.explanationMd,
    references: q.referencesJson
      ? (JSON.parse(q.referencesJson) as { label: string; url: string }[])
      : [],
    difficulty: q.difficulty,
    source: q.source,
    subjectSlug: (q.subjectSlug === "criminal" ? "criminal" : "civil") as
      | "civil"
      | "criminal",
  }));

  // 全部都是已收藏 → 預先把 saved set 全填入，避免 client 再 fetch
  const savedSet = payload.map((p) => p.id);

  return (
    <PracticeRunner
      topicName="跨章節"
      topicSlug=""
      mode="saved-all"
      questions={payload}
      isLoggedIn
      title="跨章節收藏題練習"
      hideTopicBreadcrumb
      exitHref="/me/saved"
      exitLabel="回收藏列表"
      finishedLabel="收藏題練完"
      initialSavedIds={savedSet}
    />
  );
}
