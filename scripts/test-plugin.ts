import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { remarkLawLink } from "../src/lib/markdown/law-link-plugin";

const samples = [
  "依民法第 72 條，違反公序良俗無效。",
  "見 §179 不當得利。",
  "刑法第 271 條規定殺人罪。",
  "釋字第 748 號解釋意旨。",
  "最高法院 100 年度台上字第 100 號判決。",
  "民法第 1073-1 條收養禁止。",
];

const processor = unified()
  .use(remarkParse)
  .use(remarkLawLink)
  .use(remarkStringify);

for (const s of samples) {
  const out = String(processor.processSync(s)).trim();
  console.log("IN :", s);
  console.log("OUT:", out);
  console.log();
}
