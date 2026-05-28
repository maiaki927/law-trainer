import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SearchParams {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({ searchParams }: SearchParams) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  async function register(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();

    if (!email || !password || !displayName) {
      redirect("/register?error=missing");
    }
    if (password.length < 6) {
      redirect("/register?error=short");
    }

    const exists = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (exists) redirect("/register?error=exists");

    const hash = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      id: uuid(),
      email,
      passwordHash: hash,
      displayName,
      role: "user",
    });

    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  }

  const errorMap: Record<string, string> = {
    missing: "請填寫所有欄位",
    short: "密碼至少 6 碼",
    exists: "此 Email 已註冊",
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>註冊</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={register} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="displayName">顯示名稱</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">帳號</Label>
              <Input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">密碼（至少 6 碼）</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">
                {errorMap[error] ?? "註冊失敗"}
              </p>
            )}
            <Button type="submit" className="w-full">
              建立帳號
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              已有帳號？{" "}
              <Link href="/login" className="underline">
                登入
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
