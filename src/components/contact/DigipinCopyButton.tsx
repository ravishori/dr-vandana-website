"use client";

import { useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/ui/icons";
import { practiceContact } from "@/data/contact";
import { cn } from "@/lib/utils";

type DigipinCopyButtonProps = {
  className?: string;
};

export function DigipinCopyButton({ className }: DigipinCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const value = practiceContact.digipin;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "border-brand-muted/40 text-brand hover:bg-background inline-flex min-h-[2.5rem] items-center gap-2 rounded-[var(--radius-md)] border bg-transparent px-3 text-sm font-medium transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none",
        className,
      )}
      aria-label={
        copied
          ? practiceContact.labels.digipinCopied
          : practiceContact.labels.copyDigipin
      }
    >
      {copied ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
