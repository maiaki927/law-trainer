"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

export interface SavedRow {
  questionId: string;
  topicSlug: string;
  topicName: string;
  difficulty: number;
  preview: string;
  savedAt: string;
}

function formatSavedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SavedList({ items }: { items: SavedRow[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [deleting, setDeleting] = React.useState(false);

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && selected.size < items.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((it) => it.questionId)));
    }
  };

  const toggleOne = (qid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/save", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: Array.from(selected) }),
      });
      if (!res.ok) {
        push("刪除失敗，請稍後再試");
        return;
      }
      const data = (await res.json()) as { deleted: number };
      push(`已刪除 ${data.deleted} 題收藏`);
      setSelected(new Set());
      router.refresh();
    } catch {
      push("刪除失敗，請稍後再試");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold sm:text-3xl">收藏題目</h1>
        <p className="text-sm text-muted-foreground">
          共 {items.length} 題已收藏
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/practice/saved-all">
            <Button size="lg">
              <b>練習收藏的題目</b>
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-y py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAll}
          disabled={items.length === 0}
        >
          {allSelected ? "取消全選" : "全選"}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={deleteSelected}
          disabled={selected.size === 0 || deleting}
        >
          {deleting ? "刪除中..." : <><b>刪除收藏</b> ({selected.size})</>}
        </Button>
        {someSelected && (
          <span className="text-xs text-muted-foreground">
            已選 {selected.size} / {items.length}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {items.map((it) => {
          const checked = selected.has(it.questionId);
          return (
            <Card key={it.questionId}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <label
                    htmlFor={`saved-${it.questionId}`}
                    className="mt-1 cursor-pointer"
                  >
                    <Checkbox
                      id={`saved-${it.questionId}`}
                      checked={checked}
                      onCheckedChange={() => toggleOne(it.questionId)}
                    />
                  </label>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{it.topicName}</Badge>
                      <Badge variant="outline">難度 {it.difficulty}</Badge>
                      <span className="text-xs text-muted-foreground">
                        收藏於 {formatSavedAt(it.savedAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{it.preview}</p>
                  </div>
                </div>
                <Link
                  href={`/subjects/civil/${it.topicSlug}/practice?mode=saved`}
                >
                  <Button size="sm">練此章收藏</Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
