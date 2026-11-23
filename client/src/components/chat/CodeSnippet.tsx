"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";

export function CodeSnippet({
  code,
  language = "typescript",
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  // Clean code string if wrapped in markdown triple backticks
  let cleanCode = code;
  let detectedLang = language;
  const match = code.match(/^```(\w+)?\n([\s\S]*?)```$/);
  if (match) {
    detectedLang = match[1] || language;
    cleanCode = match[2] || "";
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-surface-2/90 my-1 max-w-full text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border text-[11px] font-mono text-muted">
        <span className="flex items-center gap-1.5 font-semibold text-text">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          {detectedLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-muted hover:text-text transition-colors p-1 rounded"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-success" />
              <span className="text-[10px] text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-text">
        <code>{cleanCode}</code>
      </pre>
    </div>
  );
}

