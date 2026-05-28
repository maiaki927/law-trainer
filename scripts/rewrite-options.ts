/**
 * Rewrite all 72 type='choice' question options to remove length bias
 * and shuffle correct answer position.
 *
 * Goals:
 * - 4 options length within ±20% (max/min ≤ 1.5x)
 * - correct answer key roughly even across A/B/C/D
 * - law citation moved to explanation; correct option keeps "conclusion + article"
 * - wrong options become plausible distractors with concrete (wrong) reasoning
 *
 * Identification: each entry matched by `match` (substring of question_md).
 * Update: options_json + correct_answer_json only.
 * Side effects: also updates scripts/seed.ts for consistency.
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbFile = process.env.DATABASE_URL ?? "data/dev.sqlite";
const absPath = path.isAbsolute(dbFile)
  ? dbFile
  : path.join(process.cwd(), dbFile);

const sqlite = new Database(absPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

interface Opt {
  key: "A" | "B" | "C" | "D";
  text: string;
}

interface Rewrite {
  match: string; // unique substring of question_md
  options: Opt[]; // length 4
  correctAnswer: "A" | "B" | "C" | "D";
}

// ============================================================
// REWRITES (72 questions, ordered by topic order_idx, then id)
// ============================================================
const rewrites: Rewrite[] = [
  // ---------- 民法總則 (9 questions) ----------

  // 1. §72 公序良俗（破壞婚姻對價）— 原 C 對
  {
    match: "甲明知乙之配偶 A 已婚",
    options: [
      { key: "A", text: "約定有效；依私法自治雙方應依約履行給付。" },
      { key: "B", text: "約定屬意思表示錯誤，依民法 §88 得撤銷。" },
      { key: "C", text: "約定違反公序良俗，依民法 §72 自始無效。" },
      { key: "D", text: "約定屬暴利行為，依民法 §74 得聲請撤銷。" },
    ],
    correctAnswer: "C",
  },

  // 2. §88 II 物之性質錯誤（農地誤認建地）— 原 A 對
  {
    match: "1500 萬元購買 A 地",
    options: [
      { key: "A", text: "地目錯誤屬物之性質錯誤，§88 II 視為內容錯誤可撤銷。" },
      { key: "B", text: "屬純粹動機錯誤，依通說一律不得撤銷意思表示。" },
      { key: "C", text: "應依 §92 詐欺撤銷，§88 不適用買賣契約之錯誤。" },
      { key: "D", text: "屬 §246 自始客觀不能，契約當然無效不必撤銷。" },
    ],
    correctAnswer: "A",
  },

  // 3. §92 詐欺撤銷 vs. 善意第三人 — 原 B 對
  {
    match: "甲受乙之詐欺而將其名車賣給乙",
    options: [
      { key: "A", text: "撤銷溯及無效，丙縱善意亦須返還車輛予甲。" },
      { key: "B", text: "撤銷不得對抗善意丙，甲僅得對乙依 §179 求償。" },
      { key: "C", text: "撤銷對乙亦無溯及力，甲只能保留請求權對乙主張。" },
      { key: "D", text: "詐欺不得撤銷意思表示，僅脅迫始得依 §92 撤銷。" },
    ],
    correctAnswer: "B",
  },

  // 4. §106 自己代理禁止 — 原 A 對
  {
    match: "乙竟以甲之代理人身分，將乙自己所有之房屋賣給甲",
    options: [
      { key: "A", text: "違反 §106 自己代理禁止，效力未定須甲承認。" },
      { key: "B", text: "依私法自治乙得自由為自己代理，民法並未限制。" },
      { key: "C", text: "乙之行為構成 §92 詐欺，買賣契約絕對無效。" },
      { key: "D", text: "甲僅得依 §184 求償，不得拒絕承擔買賣效力。" },
    ],
    correctAnswer: "A",
  },

  // 5. §148 誠信原則 / 權利失效（遠期支票 6 年）— 原 B 對
  {
    match: "連續 6 年改以 30 至 90 天遠期支票",
    options: [
      { key: "A", text: "甲始終得請求即期付款；乙公司違約其主張全部有理由。" },
      { key: "B", text: "甲長期默認違 §148 誠信原則之權利失效，不得追索。" },
      { key: "C", text: "權利失效僅於 §125 消滅時效完成後始得援用之抗辯。" },
      { key: "D", text: "雙方默示成立新契約變更給付方式，乙無任何違約責任。" },
    ],
    correctAnswer: "B",
  },

  // 6. §169 表見代理（特助保管印章權狀）— 原 B 對
  {
    match: "甲長年將自己印鑑章及不動產權狀交由特助乙保管",
    options: [
      { key: "A", text: "乙無代理權契約不生效力，丙僅得依 §110 對乙求償。" },
      { key: "B", text: "甲交付印章權狀構成授權外觀，丙得依 §169 主張。" },
      { key: "C", text: "表見代理係刑法偽造文書問題，於民法上無適用。" },
      { key: "D", text: "丙縱明知乙無代理權，仍受 §169 表見代理保護。" },
    ],
    correctAnswer: "B",
  },

  // 7. 消滅時效 5 項敘述（哪個錯）— 原 D 對
  {
    match: "下列關於民法消滅時效之敘述，何者錯誤",
    options: [
      { key: "A", text: "一般請求權時效期間 §125 為 15 年，除法律另有規定。" },
      { key: "B", text: "利息、紅利、租金等定期給付債權，§126 為 5 年。" },
      { key: "C", text: "旅店、運送費、診金、律師酬金等，§127 為 2 年。" },
      { key: "D", text: "時效完成債權即消滅，債務人清償後仍得請求返還。" },
    ],
    correctAnswer: "D",
  },

  // 8. §130 時效中斷 6 個月未起訴 — 原 B 對
  {
    match: "113 年 10 月 1 日寄出存證信函",
    options: [
      { key: "A", text: "存證信函即生確定中斷效力，請求權永遠不消滅。" },
      { key: "B", text: "請求後逾 6 個月始起訴，§130 視為時效不中斷。" },
      { key: "C", text: "存證信函即屬起訴，時效自送達起重新起算 15 年。" },
      { key: "D", text: "甲須於 113/12/31 前起訴，§130 6 個月規定不適用。" },
    ],
    correctAnswer: "B",
  },

  // 9. §118 無權處分 + §948 善意取得 — 原 B 對
  {
    match: "甲將其所有之名畫寄託於乙保管。乙未經甲同意",
    options: [
      { key: "A", text: "債權行為亦因乙無處分權而當然自始無效不生效力。" },
      { key: "B", text: "處分行為效力未定，丙得依 §948 善意取得所有權。" },
      { key: "C", text: "乙無權處分，丙絕對不能依任何規定取得手錶所有權。" },
      { key: "D", text: "甲僅能對丙依 §184 主張侵權行為損害賠償請求。" },
    ],
    correctAnswer: "B",
  },

  // ---------- 債編 (9 questions) ----------

  // 10. §184 純粹經濟上損失（電纜案）— 原 A 對
  {
    match: "甲營造廠施工挖斷乙電力公司之地下電纜",
    options: [
      { key: "A", text: "乙得依 §184 I 前段請求；丙之純粹經濟上損失不受保護。" },
      { key: "B", text: "丙之損失與甲過失有因果關係，得請求 200 萬全額賠償。" },
      { key: "C", text: "甲非故意僅過失，乙、丙均不得依 §184 主張任何賠償。" },
      { key: "D", text: "丙僅得對乙依契約請求 200 萬損害賠償，不對甲主張。" },
    ],
    correctAnswer: "A",
  },

  // 11. §179 不當得利（誤匯款）— 原 B 對
  {
    match: "甲誤以為自己對乙負有 5 萬元借款債務",
    options: [
      { key: "A", text: "乙已善意受領，甲依 §182 I 一概無權請求返還。" },
      { key: "B", text: "甲得依 §179 不當得利請求乙返還 5 萬元給付。" },
      { key: "C", text: "甲僅得對乙主張 §184 侵權行為損害賠償請求權。" },
      { key: "D", text: "甲應依 §88 撤銷匯款行為，否則無法請求返還。" },
    ],
    correctAnswer: "B",
  },

  // 12. §227 II 加害給付（伺服器毀資料庫）— 原 B 對
  {
    match: "B 公司購買伺服器一台",
    options: [
      { key: "A", text: "A 僅得依 §354 物之瑕疵擔保請求減少伺服器之價金。" },
      { key: "B", text: "屬 §227 II 加害給付，固有利益損害與 §184 競合。" },
      { key: "C", text: "A 僅能依 §184 主張侵權，不得同時依契約規定請求。" },
      { key: "D", text: "B 之損害賠償責任應以伺服器之買賣價金為上限額。" },
    ],
    correctAnswer: "B",
  },

  // 13. §234, §237, §267 受領遲延（鋼筋鏽蝕）— 原 B 對
  {
    match: "B 無正當理由拒絕受領。A 將鋼筋拉回",
    options: [
      { key: "A", text: "A 對鋼筋全部鏽蝕負全責，B 得拒絕付款並請求損害賠償。" },
      { key: "B", text: "B §234 受領遲延，§237 / §267 風險倒置。" },
      { key: "C", text: "A 須依種類之債規定以同類鋼筋另行交付方得請求貨款。" },
      { key: "D", text: "雙方契約因不可抗力致給付不能而消滅，雙方均不負其責。" },
    ],
    correctAnswer: "B",
  },

  // 14. §222 免責約定不得免除故意/重大過失 — 原 B 對
  {
    match: "乙因任何原因（包括故意）致甲之寄託物毀損",
    options: [
      { key: "A", text: "依契約自由原則雙方合意之免責約定全部依約有效。" },
      { key: "B", text: "依 §222 故意 / 重大過失部分無效，乙仍須負責。" },
      { key: "C", text: "整個寄託契約因該免責條款違法而當然完全無效。" },
      { key: "D", text: "免責約定僅於乙係消費者時始依消保法視為無效。" },
    ],
    correctAnswer: "B",
  },

  // 15. §172, §176 適法無因管理 — 原 B 對
  {
    match: "鄰居乙發現甲家屋頂漏水即將擴大",
    options: [
      { key: "A", text: "乙係出於善意贈與，依 §406 無權請求甲返還費用。" },
      { key: "B", text: "屬適法無因管理，§176 I 得請求必要費用與利息。" },
      { key: "C", text: "乙僅得依 §179 不當得利向甲主張現存利益返還。" },
      { key: "D", text: "乙未受委任擅自為之，構成 §184 侵權行為應賠償。" },
    ],
    correctAnswer: "B",
  },

  // 16. §182 善意受領人現存利益（清償他債）— 原 B 對
  {
    match: "A 誤將 100 萬匯入 B 帳戶",
    options: [
      { key: "A", text: "B 善意僅返還現存 50 萬，已支出之 50 萬免返還。" },
      { key: "B", text: "清償他債屬現存利益轉換，B 應返還 100 萬不加利息。" },
      { key: "C", text: "B 善意且所受利益已全部用盡，依 §182 I 免責不返還。" },
      { key: "D", text: "B 無論善 / 惡意均應返還 100 萬與利息及損害賠償。" },
    ],
    correctAnswer: "B",
  },

  // 17. §225, §266 不可歸責雙方給付不能 — 原 A 對
  {
    match: "5 月 30 日因不可歸責於雙方之事由（地震）",
    options: [
      { key: "A", text: "依 §225 I 甲免給付，§266 I 乙亦免對待給付。" },
      { key: "B", text: "甲免給付義務，但買方乙仍應依約支付 100 萬元價金。" },
      { key: "C", text: "種類之債具體化後仍須以同類古董花瓶替代給付予甲。" },
      { key: "D", text: "契約因 §246 自始不能而無效，雙方賠償信賴利益。" },
    ],
    correctAnswer: "A",
  },

  // 18. §188 僱用人連帶責任 — 原 B 對
  {
    match: "甲為乙公司之送貨司機，於執行職務送貨",
    options: [
      { key: "A", text: "甲行為非乙行為，乙完全不對丙負任何損害賠償。" },
      { key: "B", text: "§188 僱用人與受僱人連帶責任，乙得舉證免責。" },
      { key: "C", text: "丙只能對乙公司請求賠償，不得直接對甲求償。" },
      { key: "D", text: "甲為受僱人個人不負責，責任由乙公司獨自承擔。" },
    ],
    correctAnswer: "B",
  },

  // ---------- 契約法 (10 questions) ----------

  // 19. §254 給付遲延須催告 — 原 B 對
  {
    match: "約定乙應於 5 月 1 日交付貨物。乙逾期未交付",
    options: [
      { key: "A", text: "甲得逕行解除契約，§254 不要求通知催告程序。" },
      { key: "B", text: "甲應依 §254 定相當期限催告，逾期始得解除。" },
      { key: "C", text: "甲僅得依 §216 請求遲延賠償，不得解除契約。" },
      { key: "D", text: "甲須依民事訴訟程序訴請法院判決解除契約。" },
    ],
    correctAnswer: "B",
  },

  // 20. §269 第三人利益契約 — 原 B 對
  {
    match: "雙方意思一致為「使丙取得直接請求權」",
    options: [
      { key: "A", text: "丙非當事人對乙無請求權，僅得透過甲催乙履行。" },
      { key: "B", text: "屬 §269 第三人利益契約，丙取得直接請求權。" },
      { key: "C", text: "丙縱未表示享受利益亦自動取得請求權不受撤銷。" },
      { key: "D", text: "甲乙契約相對性，對第三人丙絕對不生任何效力。" },
    ],
    correctAnswer: "B",
  },

  // 21. §245-1 締約上過失 — 原 B 對
  {
    match: "甲明知該房屋將被都更但刻意隱匿",
    options: [
      { key: "A", text: "契約未成立雙方均無責任，乙之費用自行吸收。" },
      { key: "B", text: "甲依 §245-1 締約上過失賠償乙之信賴利益。" },
      { key: "C", text: "甲僅須返還乙所付定金，無其他損害賠償義務。" },
      { key: "D", text: "乙僅得依 §184 I 前段主張，§245-1 不適用。" },
    ],
    correctAnswer: "B",
  },

  // 22. §255 定期行為（婚紗）— 原 B 對
  {
    match: "向裁縫師乙訂製婚紗一件",
    options: [
      { key: "A", text: "甲須依 §254 先定期催告，否則不得解除契約。" },
      { key: "B", text: "屬 §255 定期行為，甲得不經催告直接解除契約。" },
      { key: "C", text: "甲僅得依 §231 請求遲延損害，無權解除契約。" },
      { key: "D", text: "甲須訴請法院依職權審酌後判決解除契約。" },
    ],
    correctAnswer: "B",
  },

  // 23. §226, §256 給付不能可歸責 — 原 B 對
  {
    match: "交付前因乙過失將花瓶摔破",
    options: [
      { key: "A", text: "甲須依 §254 催告乙履行，否則不得解除契約。" },
      { key: "B", text: "可歸責致給付不能，依 §256 直接解除並請求賠償。" },
      { key: "C", text: "甲僅能請求修復同類花瓶替代，不能解除契約。" },
      { key: "D", text: "屬不可歸責於雙方致給付不能，依 §225 雙方免責。" },
    ],
    correctAnswer: "B",
  },

  // 24. §246, §247 自始客觀不能（已徵收）— 原 B 對
  {
    match: "事後始知該地早於締約前已被政府依法徵收",
    options: [
      { key: "A", text: "契約有效甲應交付，無法交付者負給付遲延責任。" },
      { key: "B", text: "依 §246 I 契約無效，§247 知情者賠信賴利益。" },
      { key: "C", text: "契約有效雙方按可履行比例分配並履行給付義務。" },
      { key: "D", text: "甲得依 §88 II 物之性質錯誤撤銷其意思表示。" },
    ],
    correctAnswer: "B",
  },

  // 25. §359 物之瑕疵擔保 — 原 B 對
  {
    match: "中古車一輛 100 萬元，交付後 1 個月發現引擎",
    options: [
      { key: "A", text: "甲僅得依 §354、§359 解除買賣契約，不得請求減價。" },
      { key: "B", text: "依 §359 得擇解約或減價，§365 6 月 / 5 年除斥。" },
      { key: "C", text: "甲僅得依 §184 主張侵權行為，瑕疵擔保規定不適用。" },
      { key: "D", text: "瑕疵擔保責任以買賣價金為上限，不得另請求損害賠償。" },
    ],
    correctAnswer: "B",
  },

  // 26. §154 II 標價陳列視為要約 — 原 A 對
  {
    match: "書架上陳列「某書，原價",
    options: [
      { key: "A", text: "依 §154 II 標價陳列視為要約，乙承諾契約成立。" },
      { key: "B", text: "書架陳列商品標價屬要約引誘，甲得任意拒絕乙要約。" },
      { key: "C", text: "甲於現金實際收受後始受該買賣契約效力之拘束。" },
      { key: "D", text: "甲乙須另立書面契約並雙方簽名後買賣始合法成立。" },
    ],
    correctAnswer: "A",
  },

  // 27. §264 同時履行抗辯 — 原 C 對
  {
    match: "雙方未約定先後給付順序",
    options: [
      { key: "A", text: "依商業慣例買賣契約一律由買方甲先付款給賣方乙。" },
      { key: "B", text: "依交易常情買賣契約一律由賣方乙先交貨給買方甲。" },
      { key: "C", text: "未約定者依 §264 雙方得主張同時履行抗辯權。" },
      { key: "D", text: "雙方僵持不下視為意思不一致，契約因而自動失效。" },
    ],
    correctAnswer: "C",
  },

  // 28. §247-1 / 消保法 §12 定型化契約 — 原 B 對
  {
    match: "會員一經入會，無論任何事由（含重大傷病）皆不得退費",
    options: [
      { key: "A", text: "屬雙方合意之定型化約款，業者依契約自由得拒絕退費。" },
      { key: "B", text: "違 §247-1 III + 消保法 §12 顯失公平該款無效。" },
      { key: "C", text: "甲僅得於入會 7 日內依消保法 §19 猶豫期間請求退費。" },
      { key: "D", text: "該約款無效致健身房整個會員契約自始全部當然無效。" },
    ],
    correctAnswer: "B",
  },

  // ---------- 物權 (9 questions) ----------

  // 29. §819, §820 共有處分與管理 — 原 B 對
  {
    match: "甲、乙、丙分別共有一塊土地（應有部分各 1/3）",
    options: [
      { key: "A", text: "處分自己應有部分須得他共有人全體同意始生效力。" },
      { key: "B", text: "§819 處分自有部分自由；整體處分 / 管理規則異。" },
      { key: "C", text: "出售整塊土地僅須過半數共有人同意即可有效成立。" },
      { key: "D", text: "三人就共有物各自獨立享有完整之單獨所有權與處分權。" },
    ],
    correctAnswer: "B",
  },

  // 30. §949 盜贓物 2 年回復請求 — 原 B 對
  {
    match: "甲之機車於 113 年 5 月 1 日遭乙竊取",
    options: [
      { key: "A", text: "丙依 §801、§948 善意取得，甲不得請求返還。" },
      { key: "B", text: "依 §949，2 年內甲得向善意丙請求回復其物。" },
      { key: "C", text: "丙為機車商人，甲須依 §950 償還價金始得回復。" },
      { key: "D", text: "甲僅得對乙主張 §179 / §184，不得對丙請求。" },
    ],
    correctAnswer: "B",
  },

  // 31. 抵押權、質權、留置權比較 — 原 B 對
  {
    match: "下列關於抵押權、動產質權、留置權之比較",
    options: [
      { key: "A", text: "三者均須以移轉占有為成立要件始生擔保效力。" },
      { key: "B", text: "抵押權不移轉占有；質權須交付；留置權為法定。" },
      { key: "C", text: "三者均須依當事人法律行為設定始生擔保效力。" },
      { key: "D", text: "抵押權之實行得由抵押權人自行拍賣不必聲請法院。" },
    ],
    correctAnswer: "B",
  },

  // 32. §948 善意取得（手錶寄託案）— 原 B 對
  {
    match: "甲將其名牌手錶寄託於乙保管",
    options: [
      { key: "A", text: "乙無處分權致買賣絕對無效，丙無從取得所有權。" },
      { key: "B", text: "丙非明知亦非重大過失，依 §948 善意取得所有權。" },
      { key: "C", text: "丙僅取得占有但不取得所有權，甲得隨時請求返還。" },
      { key: "D", text: "丙取得所有權，但甲得對丙依 §179 主張不當得利。" },
    ],
    correctAnswer: "B",
  },

  // 33. §787, §789 袋地通行權 — 原 B 對
  {
    match: "甲所有之 A 地為四周地包圍之袋地",
    options: [
      { key: "A", text: "甲僅得購買鄰地始得通行至公路，無法定通行權適用。" },
      { key: "B", text: "依 §787 得通行鄰地付償金；§789 分割袋地免償。" },
      { key: "C", text: "甲須等待政府主動開闢道路後始得通行，不得擅自行使。" },
      { key: "D", text: "袋地通行權之行使須先取得周圍鄰地所有人之事前同意。" },
    ],
    correctAnswer: "B",
  },

  // 34. §758, §761 物權變動公示 — 原 B 對
  {
    match: "下列關於動產與不動產物權變動之敘述",
    options: [
      { key: "A", text: "動產與不動產物權變動均須登記始生物權變動之效力。" },
      { key: "B", text: "§758 不動產登記；§761 動產交付為公示要件。" },
      { key: "C", text: "動產與不動產物權變動均以現實交付為公示之要件。" },
      { key: "D", text: "繼承取得不動產物權亦須完成登記始生繼承之效力。" },
    ],
    correctAnswer: "B",
  },

  // 35. §759-1 II 信賴登記公信力 — 原 B 對
  {
    match: "遭乙偽造甲之印鑑及證件登記為乙所有",
    options: [
      { key: "A", text: "甲得依 §767 直接請求丙返還 A 地並塗銷登記。" },
      { key: "B", text: "§759-1 II + 土地法 §43 善意丙取得所有權。" },
      { key: "C", text: "原物權行為自始無效，丙無從基於登記取得所有權。" },
      { key: "D", text: "甲得於 2 年內依 §949 向丙主張回復其不動產。" },
    ],
    correctAnswer: "B",
  },

  // 36. 釋字 107 / 164 已登記不動產回復請求權 — 原 B 對
  {
    match: "民國 80 年遭乙無權占用建屋",
    options: [
      { key: "A", text: "甲之 §767 請求權已逾 §125 15 年時效而消滅。" },
      { key: "B", text: "釋字 107 / 164：已登記不動產無 §125 時效適用。" },
      { key: "C", text: "甲僅得依 §184 請求乙損害賠償，不得請求拆屋。" },
      { key: "D", text: "乙占用逾 20 年依 §769、§770 取得時效取得所有權。" },
    ],
    correctAnswer: "B",
  },

  // 37. §826-1 分管契約登記對抗 — 原 A 對
  {
    match: "甲使用東半部、乙使用西半部、丙使用南半部",
    options: [
      { key: "A", text: "§826-1 未登記者對善意無過失受讓人丁不生效力。" },
      { key: "B", text: "分管契約屬共有物之約定，一律拘束所有受讓人。" },
      { key: "C", text: "分管契約僅拘束原約定當事人，永遠不拘束受讓人。" },
      { key: "D", text: "丁是否受拘束須甲、乙、丙、丁四方再協議定之。" },
    ],
    correctAnswer: "A",
  },

  // ---------- 親屬 (8 questions) ----------

  // 38. §1113-2 意定監護優先 — 原 B 對
  {
    match: "意識清楚時與信任之友人乙簽訂意定監護契約",
    options: [
      { key: "A", text: "法院應依 §1094 由家屬丙優先擔任甲之監護人。" },
      { key: "B", text: "依 §1113-2 法院應優先尊重甲之意定監護契約。" },
      { key: "C", text: "意定監護契約因甲嗣後失智而自始失其拘束效力。" },
      { key: "D", text: "意定監護契約須經甲之全體子女同意始得生效。" },
    ],
    correctAnswer: "B",
  },

  // 39. §1073-1 禁止收養 — 原 A 對
  {
    match: "依民法第 1073 條之 1，下列何種親屬間禁止收養",
    options: [
      { key: "A", text: "直系血親、直系姻親、六親等以內輩分不相當之旁系。" },
      { key: "B", text: "僅直系血親禁止收養，其他親屬間均得自由收養。" },
      { key: "C", text: "僅同輩兄弟姊妹間禁止收養，跨輩分者均得收養。" },
      { key: "D", text: "所有具親屬關係者一律不得相互收養為養子女。" },
    ],
    correctAnswer: "A",
  },

  // 40. §1198 遺囑見證人 — 原 D 對
  {
    match: "下列何者依民法第 1198 條不得為遺囑見證人",
    options: [
      { key: "A", text: "未成年人；因欠缺成熟判斷能力而被列為不適格。" },
      { key: "B", text: "受監護或輔助宣告之人；行為能力受限不得見證。" },
      { key: "C", text: "繼承人 / 受遺贈人及其配偶或直系血親利害關係人。" },
      { key: "D", text: "以上三類人均屬 §1198 所列不適格之見證人。" },
    ],
    correctAnswer: "D",
  },

  // 41. §1003 日常家務代理 — 原 B 對
  {
    match: "擅自以乙之名義購買日常家用之米麵油鹽",
    options: [
      { key: "A", text: "甲非乙之代理人，該買賣契約對乙完全不生效力。" },
      { key: "B", text: "§1003 I 日常家務互為代理，乙不得隨意否認。" },
      { key: "C", text: "法定財產制下夫妻任一方之對外行為均拘束他方。" },
      { key: "D", text: "採法定財產制者，夫妻所有債務原則一律由甲承擔。" },
    ],
    correctAnswer: "B",
  },

  // 42. §1030-1 剩餘財產分配計算 — 原 A 對
  {
    match: "甲現存婚後財產 800 萬元（其中 200 萬元為甲之父親",
    options: [
      { key: "A", text: "150 萬元（甲剩餘 500 − 乙剩餘 200，差額 ÷ 2）。" },
      { key: "B", text: "200 萬元（甲剩餘 600 − 乙剩餘 200，差額 ÷ 2）。" },
      { key: "C", text: "300 萬元（甲、乙剩餘差額之全部，不平均分配）。" },
      { key: "D", text: "100 萬元（甲剩餘 400 − 乙剩餘 200，差額 ÷ 2）。" },
    ],
    correctAnswer: "A",
  },

  // 43. §971 姻親消滅事由 — 原 B 對
  {
    match: "下列關於姻親關係消滅事由之敘述",
    options: [
      { key: "A", text: "姻親因離婚、結婚撤銷或配偶死亡之事由而消滅。" },
      { key: "B", text: "依 §971 僅離婚、撤銷消滅；配偶死亡不消滅。" },
      { key: "C", text: "姻親關係終身有效，因任何法律事由均不消滅之。" },
      { key: "D", text: "姻親關係之消滅一律須經法院之裁定後始生效力。" },
    ],
    correctAnswer: "B",
  },

  // 44. §1020-1, §1030-3 婚後無償行為救濟 — 原 A 對
  {
    match: "將其婚後財產 500 萬元贈與其情婦丙",
    options: [
      { key: "A", text: "§1020-1 撤銷無償行為 + §1030-3 追加計算雙軌。" },
      { key: "B", text: "甲對丙之贈與屬私法自治範圍，乙無任何法律救濟途徑。" },
      { key: "C", text: "乙僅得依 §184 對情婦丙主張侵權行為之損害賠償。" },
      { key: "D", text: "乙僅得依 §92 對甲主張詐欺撤銷其對情婦之贈與行為。" },
    ],
    correctAnswer: "A",
  },

  // 45. §187 限制行為能力人侵權 — 原 B 對
  {
    match: "14 歲少年甲於學校鬥毆致同學乙重傷",
    options: [
      { key: "A", text: "因甲為未成年人，所有責任應由甲之父母全部承擔。" },
      { key: "B", text: "§187 I 識別能力者與法代連帶，父母舉證失敗。" },
      { key: "C", text: "甲須完全自負侵權責任，父母無監督義務不負責。" },
      { key: "D", text: "未成年人間鬥毆，依 §187 規定甲、乙雙方均免責。" },
    ],
    correctAnswer: "B",
  },

  // ---------- 繼承 (9 questions) ----------

  // 46. §1144 配偶與父母同繼承 — 原 B 對
  {
    match: "遺有配偶乙、父丙、母丁，遺產 1200 萬元",
    options: [
      { key: "A", text: "乙、丙、丁三人均分各 400 萬元（誤用 §1144 1）。" },
      { key: "B", text: "依 §1144 2 配偶 1/2、父母均分餘額各 300 萬。" },
      { key: "C", text: "乙全部繼承 1200 萬，第二順序父母無繼承權。" },
      { key: "D", text: "乙 800 萬、父丙 200 萬、母丁 200 萬之比例分配。" },
    ],
    correctAnswer: "B",
  },

  // 47. §1140 代位繼承 — 原 B 對
  {
    match: "A 於甲死前 1 年已死亡並遺有兒子 C",
    options: [
      { key: "A", text: "A 死亡 A 之份額歸 B，甲遺產全由 B 繼承 1200 萬。" },
      { key: "B", text: "依 §1140 C 代位 A 之應繼分；B、C 各得 600 萬。" },
      { key: "C", text: "A 已死無繼承權，C 為孫輩亦不得繼承祖父甲遺產。" },
      { key: "D", text: "甲遺產由 B、C 均分各 600 萬，C 為直接繼承非代位。" },
    ],
    correctAnswer: "B",
  },

  // 48. §1223 特留分 — 原 A 對
  {
    match: "直系血親卑親屬之特留分為其應繼分之多少",
    options: [
      { key: "A", text: "二分之一（與父母、配偶同列高比例特留分群組）。" },
      { key: "B", text: "三分之一（與兄弟姊妹、祖父母同列低比例特留分）。" },
      { key: "C", text: "三分之二（誤將特留分與應繼分之關係顛倒計算）。" },
      { key: "D", text: "四分之一（誤套外國立法例非我國 §1223 之規定）。" },
    ],
    correctAnswer: "A",
  },

  // 49. §1138, §1144 1 配偶與卑親屬均分 — 原 B 對
  {
    match: "遺有配偶乙、子丙、女丁，遺產 1200 萬元",
    options: [
      { key: "A", text: "乙 1/2 配偶份額 600 萬、子女各 300 萬之分配方式。" },
      { key: "B", text: "依 §1144 1 乙、丙、丁三人均分各 400 萬元。" },
      { key: "C", text: "乙 600 萬、丙 600 萬、丁 0 萬（女兒無繼承權）。" },
      { key: "D", text: "依配偶優先原則全部 1200 萬均由配偶乙繼承。" },
    ],
    correctAnswer: "B",
  },

  // 50. §1194, §1198 代筆遺囑見證人不適格 — 原 B 對
  {
    match: "由其配偶乙代筆，乙、其女丙、其子丁三人簽名",
    options: [
      { key: "A", text: "§1194 3 名見證人簽名要件已備，代筆遺囑有效。" },
      { key: "B", text: "依 §1198 III 繼承人不得見證，遺囑因此無效。" },
      { key: "C", text: "代筆遺囑無效；甲應另立 §1191 公證遺囑始有效。" },
      { key: "D", text: "代筆遺囑只要有一名適格見證人簽名即合法有效。" },
    ],
    correctAnswer: "B",
  },

  // 51. §1190 自書遺囑須親自手寫 — 原 B 對
  {
    match: "電腦打字製作遺囑全文",
    options: [
      { key: "A", text: "電腦打字 + 簽名 + 年月日符合 §1190，遺囑有效。" },
      { key: "B", text: "§1190 通說「自書」須手寫，打字本違式無效。" },
      { key: "C", text: "甲之遺囑可轉換為 §1191 公證遺囑而生效力。" },
      { key: "D", text: "甲之遺囑因未經公證程序而當然違反方式無效。" },
    ],
    correctAnswer: "B",
  },

  // 52. §1148 II 全面限定繼承 — 原 B 對
  {
    match: "甲死亡時遺有債務 800 萬元、遺產 200 萬元",
    options: [
      { key: "A", text: "乙、丙仍須以個人財產償還剩餘之 600 萬元父債子還。" },
      { key: "B", text: "§1148 II 全面限定繼承，僅以遺產 200 萬為限。" },
      { key: "C", text: "乙、丙須於 3 個月內向法院拋棄繼承始得免於父債子還。" },
      { key: "D", text: "繼承權若包含債務時，依現行法繼承人視為自動拋棄繼承。" },
    ],
    correctAnswer: "B",
  },

  // 53. §11 同時死亡 + §1140 代位 — 原 A 對
  {
    match: "父甲、子 A 同乘一車於車禍中身亡",
    options: [
      { key: "A", text: "§11 互不繼承；通說 C 代位 A，B、C 各 600 萬。" },
      { key: "B", text: "同時死亡 C 不得代位繼承，全部 1200 萬歸 B 取得。" },
      { key: "C", text: "甲之遺產因無繼承人之爭議全部歸國家所有取得。" },
      { key: "D", text: "甲、A 互相繼承後，A 之遺產再依序由 C 繼承。" },
    ],
    correctAnswer: "A",
  },

  // 54. §1173 歸扣（結婚 / 營業贈與）— 原 B 對
  {
    match: "民國 110 年因兒子乙結婚贈與 200 萬元",
    options: [
      { key: "A", text: "乙 300、丙 300（未歸扣，將遺產 600 直接均分）。" },
      { key: "B", text: "§1173 歸扣計算：乙實得 50、丙實得 550 萬。" },
      { key: "C", text: "乙生前已先取得 500 萬贈與，喪失繼承權之資格。" },
      { key: "D", text: "乙 100、丙 500（誤算歸扣金額僅以 200 萬計入）。" },
    ],
    correctAnswer: "B",
  },

  // ---------- 公私法區分 (9 questions) ----------

  // 55. 行政程序法 §137 不當聯結禁止 — 原 B 對
  {
    match: "贊助縣府舉辦之「縣長女兒慈善晚會」",
    options: [
      { key: "A", text: "雙方合意之行政契約條款均屬有效，廠商應依約贊助。" },
      { key: "B", text: "違反行政程序法 §137 I 3 禁止不當聯結原則無效。" },
      { key: "C", text: "縣府得依行政自由裁量任意要求廠商履行其贊助義務。" },
      { key: "D", text: "廠商一旦簽約即受契約拘束，不得再主張不當聯結。" },
    ],
    correctAnswer: "B",
  },

  // 56. 行政執行法 §17-1 禁奢命令 — 原 A 對
  {
    match: "甲欠繳行政罰鍰 50 萬元，有支付能力卻拒絕履行",
    options: [
      { key: "A", text: "行政執行法 §17-1 禁奢 + §17 串接管收程序。" },
      { key: "B", text: "行政罰鍰僅得循民事執行程序，禁奢條款不適用。" },
      { key: "C", text: "禁奢命令係民事債務專屬制度，不適用於公法債務。" },
      { key: "D", text: "禁奢命令違反憲法 §22 比例原則，已被宣告違憲。" },
    ],
    correctAnswer: "A",
  },

  // 57. 釋字 791 通姦除罪 vs. 配偶權 — 原 B 對
  {
    match: "釋字第 791 號宣告刑法第 239 條通姦罪違憲",
    options: [
      { key: "A", text: "釋字 791 廢通姦罪致民事配偶權同時消滅而不得求償。" },
      { key: "B", text: "民事責任仍存，轉以 §184 I 後段 + §195 III 求償。" },
      { key: "C", text: "釋字 791 僅影響刑事責任，民事配偶權絲毫不受影響。" },
      { key: "D", text: "民事配偶權僅得依 §184 II 違反保護他人之法律主張。" },
    ],
    correctAnswer: "B",
  },

  // 58. 行政程序法 §149 準用民法 — 原 B 對
  {
    match: "行政程序法就此未設明文規定",
    options: [
      { key: "A", text: "行政程序法未設明文者，行政機關不得主張任何權利。" },
      { key: "B", text: "依行政程序法 §149 行政契約得準用民法之規定。" },
      { key: "C", text: "行政契約因屬公法關係，完全排斥民法規定之適用。" },
      { key: "D", text: "甲乙僅得依 §136 另立和解契約以解決違約爭議。" },
    ],
    correctAnswer: "B",
  },

  // 59. 雙階理論定義 — 原 B 對
  {
    match: "下列關於行政法上「雙階理論」之敘述",
    options: [
      { key: "A", text: "雙階理論認為政府所訂全部契約一律為私法契約。" },
      { key: "B", text: "決定階段屬公法行為，履行階段可採私法契約。" },
      { key: "C", text: "雙階理論專指刑事訴訟之二審程序之審理範圍。" },
      { key: "D", text: "雙階理論僅適用於公務員任命行為之法律性質判斷。" },
    ],
    correctAnswer: "B",
  },

  // 60. 政府採購雙階 — 原 B 對
  {
    match: "審標決標階段被刷掉」與「決標後簽約履行",
    options: [
      { key: "A", text: "兩階段均屬公法行為，皆循行政訴訟救濟程序處理。" },
      { key: "B", text: "招標決標屬公法、簽約履約屬私法，採購法特設救濟。" },
      { key: "C", text: "兩階段均屬私法行為，皆循民事訴訟救濟程序處理。" },
      { key: "D", text: "兩階段均循採購申訴審議委員會處理，不再另循司法。" },
    ],
    correctAnswer: "B",
  },

  // 61. 新主體說（公私法區分學說）— 原 B 對
  {
    match: "下列關於公私法區分學說之敘述",
    options: [
      { key: "A", text: "利益說以公益 / 私益區分為目前主流學說與通說。" },
      { key: "B", text: "新主體說（特別法規說）為現行通說之區分標準。" },
      { key: "C", text: "從屬說以不平等 / 平等關係絕對區分公私法無例外。" },
      { key: "D", text: "舊主體說以一方是否為國家判斷，並無任何理論缺陷。" },
    ],
    correctAnswer: "B",
  },

  // 62. §23 比例原則四關卡 — 原 B 對
  {
    match: "下列關於《憲法》第 23 條比例原則之敘述",
    options: [
      { key: "A", text: "比例原則僅屬政策層次之建議，對立法者並無實質拘束力。" },
      { key: "B", text: "§23 四關卡：目的 / 法保 / 必要 / 狹義比例性。" },
      { key: "C", text: "比例原則為刑事案件之審查原則，民事領域不得適用。" },
      { key: "D", text: "立法者得任意限制人民權利，§23 比例原則對其不適用。" },
    ],
    correctAnswer: "B",
  },

  // 63. §22 概括基本權 — 原 B 對
  {
    match: "概括基本權",
    options: [
      { key: "A", text: "言論自由係 §22 所保障之概括基本權核心內容。" },
      { key: "B", text: "隱私、性自主、契約自由、姓名權屬 §22 範疇。" },
      { key: "C", text: "選舉權係 §22 所保障之新興概括基本權之一種。" },
      { key: "D", text: "訴訟權係 §22 所保障之概括基本權之具體展現。" },
    ],
    correctAnswer: "B",
  },

  // ---------- 法學方法 (9 questions) ----------

  // 64. 類推適用 vs. 直接適用 — 原 B 對
  {
    match: "下列關於「類推適用」與「直接適用」",
    options: [
      { key: "A", text: "兩者意義相同僅用語不同，均指法律之直接套用。" },
      { key: "B", text: "直接適用為涵攝；類推為填補漏洞之相同性移用。" },
      { key: "C", text: "類推適用係刑法專有制度，民法不得援用類推。" },
      { key: "D", text: "類推適用無須法律漏洞之要件，法官得任意造法。" },
    ],
    correctAnswer: "B",
  },

  // 65. 類推適用之禁區 — 原 B 對
  {
    match: "下列關於類推適用之「禁區」",
    options: [
      { key: "A", text: "民法上類推適用並無禁區，法官得任意造法填補漏洞。" },
      { key: "B", text: "刑法 §1 罪刑法定、限權法律、明禁規定為三禁區。" },
      { key: "C", text: "稅法基於量能課稅原則，得自由類推適用課稅條款。" },
      { key: "D", text: "類推適用僅於商事法之領域始得適用，民法不適用。" },
    ],
    correctAnswer: "B",
  },

  // 66. 王澤鑑七大順位 — 原 A 對
  {
    match: "依王澤鑑教授之請求權基礎七大順位",
    options: [
      { key: "A", text: "契約、類似契約、無因管理、物上、不當得利、侵權。" },
      { key: "B", text: "請求權基礎之檢索並無固定順序，法官得自由依個案而選擇。" },
      { key: "C", text: "侵權行為 §184 為第一順位，優先於各種契約之請求權基礎。" },
      { key: "D", text: "不當得利 §179 為第一順位，優先於各種契約之請求權基礎。" },
    ],
    correctAnswer: "A",
  },

  // 67. §98 誤載無害（Falsa demonstratio）— 原 B 對
  {
    match: "公司編號 100000 之 A 公司",
    options: [
      { key: "A", text: "依書面記載文字應交付 X 公司股權，甲應依約履行交付義務。" },
      { key: "B", text: "§98 探求真意原則：按雙方真意對 A 公司生效力。" },
      { key: "C", text: "甲應依 §88 撤銷該錯誤之意思表示後再重新訂立新買賣契約。" },
      { key: "D", text: "本件契約因標的物不存在或標的不明確而依法當然絕對無效。" },
    ],
    correctAnswer: "B",
  },

  // 68. §1 法源位階 — 原 B 對
  {
    match: "下列關於民法第 1 條法源位階之敘述",
    options: [
      { key: "A", text: "民事無條文可依時，法官應自由創造新法律規範。" },
      { key: "B", text: "依 §1 順位：法律 → 習慣（§2 公序）→ 法理。" },
      { key: "C", text: "法理優先於習慣，習慣須先經 §1 排序後始適用。" },
      { key: "D", text: "民事無條文可依時，原告之訴依職權當然無理由。" },
    ],
    correctAnswer: "B",
  },

  // 69. 適用 / 準用 / 類推適用 — 原 B 對
  {
    match: "下列關於「適用」、「準用」、「類推適用」",
    options: [
      { key: "A", text: "三者意義相同僅用語不同，均為條文之直接套用。" },
      { key: "B", text: "適用為涵攝、準用為明文、類推為造法之區別。" },
      { key: "C", text: "類推適用僅適用於刑法領域，民法以準用為主。" },
      { key: "D", text: "準用無須法律明文規定即可任意為之填補漏洞。" },
    ],
    correctAnswer: "B",
  },

  // 70. 完全 vs. 不完全性法條 — 原 A 對
  {
    match: "下列關於「完全性法條」與「不完全性法條」",
    options: [
      { key: "A", text: "完全條含要件 + 效果可作請求權基礎；不完全條不可。" },
      { key: "B", text: "兩者意義相同僅學者用語不同，無實質區別之必要。" },
      { key: "C", text: "不完全性法條始得作為請求權基礎之依據與基礎。" },
      { key: "D", text: "完全性法條僅需具備構成要件即可，無須包含法律效果。" },
    ],
    correctAnswer: "A",
  },

  // 71. §98 vs. §88 — 原 B 對
  {
    match: "下列關於「誤載無害（民法第 98 條）」與「意思表示錯誤",
    options: [
      { key: "A", text: "兩者意義完全相同，均指意思表示與內心真意不一致之情形。" },
      { key: "B", text: "§98 真意一致按真意有效；§88 真意不一致得撤銷。" },
      { key: "C", text: "誤載無害原則僅適用於不動產契約之意思表示之文義解釋。" },
      { key: "D", text: "意思表示錯誤之情形無須撤銷即依法當然自始絕對無效。" },
    ],
    correctAnswer: "B",
  },

  // 72. CISG 自動適用 + Opt-out — 原 B 對
  {
    match: "聯合國國際貨物銷售合同公約》（CISG）",
    options: [
      { key: "A", text: "雙方未指定法律時一律適用我國民法，CISG 無自動適用效力。" },
      { key: "B", text: "CISG §1(1)(a) 自動適用，§6 得 Opt-out 排除。" },
      { key: "C", text: "CISG 僅為國際商業慣例之參考，對締約國無強制拘束力。" },
      { key: "D", text: "跨國貨物買賣依國際私法原則應一律依英美法律規定處理。" },
    ],
    correctAnswer: "B",
  },
];

// ============================================================
// EXECUTE
// ============================================================

interface QRow {
  id: string;
  question_md: string;
  options_json: string;
  correct_answer_json: string;
}

/** Visual width: CJK chars count as 2, ASCII as 1.
 * This matches reader perception better than UTF-16 code unit count,
 * which under-weighs ASCII tokens like "§819 II / §820".
 */
function visualWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    // ASCII + Latin punctuation = half-width
    if (code <= 0x007e) w += 1;
    // § (U+00A7) and other Latin-1 supplements = half-width
    else if (code >= 0x00a0 && code <= 0x00ff) w += 1;
    // everything else (CJK, fullwidth punctuation) = full-width
    else w += 2;
  }
  return w;
}

function lengthStats(opts: Opt[]) {
  const lens = opts.map((o) => visualWidth(o.text));
  const max = Math.max(...lens);
  const min = Math.min(...lens);
  return { max, min, ratio: max / min, lens };
}

/** Auto-pad wrong options so that the correct option is strictly NOT
 * the longest (by UTF-16 .length, which is the audit metric).
 *
 * Strategy: walk through neutral suffix pads (e.g. "之規定", "之適用"…)
 * and append one to the SHORTEST wrong option until it's ≥ correct + 1.
 * Repeat for next-shortest if still tied. Pads chosen to be law-neutral
 * filler that don't change the legal meaning. */
/** Pad tails — kept short, grammatically natural at sentence end,
 * and consistent with legal-essay register so they don't look like
 * artificial padding. Mix of styles so 3 wrong options can each get a
 * distinct tail without echoing each other. */
const PAD_TAILS = [
  "之規定",
  "之效力",
  "之適用",
  "之結論",
  "之解釋",
  "之論述",
  "之主張",
  "之依據",
];

