"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/ui/toast";

export interface PracticeQuestion {
  id: string;
  topicSlug: string;
  topicId: string;
  type: "choice" | "multi" | "essay";
  questionMd: string;
  options: { key: string; text: string }[];
  correctAnswer: string | string[] | null;
  explanationMd: string;
  references: { label: string; url: string }[];
  difficulty: number;
  source: string | null;
}

interface Props {
  topicName: string;
  topicSlug: string;
  mode: string;
  questions: PracticeQuestion[];
  isLoggedIn: boolean;
  // 跨章節模式：自訂結束頁、回到指定路徑、隱藏 breadcrumb 中的章節
  exitHref?: string;
  exitLabel?: string;
  finishedLabel?: string;
  hideTopicBreadcrumb?: boolean;
  title?: string;
  // 進場時已知的「已收藏題目 id」清單 — server-side props 傳入可省一次 fetch
  initialSavedIds?: string[];
}

export function PracticeRunner({
  topicName,
  topicSlug,
  mode,
  questions,
  isLoggedIn,
  exitHref,
  exitLabel,
  finishedLabel,
  hideTopicBreadcrumb = false,
  title,
  initialSavedIds,
}: Props) {
  const [idx, setIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [singleAns, setSingleAns] = React.useState<string>("");
  const [multiAns, setMultiAns] = React.useState<string[]>([]);
  const [essayAns, setEssayAns] = React.useState("");
  const [startedAt, setStartedAt] = React.useState<number>(() => Date.now());
  // 統計：scored = 計分題數 (選擇 / 複選)；correct = 答對數；essays = 申論題已答數
  const [stats, setStats] = React.useState({
    correct: 0,
    scored: 0,
    essays: 0,
  });
  const { push } = useToast();

  // 收藏狀態 — 用 Set 存 questionId
  const [savedIds, setSavedIds] = React.useState<Set<string>>(
    () => new Set(initialSavedIds ?? [])
  );
  const [savingToggle, setSavingToggle] = React.useState(false);

  // 進場後若沒拿到 initialSavedIds 且已登入 → client 拉一次
  const fetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (fetchedRef.current) return;
    if (!isLoggedIn) return;
    if (initialSavedIds !== undefined) return; // server 已給
    fetchedRef.current = true;
    const ids = questions.map((q) => q.id);
    if (ids.length === 0) return;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("questionIds", ids.join(","));
        const res = await fetch(`/api/save?${params.toString()}`, {
          method: "GET",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { saved: string[] };
        if (Array.isArray(data.saved)) {
          setSavedIds(new Set(data.saved));
        }
      } catch {
        // ignore
      }
    })();
  }, [isLoggedIn, initialSavedIds, questions]);

  const q = questions[idx];

  // 把 ctx 給 floating feedback button
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.__feedbackCtx = { topicSlug, questionId: q?.id };
    }
    return () => {
      if (typeof window !== "undefined") window.__feedbackCtx = {};
    };
  }, [q?.id, topicSlug]);

  const toggleSave = async () => {
    if (!q || !isLoggedIn || savingToggle) return;
    const wasSaved = savedIds.has(q.id);
    // optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
    setSavingToggle(true);
    try {
      const res = await fetch("/api/save", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [q.id] }),
      });
      if (!res.ok) {
        // rollback
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(q.id);
          else next.delete(q.id);
          return next;
        });
        push("收藏更新失敗");
        return;
      }
      push(wasSaved ? "已取消收藏" : "已加入收藏");
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(q.id);
        else next.delete(q.id);
        return next;
      });
      push("收藏更新失敗");
    } finally {
      setSavingToggle(false);
    }
  };

  if (!q) return null;

  const isSaved = savedIds.has(q.id);

  const isCorrectChoice = (): boolean => {
    if (q.type === "choice") {
      return singleAns === q.correctAnswer;
    }
    if (q.type === "multi") {
      const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
      if (correct.length !== multiAns.length) return false;
      return correct.every((c) => multiAns.includes(c));
    }
    return false;
  };

  const submit = async () => {
    if (q.type === "choice" && !singleAns) {
      push("請選擇答案");
      return;
    }
    if (q.type === "multi" && multiAns.length === 0) {
      push("請至少選一個");
      return;
    }
    // 申論題：textarea 為空也允許「看答案」，不強制要寫；但給輕量提示
    if (q.type === "essay" && essayAns.trim().length === 0) {
      // 允許但不阻擋
    }

    const timeSpentS = Math.floor((Date.now() - startedAt) / 1000);
    setRevealed(true);

    if (q.type === "essay") {
      setStats((s) => ({ ...s, essays: s.essays + 1 }));
    } else {
      const ok = isCorrectChoice();
      setStats((s) => ({
        ...s,
        scored: s.scored + 1,
        correct: s.correct + (ok ? 1 : 0),
      }));
    }

    if (isLoggedIn) {
      try {
        await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: q.id,
            answer:
              q.type === "essay"
                ? { text: essayAns }
                : q.type === "multi"
                ? multiAns
                : singleAns,
            // 申論題不計對錯 → 送 null
            isCorrect: q.type === "essay" ? null : isCorrectChoice(),
            timeSpentS,
          }),
        });
      } catch {
        // silently ignore
      }
    }
  };

  const next = () => {
    setRevealed(false);
    setSingleAns("");
    setMultiAns([]);
    setEssayAns("");
    setStartedAt(Date.now());
    setIdx((i) => i + 1);
  };

  const finished = idx >= questions.length - 1 && revealed;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">首頁</Link> /{" "}
            <Link href="/subjects/civil" className="hover:underline">民法</Link>
            {hideTopicBreadcrumb ? (
              <> / 練習 ({mode})</>
            ) : (
              <>
                {" "}
                /{" "}
                <Link
                  href={`/subjects/civil/${topicSlug}`}
                  className="hover:underline"
                >
                  {topicName}
                </Link>{" "}
                / 練習 ({mode})
              </>
            )}
          </p>
          <h1 className="text-xl font-bold sm:text-2xl">
            {title ?? `${topicName} · 練習`}
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          進度 {idx + 1} / {questions.length} · 選擇正確 {stats.correct} /{" "}
          {stats.scored}
          {stats.essays > 0 && <> · 申論 {stats.essays}</>}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-lg">
            <span>第 {idx + 1} 題</span>
            <div className="flex items-center gap-1">
              <Badge variant="outline">
                {q.type === "choice"
                  ? "單選"
                  : q.type === "multi"
                  ? "複選"
                  : "申論"}
              </Badge>
              <Badge variant="secondary">難度 {q.difficulty}</Badge>
              {isLoggedIn && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSave}
                  disabled={savingToggle}
                  aria-label={isSaved ? "取消收藏" : "收藏題目"}
                  aria-pressed={isSaved}
                  title={isSaved ? "取消收藏" : "收藏題目"}
                  className="ml-1 h-8 px-2"
                >
                  <Bookmark
                    className={`h-4 w-4 ${
                      isSaved
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="ml-1 text-xs">
                    {isSaved ? "已收藏" : "收藏"}
                  </span>
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Markdown>{q.questionMd}</Markdown>

          {q.type === "choice" && (
            <RadioGroup
              value={singleAns}
              onValueChange={setSingleAns}
              disabled={revealed}
              className="space-y-2"
            >
              {q.options.map((o) => {
                const isThisCorrect =
                  revealed && q.correctAnswer === o.key;
                const isThisWrong =
                  revealed && singleAns === o.key && singleAns !== q.correctAnswer;
                return (
                  <label
                    key={o.key}
                    htmlFor={`opt-${q.id}-${o.key}`}
                    className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${
                      isThisCorrect
                        ? "border-green-500 bg-green-50"
                        : isThisWrong
                        ? "border-red-500 bg-red-50"
                        : ""
                    }`}
                  >
                    <RadioGroupItem id={`opt-${q.id}-${o.key}`} value={o.key} />
                    <span className="flex-1">
                      <span className="font-medium mr-2">{o.key}.</span>
                      {o.text}
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          )}

          {q.type === "multi" && (
            <div className="space-y-2">
              {q.options.map((o) => {
                const correctArr = Array.isArray(q.correctAnswer)
                  ? q.correctAnswer
                  : [];
                const isThisCorrect = revealed && correctArr.includes(o.key);
                const isThisChosen = multiAns.includes(o.key);
                return (
                  <label
                    key={o.key}
                    htmlFor={`opt-${q.id}-${o.key}`}
                    className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${
                      isThisCorrect
                        ? "border-green-500 bg-green-50"
                        : revealed && isThisChosen
                        ? "border-red-500 bg-red-50"
                        : ""
                    }`}
                  >
                    <Checkbox
                      id={`opt-${q.id}-${o.key}`}
                      checked={isThisChosen}
                      disabled={revealed}
                      onCheckedChange={(v) => {
                        setMultiAns((s) =>
                          v ? [...s, o.key] : s.filter((x) => x !== o.key)
                        );
                      }}
                    />
                    <span className="flex-1">
                      <span className="font-medium mr-2">{o.key}.</span>
                      {o.text}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {q.type === "essay" && (
            <div className="space-y-2">
              <Textarea
                value={essayAns}
                onChange={(e) => setEssayAns(e.target.value)}
                placeholder="請寫下你的答案（送出後直接顯示答案範本與詳解，本系統不對申論題評分）"
                rows={8}
                disabled={revealed}
              />
              {!revealed && (
                <p className="text-xs text-muted-foreground">
                  申論題不計對錯，僅紀錄你已練習過此題；按下「我寫完了，看答案」直接顯示完整範本與詳解。
                </p>
              )}
            </div>
          )}

          {!revealed && (
            <div className="flex gap-2">
              <Button onClick={submit}>
                {q.type === "essay" ? "我寫完了，看答案" : "送出答案"}
              </Button>
            </div>
          )}

          {revealed && (
            <div className="space-y-3 border-t pt-4">
              {q.type !== "essay" && (
                <p className="text-sm font-medium">
                  {isCorrectChoice() ? (
                    <span className="text-green-700">✓ 答對</span>
                  ) : (
                    <span className="text-red-700">✗ 答錯</span>
                  )}
                </p>
              )}
              {q.type === "essay" && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  申論題不計對錯。請對照下方「答案範本 / 爭點 / 法條」自我比較。
                </div>
              )}
              <div>
                <h3 className="mb-2 font-semibold">
                  {q.type === "essay" ? "答案範本與詳解" : "詳解"}
                </h3>
                <Markdown>{q.explanationMd}</Markdown>
              </div>
              {q.references.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">參考依據</h3>
                  <ul className="list-disc pl-5 text-sm">
                    {q.references.map((r, i) => (
                      <li key={i}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline"
                        >
                          {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {q.source && (
                <p className="text-xs text-muted-foreground">來源：{q.source}</p>
              )}
              <div className="flex gap-2">
                {idx < questions.length - 1 ? (
                  <Button onClick={next}>下一題</Button>
                ) : (
                  <Link href={exitHref ?? `/subjects/civil/${topicSlug}`}>
                    <Button>{exitLabel ?? "結束練習"}</Button>
                  </Link>
                )}
                <Link href={exitHref ?? `/subjects/civil/${topicSlug}`}>
                  <Button variant="ghost">中止</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {finished && (
        <Card>
          <CardContent className="space-y-3 py-4 text-center">
            <p className="font-semibold">
              {finishedLabel ?? "已完成"} — 選擇正確 {stats.correct} /{" "}
              {stats.scored}
              {stats.essays > 0 && <> · 申論 {stats.essays} 題</>}
            </p>
            {exitHref && (
              <Link href={exitHref}>
                <Button>{exitLabel ?? "結束練習"}</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
