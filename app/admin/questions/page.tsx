import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { questions, topics } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rows = await db
    .select({
      id: questions.id,
      type: questions.type,
      questionMd: questions.questionMd,
      status: questions.status,
      topicName: topics.nameZh,
      topicSlug: topics.slug,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .orderBy(sql`${topics.orderIdx} asc`)
    .limit(500);

  async function setStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const status = String(formData.get("status")) as
      | "draft"
      | "published"
      | "archived";
    if (!["draft", "published", "archived"].includes(status)) return;
    await db.update(questions).set({ status }).where(eq(questions.id, id));
    revalidatePath("/admin/questions");
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">題目管理</h1>
        <p className="text-sm text-muted-foreground">共 {rows.length} 題</p>
      </header>
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{r.topicName}</Badge>
                <Badge variant="outline">{r.type}</Badge>
                <Badge
                  variant={
                    r.status === "published"
                      ? "success"
                      : r.status === "draft"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {r.status}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm line-clamp-3">
                {r.questionMd}
              </p>
              <form action={setStatus} className="flex items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select
                  name="status"
                  defaultValue={r.status}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground"
                >
                  更新狀態
                </button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