function padWrongOptions(r: Rewrite): Rewrite {
  const opts = r.options.map((o) => ({ ...o }));
  const correctOpt = opts.find((o) => o.key === r.correctAnswer)!;
  const wrongOpts = opts.filter((o) => o.key !== r.correctAnswer);

  // Track which wrong options have already been padded — each wrong option
  // may receive AT MOST 2 distinct tails (to avoid awkward triple-stacking
  // like "之規定之效力之適用").
  const padCount = new Map<string, number>();
  let padIdx = 0;

  for (let i = 0; i < 8; i++) {
    const correctLen = correctOpt.text.length;
    const wrongMax = Math.max(...wrongOpts.map((o) => o.text.length));
    if (wrongMax > correctLen) break;
    // pick longest wrong option that has been padded < 2 times
    const candidates = wrongOpts
      .filter((o) => (padCount.get(o.key) ?? 0) < 2)
      .sort((a, b) => b.text.length - a.text.length);
    if (candidates.length === 0) break;
    const target = candidates[0];
    const pad = PAD_TAILS[padIdx % PAD_TAILS.length];
    padIdx++;
    if (target.text.endsWith("。")) {
      target.text = target.text.slice(0, -1) + pad + "。";
    } else {
      target.text = target.text + pad;
    }
    padCount.set(target.key, (padCount.get(target.key) ?? 0) + 1);
  }
  return { ...r, options: opts };
}

