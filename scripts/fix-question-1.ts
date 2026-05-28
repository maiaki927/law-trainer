import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and, like } from "drizzle-orm";
import path from "node:path";
import * as schema from "../src/lib/db/schema";

const dbFile = process.env.DATABASE_URL ?? "data/dev.sqlite";
const absPath = path.isAbsolute(dbFile)
  ? dbFile
  : path.join(process.cwd(), dbFile);

const sqlite = new Database(absPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

const { questions, topics } = schema;

const civilLaw = (flno: string) =>
  `https://law.moj.gov.tw/LawClass/LawSingle.aspx?Pcode=B0000001&FLNO=${flno}`;

async function main() {
  const general = await db.query.topics.findFirst({
    where: eq(topics.slug, "general"),
  });
  if (!general) throw new Error("topic general not found");

  const existing = await db.query.questions.findFirst({
    where: and(
      eq(questions.topicId, general.id),
      like(questions.questionMd, "%乙之配偶與第三人發生婚外情%"),
    ),
  });
  if (!existing) {
    console.log("original §72 question not found — perhaps already fixed");
    return;
  }

  const newQuestionMd =
    "甲明知乙之配偶 A 已婚，仍與乙約定：甲負責去勾引 A 並破壞乙與 A 之婚姻關係，事成後乙應給付甲新台幣 100 萬元作為報酬。下列關於甲、乙間該約定效力之敘述，何者最為正確？";

  const newOptions = [
    { key: "A", text: "約定有效，雙方應依約履行。" },
    {
      key: "B",
      text: "約定因標的不能而無效。",
    },
    {
      key: "C",
      text: "約定因違反公共秩序善良風俗而無效（民法第 72 條）。",
    },
    {
      key: "D",
      text: "約定得撤銷，但未撤銷前仍屬有效。",
    },
  ];

  const newExplanation =
    "依**民法第 72 條**：「法律行為，有背於公共秩序或善良風俗者，無效。」\n\n本題之契約以「破壞他人婚姻、誘使第三人通姦」為給付內容（對價），明顯違反一夫一妻、婚姻忠誠等社會公序，屬於公序良俗條款之核心適用範疇。實務上類似「以破壞他人婚姻為對價」之約定，最高法院長期見解（如 50 年台上字第 2596 號等）均認屬違反公序良俗而無效，並非僅得撤銷（§74、§88、§92 之撤銷事由皆不適用）。\n\n**易混淆**：題幹若未明確顯示「以破壞婚姻為對價」之動機（例如：純粹預測性條件、調查取證酬勞、家事顧問報酬），則不必然違反公序良俗，須依個案實質內容判斷。本題因事實已揭示「勾引、破壞」之積極對價結構，方得直接適用 §72。";

  await db
    .update(questions)
    .set({
      questionMd: newQuestionMd,
      optionsJson: JSON.stringify(newOptions),
      explanationMd: newExplanation,
      referencesJson: JSON.stringify([
        { label: "民法第 72 條", url: civilLaw("72") },
      ]),
      updatedAt: new Date(),
    })
    .where(eq(questions.id, existing.id));

  console.log(`updated question id=${existing.id}`);
  console.log("new question:", newQuestionMd.slice(0, 80) + "…");
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
