"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkLawLink } from "@/lib/markdown/law-link-plugin";
import { cn } from "@/lib/utils";

interface Props {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: Props) {
  return (
    <div className={cn("prose-law", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkLawLink]}
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
