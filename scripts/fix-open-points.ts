/**
 * Fix 3 open points carried over from borderline review (QA-OPEN-POINTS-LOG.md).
 *
 * Round 3 follow-up after QA-FIX-LOG.md + QA-BORDERLINE-FIX-LOG.md.
 *
 * Targets:
 *   - Q-物-4 §759-1 (f37737ca): add 最高法院 105 台上 473 / 108 台上 23 + 王澤鑑/謝在全 學說標註
 *   - Q-公-9 §17-1 (525fda38): append「實務 reported case 稀少」hedge
 *   - Q-法-7 CISG  (f74ac943): append「台灣非締約國 + 法理援用 / 仲裁援用 / 陳自強 2019」段
 *
 * Conservatively re-writes explanation_md + references_json only.
 * Question stem / options / correct answer are unchanged.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
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

const { questions } = schema;

const civilLaw = (flno: string) =>
  `https://law.moj.gov.tw/LawClass/LawSingle.aspx?Pcode=B0000001&FLNO=${flno}`;

// ============================================================
// O1. 物-4 §759-1 — 補上最高法院 105 台上 473 / 108 台上 23 + 學說標註
// ============================================================
const Q_PROP_4_EXPLANATION =
  "**民法第 759 條之 1 第 2 項**：「因信賴不動產登記之善意第三人，已依法律行為為物權變動之登記者，其變動之效力，不因原登記原因之無效或撤銷而受影響。」\n**土地法第 43 條**：「依本法所為之登記，有絕對效力。」\n\n**信賴登記之保護要件**：\n1. 第三人**信賴登記**而為法律行為。\n2. 第三人**善意**（不知登記原因有瑕疵）。\n3. **已依法律行為為物權變動之登記**（完成移轉登記）。\n\n**「絕對效力」之解釋（實務通說）**：\n- 土地法 §43 雖稱「絕對效力」，但實務上**並非全無限制**。司法院釋字第 600 號 / 最高法院多次判決（39 年台上字第 1109 號、85 年台上字第 2515 號）均闡釋：所謂「絕對效力」僅指對「善意信賴登記之第三人」之保護，並非保護一切第三人。\n- **近年實務動向**：最高法院 105 年度台上字第 473 號民事判決進一步釐清，§759-1 I 所稱「原登記物權之不實」係指「物權登記之物權行為具有無效或得撤銷原因，或登記錯誤或漏未登記等情形」，不包括依適法債權行為所為之物權登記；該判決鞏固「公信力 / 推定力」之區隔，但**未就「重大過失」例外給出明確修正見解**。最高法院 108 年度台上字第 23 號就祭祀公業土地登記亦處理土地法 §43「絕對真實之公信力」與善意保護之關係，惟學者批評其以「有權處分」之路徑處理，與通說「無權處分 + 善意取得」框架有所差異。\n- **重大過失之爭議（學說 vs. 實務）**：\n  - **學說**：王澤鑑、謝在全等物權法學者多數認為，§759-1 II 文義未如 §948 但書明訂「重大過失」例外，惟基於誠信原則（§148）及體系一致性，第三人若有「重大過失而不知」（如交易價金顯不合理、買賣雙方明顯熟識、未盡基本查證義務）仍應排除保護；多採「目的性限縮」之解釋方法。\n  - **實務**：最高法院近年（2010 後）**並無明確採納「重大過失例外」之領導案例**，主流仍以「善意 + 信賴登記」為核心，並透過 §148 誠信原則 / §72 公序良俗等個案調控；下級審則偶見以「重大過失」否定善意之裁判，但未形成穩定見解。\n\n- **B 對**：丙信賴登記善意取得受保護；甲對丙無 §767；甲僅得對乙 §184 / §179，對國家依土地法 §68 / 國賠請求。\n- A 錯：信賴登記之公信力阻擋甲對丙主張。\n- C 錯：登記公信力之意義即「即便原登記有瑕疵，善意信賴者仍取得」。\n- D 錯：§949 為動產盜贓物之特別規定，不適用於不動產。\n\n**【釋疑】**：原解析寫「絕對保護」措辭過強。實務上若丙有重大過失（如明知乙偽造印鑑仍購買），仍可能被排除保護；惟舉證責任由甲負擔。一般偽造印鑑案件丙若無異常情形，仍受保護。";

const Q_PROP_4_REFS = [
  { label: "民法第 759-1 條", url: civilLaw("759-1") },
  { label: "民法第 767 條", url: civilLaw("767") },
  {
    label: "土地法第 43 條",
    url: "https://law.moj.gov.tw/LawClass/LawSingle.aspx?Pcode=D0060001&FLNO=43",
  },
  {
    label: "土地法第 68 條",
    url: "https://law.moj.gov.tw/LawClass/LawSingle.aspx?Pcode=D0060001&FLNO=68",
  },
  {
    label: "最高法院 105 年度台上字第 473 號民事判決（原登記物權之不實）",
    url: "https://db.lawbank.com.tw/FINT/FINTQRY04.aspx?type=J&no=C,105,台上,473,001",
  },
];

// ============================================================
// O2. 公-9 §17-1 — 補上「實務 reported case 稀少」hedge
// ============================================================
const Q_PP_9_EXPLANATION =
  "**行政執行法第 17 條之 1**（禁奢命令 / 禁止命令）：\n第 1 項規定：義務人為自然人，其滯欠合計達一定金額，已發見之財產不足清償其所負義務，且生活逾越一般人通常程度者，行政執行處得依職權或利害關係人之申請對其核發禁止命令，包括：\n1. 禁止購買、租賃或使用一定金額以上之商品或服務。\n2. 禁止搭乘特定之交通工具（如商務艙）。\n3. 禁止為特定之投資。\n4. 禁止進入特定之高消費場所消費。\n5. 禁止贈與或借貸他人一定金額以上之財物。\n6. 禁止每月生活費用超過一定金額。\n7. 其他必要之禁止命令。\n\n**§17-1 第 5 項**（違反之效果）：「義務人經行政執行處依第 1 項規定核發禁止命令後，違反該禁止命令時，行政執行處得限期命其清償適當之金額，或命其報告一定期間內之財產、收入及資金運用狀況；其不依限清償、不為報告或為虛偽之報告者，視為**顯有履行義務之可能而故不履行**，依**第 17 條規定處理**。」\n\n**§17 + §17-1 之串接邏輯**：\n- §17 I 第 1 款:「顯有履行義務之可能，故不履行」者，得聲請法院裁定管收。\n- §17-1 V：違反禁奢 + 不清償 / 不報告 / 虛偽 → 視為 §17 I 第 1 款之事由 → 得聲請管收。\n- §17 III：「**管收期限自管收之日起算，不得逾 3 個月。有管收新原因發生或停止管收原因消滅時，行政執行處仍得聲請該管法院裁定再行管收。但以一次為限。**」\n\n**注意**：「同一筆債務不得二度管收」並非法律明文之絕對禁令；§17 III 明定「再行管收以一次為限」（亦即同一事件至多 2 次管收，總計 6 個月）。違反禁奢命令屬「管收新原因發生」之典型 → 得聲請再行管收（1 次為限）。\n\n**實務 reported case 稀少之提醒**：行政執行署核發禁奢命令件數雖逐年增加，但「違反禁奢命令 → 進入 §17-1 V 中間步驟 → 再聲請再行管收」之**整套流程之公開法院裁定 case 並不多見**。原因有二：(1) 多數義務人在禁奢命令發布或限期清償階段即和解 / 清償，未進入管收；(2) 管收裁定之抗告 / 救濟程序之裁定書公開揭露受到當事人隱私保護限制。因此考試答題以「條文設計 + §17 / §17-1 串接邏輯」為核心即可，無須援引具體字號；實務操作則以法務部行政執行署之內部執行手冊為主要依據。\n\n- **A 對**：明確標示 §17-1 V 之中間步驟（限期清償 / 報告）+ §17 之串接 + §17 III 之管收限制（3 個月 / 再行管收以 1 次為限）。\n- B 錯：禁奢條款明文於《行政執行法》，適用於公法債務之強制執行。\n- C 錯：禁奢條款專為公法債務設計（行政執行）。\n- D 錯：禁奢條款屬比例原則內容（§23 必要性），未被宣告違憲；釋字第 588 號闡釋管收程序須法院裁定即為對人身自由之保護。";

// ============================================================
// O3. 法-7 CISG — 補上「台灣非締約國 + 法理援用」段 + 陳自強 2019
// ============================================================
const Q_METHOD_7_EXPLANATION =
  "**CISG（United Nations Convention on Contracts for the International Sale of Goods，聯合國國際貨物銷售合同公約）**：\n- §1 第 1 項第 a 款：締約國當事人間之貨物買賣自動適用。\n- §6：當事人自治原則 — 雙方得約定排除 CISG（Opt-out），改適用國內法。\n\n**性質與責任體系**：\n- 為「跨國 + 貨物 + 締約國當事人」之買賣特別法 → 優先於各國國內民法。\n- CISG 為**融合大陸法與英美法之國際公約**，採**無過失嚴格責任**之違約責任體系 — 賣方依 §35 應依約定品質及種類交付貨物，違反此義務即構成違約，原則上不問可歸責性，僅 §79 之「不可控之障礙」（impediment beyond control）始得免責。\n- 此與我國民法 §226「因可歸責於債務人之事由致給付不能者」之「**可歸責性原則**」不同 — 我國民法須證明債務人有故意 / 過失始負債務不履行責任。\n- 注意：「嚴格責任」並非英美法系獨有；CISG 之嚴格責任實際是國際公約之選擇，係綜合各法系後之結果，亦非全然採英美 strict liability 模式（因 §79 設有相對寬鬆之免責條款）。\n- 通知義務較嚴格（§38 合理期間檢查、§39 通知瑕疵之合理期間）。\n\n**【台灣與 CISG 之適用關係】**：\n- **台灣非 CISG 締約國**：聯合國 UNCITRAL 未將台灣列為締約國領土，多數學者亦不認為台灣得直接以 §1(1)(a) 適用 CISG。\n- **法理援用途徑**：對台灣法院而言，CISG 之適用主要透過下列三種路徑：\n  1. **當事人合意適用**（CISG §6 反向）：契約明訂以 CISG 為準據法時，台灣法院在涉外民事法律適用法之框架下尊重當事人意思自治。\n  2. **依民法 §1 作為「法理」援用**：在跨國交易而我國民法未明確規範之問題（如國際慣例 / 跨境 risk shifting）上，台灣法院 / 學說將 CISG 視為法理之具體化（與 PECL / PETL / PICC 並列）。\n  3. **商務仲裁援用**：中華民國仲裁協會（CAA）之國際商務仲裁案件中，仲裁人援用 CISG 之頻率高於法院；惟仲裁判斷不公開，難以引用具體字號。\n- **學說討論**：陳自強教授〈聯合國國際商品買賣公約之出賣人義務與違約責任：與臺灣民法之比較研究〉（《臺灣大學法學論叢》第 48 卷第 3 期，2019/09）為代表性研究，比較 CISG 與我國民法之違約救濟體系，認為 CISG 之規則對台灣民法解釋具參考價值；亦有林一山等學者就 CISG §79 之「impediment」與我國民法 §225 / §226 之「不可歸責 / 不可抗力」進行比較。\n- **實務 case 現況**：台灣法院**援用 CISG §79 為依據作成裁判之 case 稀少 / 難以檢索**；考試答題以「CISG §1(1)(a) 自動適用機制 + §6 Opt-out + §79 嚴格責任之免責」之條文邏輯為核心即可，台灣本土實務見解非考點重心。\n\n- **B 對**：CISG 之自動適用 + Opt-out 機制。\n- A 錯：國際公約之優先性 — CISG 為締約國間之特別法。\n- C 錯：CISG 為公約具強制力，締約國須遵守。\n- D 錯：國際貿易並非一律適用英美法；CISG 為融合大陸法與英美法之共同公約。";

const Q_METHOD_7_REFS = [
  {
    label: "CISG（聯合國國際貨物銷售合同公約 UNCITRAL 全文）",
    url: "https://uncitral.un.org/sites/uncitral.un.org/files/media-documents/uncitral/en/19-09951_e_ebook.pdf",
  },
  { label: "民法第 226 條", url: civilLaw("226") },
  { label: "民法第 220 條", url: civilLaw("220") },
  {
    label: "陳自強〈聯合國國際商品買賣公約之出賣人義務與違約責任：與臺灣民法之比較研究〉（臺大法學論叢 48-3, 2019）",
    url: "https://www.law.ntu.edu.tw/center/media/k2/attachments/48y3y5_yyyyyyy.pdf",
  },
];

type Update = {
  id: string;
  description: string;
  explanationMd: string;
  referencesJson?: string;
};

const updates: Update[] = [
  {
    id: "f37737ca-4083-4ec7-83b8-8cbc759e79cf",
    description:
      "Q-物-4 §759-1：補最高法院 105 台上 473 / 108 台上 23 + 王澤鑑/謝在全 學說標註（重大過失例外）",
    explanationMd: Q_PROP_4_EXPLANATION,
    referencesJson: JSON.stringify(Q_PROP_4_REFS),
  },
  {
    id: "525fda38-3c9c-47ad-a528-48b1ff02415d",
    description: "Q-公-9 §17-1：補「實務 reported case 稀少」hedge",
    explanationMd: Q_PP_9_EXPLANATION,
  },
  {
    id: "f74ac943-3ad1-4bbf-8060-f4cd9cad44b9",
    description:
      "Q-法-7 CISG：補台灣非締約國 + 法理援用 / 仲裁援用 / 陳自強 2019 之比較研究",
    explanationMd: Q_METHOD_7_EXPLANATION,
    referencesJson: JSON.stringify(Q_METHOD_7_REFS),
  },
];

async function main() {
  let okCount = 0;
  let skipCount = 0;
  for (const u of updates) {
    const existing = await db.query.questions.findFirst({
      where: eq(questions.id, u.id),
    });
    if (!existing) {
      console.log(`[SKIP] ${u.id} (${u.description}) — question not found`);
      skipCount++;
      continue;
    }

    const setObj: Record<string, unknown> = {
      updatedAt: new Date(),
      explanationMd: u.explanationMd,
    };
    if (u.referencesJson !== undefined) setObj.referencesJson = u.referencesJson;

    await db.update(questions).set(setObj).where(eq(questions.id, u.id));
    console.log(`[OK]  ${u.id} — ${u.description}`);
    okCount++;
  }

  console.log(
    `\nupdated=${okCount}, skipped=${skipCount}, total=${updates.length}`,
  );
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
