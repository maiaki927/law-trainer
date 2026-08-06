import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

// DATABASE_URL 三種形態同時支援，讓 dev / preview / prod 用同一份 client：
//   1. bare relative path e.g. "data/dev.sqlite"        → 舊 .env.local，補成 file: URL 讀本地 SQLite
//   2. "file:./data/dev.sqlite" / "file:/abs/path"      → libSQL 原生 file URL
//   3. "libsql://…turso.io" (+ DATABASE_AUTH_TOKEN)     → 連 Turso 遠端
const raw = process.env.DATABASE_URL ?? "data/dev.sqlite";
const url = raw.startsWith("libsql:") || raw.startsWith("file:")
  ? raw
  : (() => {
      const abs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      return `file:${abs}`;
    })();

const globalForDb = globalThis as unknown as { libsql?: Client };
const client = globalForDb.libsql ?? createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.libsql = client;
}

export const db = drizzle(client, { schema });
export { schema };
