"use client";

import { useId, useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/ui/icons";
import { practiceContact } from "@/data/contact";
import { cn } from "@/lib/utils";

type DigipinCopyButtonProps = {
  className?: string;
};

type CopyStatus = "idle" | "copied" | "failed";

export function DigipinCopyButton({ className }: DigipinCopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const statusId = useId();

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
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!ok) {
          throw new Error("execCommand copy failed");
        }
      }
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 4000);
    }
  }

  const label =
    status === "copied"
      ? practiceContact.labels.digipinCopied
      : practiceContact.labels.copyDigipin;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={handleCopy}
        className="border-brand-muted/40 text-brand hover:bg-background inline-flex min-h-[var(--touch-target-min)] items-center gap-2 rounded-[var(--radius-md)] border bg-transparent px-3 text-sm font-medium transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none"
        aria-label={label}
        aria-describedby={status !== "idle" ? statusId : undefined}
      >
        {status === "copied" ? (
          <CheckIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <CopyIcon className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{status === "copied" ? "Copied" : "Copy"}</span>
      </button>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={cn(
          "text-xs leading-snug",
          status === "idle" && "sr-only",
          status === "copied" && "text-brand",
          status === "failed" && "text-text-muted",
        )}
      >
        {status === "copied"
          ? practiceContact.labels.digipinCopied
          : status === "failed"
            ? practiceContact.labels.digipinCopyFailed
            : ""}
      </p>
    </div>
  );
}
