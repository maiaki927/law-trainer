import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-bold sm:text-3xl">法學練習站</h1>
        <p className="text-muted-foreground">
          選擇科目開始練習，目前提供民法章節題目。
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/subjects/civil" className="block">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                民法
                <Badge variant="secondary">8 章節</Badge>
              </CardTitle>
              <CardDescription>
                總則 / 債編 / 契約 / 物權 / 親屬 / 繼承 / 公私法區分 / 法學方法
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              點擊進入章節列表，可選全部 / 隨機 / 答錯複習等模式。
            </CardContent>
          </Card>
        </Link>

        <div className="block cursor-not-allowed">
          <Card className="h-full opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                刑法
                <Badge variant="outline">Coming soon</Badge>
              </CardTitle>
              <CardDescription>規劃中</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              題庫建置中，敬請期待。
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
