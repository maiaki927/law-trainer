# law-trainer (MVP)

民法 / 刑法練習網站本地開發版本。

## Stack
- Next.js 15 App Router + TypeScript + React 19
- TailwindCSS 3（自製 shadcn 風格 UI primitives）
- next-auth v5 Credentials（JWT cookie session）
- Drizzle ORM + better-sqlite3（schema 可切換 Postgres）
- react-markdown + remark-gfm + 自製 `remarkLawLink` plugin（民法 / 刑法 / 釋字 / 最高法院判決自動超連結）

## Quickstart

```bash
cd /Users/mai/Desktop/law-trainer

# 1. 安裝（已安裝可跳過）
npm install --legacy-peer-deps

# 2. 已備妥 .env.local，包含隨機 AUTH_SECRET、DATABASE_URL=data/dev.sqlite
#    若刪掉可參考 .env.local.example 重建

# 3. 建立資料庫 schema + seed 題庫
npm run db:migrate    # 從 drizzle/ 套用 migration
npm run db:seed       # 8 章節 + 8 選擇題 + 2 申論題 + admin user

# 4. 開發
npm run dev           # http://localhost:3000
```

## Demo flow

1. http://localhost:3000 — 首頁，民法卡片可點，刑法 disabled
2. http://localhost:3000/subjects/civil — 8 章節 grid
3. http://localhost:3000/subjects/civil/general — 民法總則 mode 選擇
4. http://localhost:3000/subjects/civil/general/practice?mode=all — 答題
5. 註冊測試帳號：`/register`
6. 已內建 admin：
   - email: `admin@example.com`
   - password: `admin123456`
   - 登入後可進 `/admin/feedback` 與 `/admin/questions`
7. 浮動按鈕（右下）：意見回饋 modal，提交後寫入 `feedback` table

## DB
- 本地 SQLite 檔：`data/dev.sqlite`（已 gitignore）
- 切換 Postgres：改 `drizzle.config.ts` dialect + `src/lib/db/client.ts`，schema 為 SQLite/Postgres 兼容寫法

## Scripts
- `npm run dev` — Next dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `next lint`
- `npm run db:generate` — drizzle-kit 從 schema 產 migration
- `npm run db:migrate` — 套用 migration
- `npm run db:seed` — 寫入 subjects / topics / sample questions / admin user

## 已知 limitation
- 刑法 subject 在 schema 標 `draft`，題庫尚未建
- 申論題目前用「對照詳解後自評」回報是否答對，無自動評分
- 答錯題複習頁面僅列題目片段，未顯示完整詳解（按鈕導去 wrong-mode practice）
- Markdown 法條 link 中，`§N` 預設視為民法；若上下文為刑法需另指明（目前題庫中刑法已直寫「刑法第 N 條」）
- 尚未做 admin 編輯題目 form，僅能切換 status
