import type { Config } from "drizzle-kit";

// drizzle-kit turso dialect 讀 libSQL / Turso：
//   - 本地 dev：DATABASE_URL=file:./data/dev.sqlite (bare "data/dev.sqlite" 也接受)
//   - 遠端 prod：DATABASE_URL=libsql://…turso.io + DATABASE_AUTH_TOKEN=…
const raw = process.env.DATABASE_URL ?? "data/dev.sqlite";
const url =
  raw.startsWith("libsql:") || raw.startsWith("file:") ? raw : `file:${raw}`;

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
