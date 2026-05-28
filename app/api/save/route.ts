import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { savedQuestions } from "@/lib/db/schema";

const bodySchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(500),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("questionIds");
  const userId = session.user.id;

  if (!idsParam) {
    // 沒帶 questionIds → 回該 user 全部 saved ids
    const rows = await db
      .select({ questionId: savedQuestions.questionId })
      .from(savedQuestions)
      .where(eq(savedQuestions.userId, userId));
    return NextResponse.json({ saved: rows.map((r) => r.questionId) });
  }

  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 500);

  if (ids.length === 0) {
    return NextResponse.json({ saved: [] });
  }

  const rows = await db
    .select({ questionId: savedQuestions.questionId })
    .from(savedQuestions)
    .where(
      and(
        eq(savedQuestions.userId, userId),
        inArray(savedQuestions.questionId, ids)
      )
    );

  return NextResponse.json({ saved: rows.map((r) => r.questionId) });
}

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
    savedAt: now,
  }));

  const result = await db
    .insert(savedQuestions)
    .values(rows)
    .onConflictDoNothing()
    .returning({ questionId: savedQuestions.questionId });

  return NextResponse.json({ saved: result.length });
}

export async function DELETE(req: Request) {
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

  const result = await db
    .delete(savedQuestions)
    .where(
      and(
        eq(savedQuestions.userId, userId),
        inArray(savedQuestions.questionId, parsed.data.questionIds)
      )
    )
    .returning({ questionId: savedQuestions.questionId });

  return NextResponse.json({ deleted: result.length });
}
