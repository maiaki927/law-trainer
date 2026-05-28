import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "user" | "admin";
      displayName: string;
    } & DefaultSession["user"];
  }
}

const credSchema = z.object({
  email: z.string().min(1).max(200),
  password: z.string().min(6).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (raw) => {
        const parsed = credSchema.safeParse(raw);
        if (!parsed.success) return null;

        const row = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email.toLowerCase()),
        });
        if (!row) return null;

        const ok = await bcrypt.compare(parsed.data.password, row.passwordHash);
        if (!ok) return null;

        return {
          id: row.id,
          email: row.email,
          name: row.displayName,
          role: row.role,
          displayName: row.displayName,
        };
      },
    }),
  ],
});
