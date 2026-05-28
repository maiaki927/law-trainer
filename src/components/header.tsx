import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          法學練習站
        </Link>
        <nav className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link href="/me" className="text-sm hover:underline">
                {session.user.displayName ?? session.user.name}
              </Link>
              {session.user.role === "admin" && (
                <Link href="/admin/feedback" className="text-sm hover:underline">
                  管理
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button variant="ghost" size="sm" type="submit">
                  登出
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  登入
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">註冊</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
