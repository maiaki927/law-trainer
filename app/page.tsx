import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-bold sm:text-3xl">法學練習站</h1>
        <p className="text-muted-foreground">
          選擇科目開始練習，目前提供民法及刑法章節題目。
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <Link href="/subjects/civil-tutorial" className="block">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                民法課輔
                <Badge variant="secondary">5 章節</Badge>
              </CardTitle>
              <CardDescription>
                依課輔課程錄音整理的補充題庫，與民法正課分開練習。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              點擊進入章節列表，可選全部 / 隨機 / 答錯複習等模式。
            </CardContent>
          </Card>
        </Link>

        <Link href="/subjects/criminal" className="block">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                刑法
                <Badge variant="secondary">11 章節</Badge>
              </CardTitle>
              <CardDescription>
                基礎理論 / 犯罪論體系 / 構成要件 / 階段論 / 客觀處罰條件 / 違法性 / 錯誤論 / 有責性 / 正犯共犯 / 罪數 / 適用範圍
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              點擊進入章節列表，可選全部 / 隨機 / 答錯複習等模式。
            </CardContent>
          </Card>
        </Link>

        <Link href="/subjects/criminal-tutorial" className="block">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                刑法課輔
                <Badge variant="secondary">10 章節</Badge>
              </CardTitle>
              <CardDescription>
                依課輔課程錄音整理的補充題庫，與刑法正課分開練習。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              點擊進入章節列表，可選全部 / 隨機 / 答錯複習等模式。
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
