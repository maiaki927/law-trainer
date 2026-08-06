import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  attempts,
  dismissedQuestions,
  questions,
  savedQuestions,
  subjects,
  topics,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { PracticeRunner } from "@/components/practice-runner";

export const dynamic = "force-dynamic";

export default async function WrongAllPracticePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/practice/wrong-all");

  const uid = session.user.id;

  // 拉所有曾答錯且未 dismissed 的 question_id
  const wrongIds = await db
    .selectDistinct({ qid: attempts.questionId })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, uid),
        eq(attempts.isCorrect, false),
        sql`${attempts.questionId} not in (select ${dismissedQuestions.questionId} from ${dismissedQuestions} where ${dismissedQuestions.userId} = ${uid})`
      )
    );

  if (wrongIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">跨章節答錯題練習</h1>
        <p className="text-muted-foreground">目前沒有答錯題，繼續加油。</p>
        <Link href="/me" className="underline">
          回到 /me
        </Link>
      </div>
    );
  }

  // 拉題目 + topic + subject，按 topic.orderIdx, question.createdAt 排序
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
          wrongIds.map((r) => sql`${r.qid}`),
          sql`, `
        )})`
      )
    )
    .orderBy(topics.orderIdx, questions.createdAt);

  if (qs.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">跨章節答錯題練習</h1>
        <p className="text-muted-foreground">目前沒有可用題目。</p>
        <Link href="/me" className="underline">
          回到 /me
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

  // 預先把該 user 收藏中、且出現在這頁的題目 id 算出來給 runner
  const savedRows = await db
    .select({ qid: savedQuestions.questionId })
    .from(savedQuestions)
    .where(
      and(
        eq(savedQuestions.userId, uid),
        sql`${savedQuestions.questionId} in (${sql.join(
          payload.map((p) => sql`${p.id}`),
          sql`, `
        )})`
      )
    );
  const initialSavedIds = savedRows.map((r) => r.qid);

  return (
    <PracticeRunner
      topicName="跨章節"
      topicSlug=""
      mode="wrong-all"
      questions={payload}
      isLoggedIn
      title="跨章節答錯題練習"
      hideTopicBreadcrumb
      exitHref="/me"
      exitLabel="回 /me"
      finishedLabel="全部答錯題練完"
      initialSavedIds={initialSavedIds}
    />
  );
}
