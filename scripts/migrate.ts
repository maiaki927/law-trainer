import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";

const dbFile = process.env.DATABASE_URL ?? "data/dev.sqlite";
const absPath = path.isAbsolute(dbFile)
  ? dbFile
  : path.join(process.cwd(), dbFile);

fs.mkdirSync(path.dirname(absPath), { recursive: true });

const sqlite = new Database(absPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

console.log("migration complete");
sqlite.close();
