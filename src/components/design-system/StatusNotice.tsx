import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusNoticeTone = "info" | "success" | "warning" | "emergency";

export type StatusNoticeProps = {
  title: string;
  children: ReactNode;
  tone?: StatusNoticeTone;
  className?: string;
  role?: "status" | "alert" | "note";
};

const toneClasses: Record<StatusNoticeTone, string> = {
  info: "border-[color-mix(in_srgb,var(--color-brand-muted)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] text-[var(--color-text)]",
  success:
    "border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning:
    "border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  emergency:
    "border-[color-mix(in_srgb,var(--color-emergency)_35%,transparent)] bg-[var(--color-emergency-soft)] text-[var(--color-emergency)]",
};

/**
 * Calm status / notice banner for ethics, emergency boundaries, and guidance.
 */
export function StatusNotice({
  title,
  children,
  tone = "info",
  className,
  role = "status",
}: StatusNoticeProps) {
  return (
    <div
      role={role}
      className={cn(
        "rounded-[var(--radius-lg)] border px-4 py-3 sm:px-5 sm:py-4",
        toneClasses[tone],
        className,
      )}
    >
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      <div className="mt-1 text-sm leading-relaxed [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
