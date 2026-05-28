/**
 * Sync seed.ts with current DB state for type='choice' questions.
 *
 * Strategy: for each choice question in DB, find the seed.ts block that
 * starts with `questionMd: "..."` matching the first ~40 chars of the
 * question, then surgically replace:
 *   - `options: [...]`
 *   - `correctAnswer: "X"`
 *   - `explanationMd: "..."` (because letter labels A/B/C/D inside the
 *     explanation were remapped after the correctAnswer shuffle, and
 *     keeping seed.ts in sync ensures `npm run db:seed` reproduces the
 *     same content)
 *
 * We do NOT touch references, type, difficulty, source.
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbFile = process.env.DATABASE_URL ?? "data/dev.sqlite";
const absPath = path.isAbsolute(dbFile)
  ? dbFile
  : path.join(process.cwd(), dbFile);
const seedFile = path.join(process.cwd(), "scripts", "seed.ts");

const sqlite = new Database(absPath, { readonly: true });

interface QRow {
  question_md: string;
  options_json: string;
  correct_answer_json: string;
  explanation_md: string | null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escape replacement string for String.replace — `$` has special meaning
 * in replacement contexts ($&, $1, $`, $'…). We use $$$$ to emit a literal $. */
function escapeReplacement(s: string): string {
  return s.replace(/\$/g, "$$$$");
}

function formatOptionsAsTs(opts: { key: string; text: string }[]): string {
  // 6-space indent matches existing seed.ts style (inside `options: [`)
  const inner = opts
    .map((o) => `        { key: "${o.key}", text: ${JSON.stringify(o.text)} },`)
    .join("\n");
  return `[\n${inner}\n      ]`;
}

function main() {
  const rows = sqlite
    .prepare<[], QRow>(
      "SELECT question_md, options_json, correct_answer_json, explanation_md FROM questions WHERE type='choice'",
    )
    .all();

  let seed = fs.readFileSync(seedFile, "utf-8");
  let updated = 0;
  let unmatched = 0;
  const skips: string[] = [];

  for (const r of rows) {
    const opts = JSON.parse(r.options_json) as { key: string; text: string }[];
    const correct = JSON.parse(r.correct_answer_json) as string;
    const explanation = r.explanation_md ?? "";

    // Match a `questionMd:` line containing the first ~40 chars of the question.
    // The original question_md may contain quotes/parens; we use a short
    // identifying prefix to avoid regex pitfalls.
    const fingerprint = r.question_md.slice(0, 40);
    const fpEsc = escapeRegex(fingerprint);

    // Find a block of pattern:
    //   questionMd:\n        "<contains fingerprint>",\n
    //     options: [ ... ],\n
    //     correctAnswer: "X",\n
    //     explanationMd:\n        "..."
    // capture groups: 1 = preamble through "options: ", 2 = ",\n correctAnswer: ",
    //                 3 = ",\n explanationMd:\n  " (and the opening quote)
    const questionRe = new RegExp(
      `(questionMd:\\s*\\n\\s*"[^"]*${fpEsc}[^"]*",[\\s\\S]*?options:\\s*)\\[[\\s\\S]*?\\](,\\s*\\n\\s*correctAnswer:\\s*)"[A-D]"(,\\s*\\n\\s*explanationMd:\\s*\\n?\\s*)"[^"]*"`,
      "m",
    );

    const m = seed.match(questionRe);
    if (!m) {
      // try a one-line questionMd variant
      const altRe = new RegExp(
        `(questionMd:\\s*"[^"]*${fpEsc}[^"]*",\\s*\\n\\s*options:\\s*)\\[[\\s\\S]*?\\](,\\s*\\n\\s*correctAnswer:\\s*)"[A-D]"(,\\s*\\n\\s*explanationMd:\\s*\\n?\\s*)"[^"]*"`,
        "m",
      );
      const m2 = seed.match(altRe);
      if (!m2) {
        unmatched++;
        skips.push(fingerprint);
        continue;
      }
      const newOptionsBlock = formatOptionsAsTs(opts);
      const newExplLit = JSON.stringify(explanation);
      const replacement = escapeReplacement(
        `${m2[1]}${newOptionsBlock}${m2[2]}"${correct}"${m2[3]}${newExplLit}`,
      );
      seed = seed.replace(altRe, replacement);
      updated++;
      continue;
    }

    const newOptionsBlock = formatOptionsAsTs(opts);
    const newExplLit = JSON.stringify(explanation);
    const replacement = escapeReplacement(
      `${m[1]}${newOptionsBlock}${m[2]}"${correct}"${m[3]}${newExplLit}`,
    );
    seed = seed.replace(questionRe, replacement);
    updated++;
  }

  fs.writeFileSync(seedFile, seed, "utf-8");
  console.log(`seed.ts synced: ${updated} updated, ${unmatched} unmatched`);
  if (skips.length) {
    for (const s of skips) console.log("  unmatched: " + s);
  }
  sqlite.close();
}

main();
