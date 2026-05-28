import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { feedback, topics, subjects } from "@/lib/db/schema";

const bodySchema = z.object({
  category: z.string().max(50),
  message: z.string().min(1).max(4000),
  contact: z.string().max(200).nullable().optional(),
  path: z.string().max(500).nullable().optional(),
  topicSlug: z.string().max(100).nullable().optional(),
  questionId: z.string().max(100).nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let topicId: string | null = null;
  if (parsed.data.topicSlug) {
    const civil = await db.query.subjects.findFirst({
      where: eq(subjects.slug, "civil"),
    });
    if (civil) {
      const t = await db.query.topics.findFirst({
        where: and(
          eq(topics.subjectId, civil.id),
          eq(topics.slug, parsed.data.topicSlug)
        ),
      });
      topicId = t?.id ?? null;
    }
  }

  await db.insert(feedback).values({
    id: uuid(),
    userId: session?.user?.id ?? null,
    topicId,
    questionId: parsed.data.questionId ?? null,
    category: parsed.data.category,
    message: parsed.data.message,
    contact: parsed.data.contact ?? null,
    status: "new",
  });

  return NextResponse.json({ ok: true });
}
