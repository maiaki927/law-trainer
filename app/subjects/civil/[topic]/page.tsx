import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subjects, topics, questions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Params {
  params: Promise<{ topic: string }>;
}

export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: Params) {
  const { topic: topicSlug } = await params;
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.slug, "civil"),
  });
  if (!subject) notFound();
  const topic = await db.query.topics.findFirst({
    where: and(eq(topics.subjectId, subject.id), eq(topics.slug, topicSlug)),
  });
  if (!topic) notFound();

  const session = await auth();

  // 選擇題（choice + multi）與申論題（essay）各拿一次 count；主人「先選題型」意圖靠 UI 分 section，DB 不動。
  const [choiceCountRow, essayCountRow] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)`.as("n") })
      .from(questions)
      .where(
        and(
          eq(questions.topicId, topic.id),
          eq(questions.status, "published"),
          inArray(questions.type, ["choice", "multi"])
        )
      ),
    db
      .select({ n: sql<number>`count(*)`.as("n") })
      .from(questions)
      .where(
        and(
          eq(questions.topicId, topic.id),
          eq(questions.status, "published"),
          eq(questions.type, "essay")
        )
      ),
  ]);

  const choiceCount = Number(choiceCountRow[0]?.n ?? 0);
  const essayCount = Number(essayCountRow[0]?.n ?? 0);
  const totalNum = choiceCount + essayCount;
  const base = `/subjects/civil/${topicSlug}/practice`;
  const loggedIn = !!session?.user;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            首頁
          </Link>{" "}
          /{" "}
          <Link href="/subjects/civil" className="hover:underline">
            民法
          </Link>{" "}
          / {topic.nameZh}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">{topic.nameZh}</h1>
        {topic.description && (
          <p className="text-muted-foreground">{topic.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          共 {totalNum} 題（選擇 {choiceCount}、申論 {essayCount}）
        </p>
      </header>

      {choiceCount > 0 && (
        <TypeSection
          heading="📝 選擇題"
          count={choiceCount}
          base={base}
          typeParam="choice"
          loggedIn={loggedIn}
        />
      )}

      {essayCount > 0 && (
        <TypeSection
          heading="📄 申論題"
          count={essayCount}
          base={base}
          typeParam="essay"
          loggedIn={loggedIn}
        />
      )}

      <ReviewSection base={base} loggedIn={loggedIn} disabled={totalNum === 0} />
    </div>
  );
}

function TypeSection({
  heading,
  count,
  base,
  typeParam,
  loggedIn,
}: {
  heading: string;
  count: number;
  base: string;
  typeParam: "choice" | "essay";
  loggedIn: boolean;
}) {
  const q = `type=${typeParam}`;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {heading}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {count} 題
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ModeCard
          href={`${base}?mode=all&${q}`}
          title="全部題目"
          desc={`依序作答 ${count} 題`}
          disabled={count === 0}
        />
        <ModeCard
          href={`${base}?mode=random&${q}`}
          title="隨機 10 題"
          desc="隨機抽 10 題（或全部，取較小者）"
          disabled={count === 0}
        />
        <ModeCard
          href={`${base}?mode=unseen&${q}`}
          title="未做過"
          desc={loggedIn ? "尚未作答的題目" : "登入後可用"}
          disabled={!loggedIn || count === 0}
        />
      </div>
    </section>
  );
}

// 錯題複習與收藏：主人要求混類型，共用一個 section 不帶 type 參數。
function ReviewSection({
  base,
  loggedIn,
  disabled,
}: {
  base: string;
  loggedIn: boolean;
  disabled: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        ⚡ 錯題複習
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          混合題型
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModeCard
          href={`${base}?mode=wrong`}
          title="只練答錯過的"
          desc={loggedIn ? "重做曾答錯的題目（含申論）" : "登入後可用"}
          disabled={!loggedIn || disabled}
        />
        <ModeCard
          href={`${base}?mode=saved`}
          title="只練收藏"
          desc={loggedIn ? "重做本章已收藏的題目（含申論）" : "登入後可用"}
          disabled={!loggedIn || disabled}
        />
      </div>
    </section>
  );
}

function ModeCard({
  href,
  title,
  desc,
  disabled,
}: {
  href: string;
  title: string;
  desc: string;
  disabled: boolean;
}) {
  const content = (
    <Card className={disabled ? "opacity-60" : "transition hover:shadow-md"}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled={disabled} className="w-full sm:w-auto">
          開始
        </Button>
      </CardContent>
    </Card>
  );
  if (disabled) return <div>{content}</div>;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
