import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import fs from "node:fs";

// 同 src/lib/db/client.ts 的 URL normalisation：bare path → file: URL、
// file:/ libsql:// 原封不動。
const raw = process.env.DATABASE_URL ?? "data/dev.sqlite";
const url = raw.startsWith("libsql:") || raw.startsWith("file:")
  ? raw
  : (() => {
      const abs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      return `file:${abs}`;
    })();

async function main() {
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  console.log("migration complete");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
