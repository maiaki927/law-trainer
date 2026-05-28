import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { feedback } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rows = await db
    .select()
    .from(feedback)
    .orderBy(sql`${feedback.createdAt} desc`)
    .limit(200);

  async function setStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const status = String(formData.get("status")) as
      | "new"
      | "processing"
      | "resolved";
    if (!["new", "processing", "resolved"].includes(status)) return;
    await db.update(feedback).set({ status }).where(eq(feedback.id, id));
    revalidatePath("/admin/feedback");
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">使用者回饋</h1>
        <p className="text-sm text-muted-foreground">共 {rows.length} 筆</p>
      </header>
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{r.category}</Badge>
                <Badge
                  variant={
                    r.status === "resolved"
                      ? "success"
                      : r.status === "processing"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {r.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(Number(r.createdAt) * 1000).toLocaleString("zh-TW")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{r.message}</p>
              {r.contact && (
                <p className="text-xs text-muted-foreground">聯絡：{r.contact}</p>
              )}
              <form action={setStatus} className="flex items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select
                  name="status"
                  defaultValue={r.status}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="new">new</option>
                  <option value="processing">processing</option>
                  <option value="resolved">resolved</option>
                </select>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground"
                >
                  更新
                </button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
