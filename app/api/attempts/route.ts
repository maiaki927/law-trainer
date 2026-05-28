import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { attempts, questions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  questionId: z.string().min(1),
  answer: z.any().optional(),
  // 申論題沒有對錯 → 允許 null
  isCorrect: z.boolean().nullable(),
  timeSpentS: z.number().int().min(0).max(60 * 60).default(0),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // 確認 question 存在 & published
  const q = await db.query.questions.findFirst({
    where: eq(questions.id, parsed.data.questionId),
  });
  if (!q || q.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = {
    id: uuid(),
    userId: session.user.id,
    questionId: parsed.data.questionId,
    answerJson: parsed.data.answer
      ? JSON.stringify(parsed.data.answer)
      : null,
    isCorrect: parsed.data.isCorrect,
    timeSpentS: parsed.data.timeSpentS,
  };

  await db.insert(attempts).values(row);
  return NextResponse.json({ ok: true });
}
