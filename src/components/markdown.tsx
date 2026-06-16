"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkLawLink, type LawSubject } from "@/lib/markdown/law-link-plugin";
import { cn } from "@/lib/utils";

interface Props {
  children: string;
  className?: string;
  /**
   * 法律科目 context — 決定 `§X` auto-link 預設指向民法 (B0000001) 還是刑法 (C0000001)。
   * `民法第 X 條` / `刑法第 X 條` 明文寫法不受此 prop 影響。
   * 預設 `civil` 保持 backwards compat。
   */
  subject?: LawSubject;
}

export function Markdown({ children, className, subject = "civil" }: Props) {
  return (
    <div className={cn("prose-law", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkLawLink(subject)]}
        components={{
          a: ({ href, children, ...rest }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...rest}
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
