import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { dismissedQuestions } from "@/lib/db/schema";

const bodySchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(500),
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

  const userId = session.user.id;
  const now = new Date();
  const rows = parsed.data.questionIds.map((questionId) => ({
    userId,
    questionId,
    dismissedAt: now,
  }));

  const result = await db
    .insert(dismissedQuestions)
    .values(rows)
    .onConflictDoNothing()
    .returning({ questionId: dismissedQuestions.questionId });

  return NextResponse.json({ dismissed: result.length });
}
