import { visit, SKIP } from "unist-util-visit";
import type { Root, Text, PhrasingContent } from "mdast";

// 民法 Pcode = B0000001
// 刑法 Pcode = C0000001
const CIVIL_PCODE = "B0000001";
const CRIMINAL_PCODE = "C0000001";

export type LawSubject = "civil" | "criminal";

const lawSingleUrl = (pcode: string, flno: string) =>
  `https://law.moj.gov.tw/LawClass/LawSingle.aspx?Pcode=${pcode}&FLNO=${flno}`;

const interpretationUrl = (n: string) =>
  `https://cons.judicial.gov.tw/docdata.aspx?fid=38&id=${n}`;

const judgmentSearchUrl = (q: string) =>
  `https://judgment.judicial.gov.tw/FJUD/Default_AD.aspx?q=${encodeURIComponent(q)}`;

interface MatchHit {
  start: number;
  end: number;
  url: string;
  label: string;
}

function findHits(text: string, subject: LawSubject): MatchHit[] {
  const hits: MatchHit[] = [];
  const subjectDefaultPcode = subject === "criminal" ? CRIMINAL_PCODE : CIVIL_PCODE;

  // 民法第 X 條 (含 -N)
  const civilArt = /民法第\s*(\d+(?:-\d+)?)\s*條/g;
  for (const m of text.matchAll(civilArt)) {
    if (m.index === undefined) continue;
    hits.push({
      start: m.index,
      end: m.index + m[0].length,
      url: lawSingleUrl(CIVIL_PCODE, m[1]),
      label: m[0],
    });
  }

  // 刑法第 X 條
  const crimArt = /刑法第\s*(\d+(?:-\d+)?)\s*條/g;
  for (const m of text.matchAll(crimArt)) {
    if (m.index === undefined) continue;
    hits.push({
      start: m.index,
      end: m.index + m[0].length,
      url: lawSingleUrl(CRIMINAL_PCODE, m[1]),
      label: m[0],
    });
  }

  // §X — Pcode 由 subject context 決定（criminal → 刑法 / civil → 民法）
  const para = /§\s*(\d+(?:-\d+)?)/g;
  for (const m of text.matchAll(para)) {
    if (m.index === undefined) continue;
    // 避免跟前面的 民法第 X 條 / 刑法第 X 條 重疊
    const overlap = hits.some(
      (h) => m.index! >= h.start && m.index! < h.end
    );
    if (overlap) continue;
    hits.push({
      start: m.index,
      end: m.index + m[0].length,
      url: lawSingleUrl(subjectDefaultPcode, m[1]),
      label: m[0],
    });
  }

  // 釋字第 N 號
  const interp = /釋字第\s*(\d+)\s*號/g;
  for (const m of text.matchAll(interp)) {
    if (m.index === undefined) continue;
    hits.push({
      start: m.index,
      end: m.index + m[0].length,
      url: interpretationUrl(m[1]),
      label: m[0],
    });
  }

  // 最高法院 NN 年(度) 台上字第 NN 號
  const judg = /最高法院\s*\d+\s*年(?:度)?台上字第\s*\d+\s*號/g;
  for (const m of text.matchAll(judg)) {
    if (m.index === undefined) continue;
    hits.push({
      start: m.index,
      end: m.index + m[0].length,
      url: judgmentSearchUrl(m[0]),
      label: m[0],
    });
  }

  hits.sort((a, b) => a.start - b.start);
  // 移除重疊（保留最先出現）
  const filtered: MatchHit[] = [];
  let cursor = -1;
  for (const h of hits) {
    if (h.start >= cursor) {
      filtered.push(h);
      cursor = h.end;
    }
  }
  return filtered;
}

export function remarkLawLink(subject: LawSubject = "civil") {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      // 已經在 link 內就跳過，避免巢狀
      if (parent.type === "link") return;

      const hits = findHits(node.value, subject);
      if (hits.length === 0) return;

      const newNodes: PhrasingContent[] = [];
      let last = 0;
      for (const h of hits) {
        if (h.start > last) {
          newNodes.push({
            type: "text",
            value: node.value.slice(last, h.start),
          });
        }
        newNodes.push({
          type: "link",
          url: h.url,
          title: null,
          children: [{ type: "text", value: h.label }],
        });
        last = h.end;
      }
      if (last < node.value.length) {
        newNodes.push({ type: "text", value: node.value.slice(last) });
      }

      parent.children.splice(index, 1, ...newNodes);
      return [SKIP, index + newNodes.length];
    });
  };
}
