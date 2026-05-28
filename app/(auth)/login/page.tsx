import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthError } from "next-auth";

interface SearchParams {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: SearchParams) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error, callbackUrl } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirectTo: "/",
      });
    } catch (e) {
      if (e instanceof AuthError) {
        redirect("/login?error=invalid");
      }
      throw e;
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>登入</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
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
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">帳號或密碼錯誤</p>
            )}
            <Button type="submit" className="w-full">
              登入
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              還沒有帳號？{" "}
              <Link href="/register" className="underline">
                註冊
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