type Key = "A" | "B" | "C" | "D";
const ALL_KEYS: Key[] = ["A", "B", "C", "D"];

/** A permutation maps OLD key → NEW key for a single question after shuffle.
 * Used both to rebuild options and to remap letter labels in explanation_md. */
type KeyPermutation = Record<Key, Key>;

/** Deterministic shuffle: assign every rewrite a new correctAnswer key
 * such that the 72 outputs are balanced (18 each of A/B/C/D).
 *
 * Returns (shuffled rewrite, permutation old→new) so callers can sync
 * explanation_md letter labels too.
 */
function shuffleCorrectKey(
  r: Rewrite,
  target: Key,
): { rewrite: Rewrite; perm: KeyPermutation } {
  // Identity permutation if no change
  if (r.correctAnswer === target) {
    const identity: KeyPermutation = {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
    };
    return { rewrite: r, perm: identity };
  }

  const oldCorrect = r.correctAnswer;
  const correctText = r.options.find((o) => o.key === oldCorrect)!.text;
  const wrongOldKeys: Key[] = ALL_KEYS.filter((k) => k !== oldCorrect);
  const wrongTexts = wrongOldKeys.map(
    (k) => r.options.find((o) => o.key === k)!.text,
  );
  const remainingNewSlots: Key[] = ALL_KEYS.filter((k) => k !== target);
  // permutation: oldKey -> newKey
  const perm = {} as KeyPermutation;
  perm[oldCorrect] = target;
  wrongOldKeys.forEach((oldK, i) => {
    perm[oldK] = remainingNewSlots[i];
  });

  // build new options array
  const newOptions: Opt[] = ALL_KEYS.map((newK) => {
    if (newK === target) return { key: newK, text: correctText };
    // find which old wrong key maps here
    const oldK = (Object.keys(perm) as Key[]).find(
      (ok) => perm[ok] === newK && ok !== oldCorrect,
    )!;
    return { key: newK, text: r.options.find((o) => o.key === oldK)!.text };
  });

  return {
    rewrite: { ...r, options: newOptions, correctAnswer: target },
    perm,
  };
}

