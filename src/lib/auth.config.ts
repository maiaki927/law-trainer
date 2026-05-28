import type { NextAuthConfig } from "next-auth";

// 這個 config 不能 import 任何 node-only 模組 (better-sqlite3、bcrypt 等)
// 給 middleware (edge runtime) 與 server (node runtime) 共用
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [], // middleware 只需要 session callback，實際 provider 在 auth.ts
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.role = (user as { role: "user" | "admin" }).role;
        token.displayName = (user as { displayName?: string }).displayName;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.uid) session.user.id = token.uid as string;
      if (token.role) session.user.role = token.role as "user" | "admin";
      if (token.displayName) {
        session.user.displayName = token.displayName as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
