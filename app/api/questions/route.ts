import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { questions, topics, subjects } from "@/lib/db/schema";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topicSlug = url.searchParams.get("topic");
  const subjectSlug = url.searchParams.get("subject") ?? "civil";
  if (!topicSlug) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.slug, subjectSlug),
  });
  if (!subject) {
    return NextResponse.json({ error: "subject not found" }, { status: 404 });
  }
  const topic = await db.query.topics.findFirst({
    where: and(eq(topics.subjectId, subject.id), eq(topics.slug, topicSlug)),
  });
  if (!topic) {
    return NextResponse.json({ error: "topic not found" }, { status: 404 });
  }
  const list = await db
    .select({
      id: questions.id,
      type: questions.type,
      questionMd: questions.questionMd,
      difficulty: questions.difficulty,
    })
    .from(questions)
    .where(
      and(eq(questions.topicId, topic.id), eq(questions.status, "published"))
    );
  return NextResponse.json({ topic: topic.nameZh, questions: list });
}