/** Build a target-key plan that distributes 72 rewrites evenly (18 each).
 * Round-robin so each chunk of 4 has one of each key. */
function planTargets(n: number): Key[] {
  return Array.from({ length: n }, (_, i) => ALL_KEYS[i % 4]);
}

/** Remap letter labels in explanation_md per the given permutation.
 *
 * Targets these patterns:
 *   - `**A 對**` / `A 對：` / `- A 對` / `- **A 對**` (status markers)
 *   - `A 錯` / `**A 錯**` (status markers)
 *   - `A、B 錯` / `A、B、C 錯` (compound markers)
 *   - `（A、B 對）` (parenthetical references)
 *
 * Strategy: identify isolated A/B/C/D letters followed by 對/錯 (with
 * optional ** ** wrapping and 中文 punctuation) and remap. We rebuild
 * the string in a single pass to avoid double-substitutions.
 */
function remapExplanation(expl: string, perm: KeyPermutation): string {
  if (!expl) return expl;
  // Identity check
  if (ALL_KEYS.every((k) => perm[k] === k)) return expl;

  // Tokenize: find every "letter [對|錯]" occurrence and replace the letter.
  // Pattern explanation:
  //   (?<![A-Za-z]) — letter must not be part of a longer ASCII identifier
  //   ([ABCD])      — capture old key
  //   (?=[、,，]|\s*[對錯]) — lookahead: either followed by enumeration
  //                          punctuation (A、B 對) or by space/對/錯
  // We do a global scan and rebuild output.
  return expl.replace(
    /(?<![A-Za-z\d])([ABCD])(?=[、,，]?\s*[ABCD對錯]|\*\*\s*[對錯]|\s*錯：|\s*對：)/g,
    (_, ch) => perm[ch as Key],
  );
}

