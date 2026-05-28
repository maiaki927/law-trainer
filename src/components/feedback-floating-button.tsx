"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

interface CurrentCtx {
  topicSlug?: string;
  questionId?: string;
}

declare global {
  interface Window {
    __feedbackCtx?: CurrentCtx;
  }
}

const CATEGORIES = [
  { value: "missing", label: "缺題目" },
  { value: "wrong_question", label: "題目有誤" },
  { value: "wrong_explanation", label: "解析有誤" },
  { value: "ui", label: "介面 / UX" },
  { value: "other", label: "其他" },
];

export function FeedbackFloatingButton() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState("other");
  const [message, setMessage] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const { push } = useToast();

  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const ctx = (typeof window !== "undefined" && window.__feedbackCtx) || {};
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          contact: contact || null,
          path: pathname,
          topicSlug: ctx.topicSlug ?? null,
          questionId: ctx.questionId ?? null,
        }),
      });
      if (res.ok) {
        push("感謝回報");
        setOpen(false);
        setMessage("");
        setContact("");
        setCategory("other");
      } else {
        push("送出失敗，請稍後再試");
      }
    } catch {
      push("送出失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg"
        aria-label="意見回饋"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>意見回饋</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="fb-category">類別</Label>
              <select
                id="fb-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-base"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="fb-msg">內容</Label>
              <Textarea
                id="fb-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="請描述你看到的問題或建議"
                rows={5}
              />
            </div>
            <div>
              <Label htmlFor="fb-contact">聯絡方式（選填）</Label>
              <Input
                id="fb-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="email / LINE / 其他"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                取消
              </Button>
            </DialogClose>
            <Button onClick={submit} disabled={submitting || !message.trim()}>
              {submitting ? "送出中..." : "送出"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// allow page-level component to set context for the floating button
export function useSetFeedbackContext(ctx: CurrentCtx) {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.__feedbackCtx = ctx;
    }
    return () => {
      if (typeof window !== "undefined") {
        window.__feedbackCtx = {};
      }
    };
  }, [ctx]);
}
