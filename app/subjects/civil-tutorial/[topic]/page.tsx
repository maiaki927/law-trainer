import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
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
    where: eq(subjects.slug, "civil-tutorial"),
  });
  if (!subject) notFound();
  const topic = await db.query.topics.findFirst({
    where: and(eq(topics.subjectId, subject.id), eq(topics.slug, topicSlug)),
  });
  if (!topic) notFound();

  const session = await auth();

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)`.as("total") })
    .from(questions)
    .where(
      and(eq(questions.topicId, topic.id), eq(questions.status, "published"))
    );

  const totalNum = Number(total ?? 0);
  const base = `/subjects/civil-tutorial/${topicSlug}/practice`;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            首頁
          </Link>{" "}
          /{" "}
          <Link href="/subjects/civil-tutorial" className="hover:underline">
            民法課輔
          </Link>{" "}
          / {topic.nameZh}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">{topic.nameZh}</h1>
        {topic.description && (
          <p className="text-muted-foreground">{topic.description}</p>
        )}
        <p className="text-sm text-muted-foreground">共 {totalNum} 題</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModeCard
          href={`${base}?mode=all`}
          title="全部題目"
          desc={`依序作答 ${totalNum} 題`}
          disabled={totalNum === 0}
        />
        <ModeCard
          href={`${base}?mode=random`}
          title="隨機 10 題"
          desc="隨機抽 10 題（或全部，取較小者）"
          disabled={totalNum === 0}
        />
        <ModeCard
          href={`${base}?mode=wrong`}
          title="只練答錯過的"
          desc={session?.user ? "重做曾答錯的題目" : "登入後可用"}
          disabled={!session?.user || totalNum === 0}
        />
        <ModeCard
          href={`${base}?mode=unseen`}
          title="未做過"
          desc={session?.user ? "尚未作答的題目" : "登入後可用"}
          disabled={!session?.user || totalNum === 0}
        />
        <ModeCard
          href={`${base}?mode=saved`}
          title="只練收藏"
          desc={session?.user ? "重做本章已收藏的題目" : "登入後可用"}
          disabled={!session?.user || totalNum === 0}
        />
      </div>
    </div>
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