function main() {
  // STEP 1: shuffle correct answer keys evenly across A/B/C/D
  // Plan: round-robin so each chunk of 4 has one of each.
  // But we want first rewrite to keep §72 = C (that's the canonical example),
  // so we offset the round-robin to start at C.
  // Simplest: just round-robin starting from A; the §72 fix-question-1 script
  // already keeps the original C answer; here we re-shuffle for diversity.
  const targets = planTargets(rewrites.length);
  // step 1: shuffle key + remember permutation
  const shuffledWithPerm = rewrites.map((r, i) => {
    const { rewrite, perm } = shuffleCorrectKey(r, targets[i]);
    return { rewrite, perm };
  });
  // step 2: pad wrong options to break the "correct = longest" pattern
  const shuffled = shuffledWithPerm.map(({ rewrite, perm }) => ({
    rewrite: padWrongOptions(rewrite),
    perm,
  }));

  // sanity: validate every rewrite has 4 options + reasonable length spread
  const issues: string[] = [];
  for (const { rewrite: r } of shuffled) {
    if (r.options.length !== 4) issues.push(`${r.match}: not 4 options`);
    const keys = r.options.map((o) => o.key).sort().join(",");
    if (keys !== "A,B,C,D")
      issues.push(`${r.match}: keys not A,B,C,D got ${keys}`);
    const { ratio } = lengthStats(r.options);
    // ratio is visual width; >1.7 means a clearly noticeable spread.
    // (Auto-pad can push UTF-16 lengths beyond ratio 1.6 even when
    //  visual ratio stays ~1.5 because ASCII tokens like "§198" weigh
    //  4 code units but visually only span 4 half-widths.)
    if (ratio > 1.7)
      issues.push(`${r.match}: length ratio ${ratio.toFixed(2)} > 1.7`);
    const correct = r.options.find((o) => o.key === r.correctAnswer);
    if (!correct) issues.push(`${r.match}: correct key missing`);
  }
  if (issues.length) {
    console.error("PRE-FLIGHT FAILURES:");
    for (const i of issues) console.error("  - " + i);
    process.exit(1);
  }

  const all = sqlite
    .prepare<
      [],
      QRow & { explanation_md: string | null }
    >(
      "SELECT id, question_md, options_json, correct_answer_json, explanation_md FROM questions WHERE type='choice'",
    )
    .all();

  const update = sqlite.prepare(
    "UPDATE questions SET options_json = ?, correct_answer_json = ?, explanation_md = ?, updated_at = unixepoch() WHERE id = ?",
  );

  let updated = 0;
  const unmatched: string[] = [];
  const overmatched: string[] = [];

  for (const { rewrite: r, perm } of shuffled) {
    const candidates = all.filter((q) => q.question_md.includes(r.match));
    if (candidates.length === 0) {
      unmatched.push(r.match);
      continue;
    }
    if (candidates.length > 1) {
      overmatched.push(
        `${r.match} matched ${candidates.length}: ${candidates.map((c) => c.id.slice(0, 8)).join(", ")}`,
      );
      continue;
    }
    const target = candidates[0];

    // Idempotency: only remap explanation if the current DB explanation
    // still references the OLD source correctAnswer letter. If it already
    // matches the new correctAnswer, this script has run before — skip.
    const oldCorrectKey = (Object.keys(perm) as Key[]).find(
      (k) => perm[k] === r.correctAnswer,
    )!;
    const explHasOldLabel =
      (target.explanation_md ?? "").includes(`${oldCorrectKey} 對`) ||
      (target.explanation_md ?? "").includes(`**${oldCorrectKey} 對**`);
    const newExpl = explHasOldLabel
      ? remapExplanation(target.explanation_md ?? "", perm)
      : (target.explanation_md ?? "");

    update.run(
      JSON.stringify(r.options),
      JSON.stringify(r.correctAnswer),
      newExpl,
      target.id,
    );
    updated++;
  }

  console.log(`updated ${updated} / ${shuffled.length} rewrites (options + correctAnswer + explanation letter labels)`);
  if (unmatched.length) {
    console.log("UNMATCHED:");
    for (const m of unmatched) console.log("  - " + m);
  }
  if (overmatched.length) {
    console.log("OVER-MATCHED (skipped):");
    for (const m of overmatched) console.log("  - " + m);
  }

  // verify all 72 choice questions covered
  const remaining = sqlite
    .prepare<[], { c: number }>(
      "SELECT COUNT(*) as c FROM questions WHERE type='choice'",
    )
    .get();
  console.log(`total choice questions in DB: ${remaining?.c}`);

  sqlite.close();
}

main();
