import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppointmentFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
  className?: string;
};

export function AppointmentField({
  id,
  label,
  required = false,
  error,
  helperText,
  children,
  className,
}: AppointmentFieldProps) {
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="text-text block text-sm font-medium">
        {label}
        {required ? (
          <span className="text-brand ml-1" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      {helperText ? (
        <p id={helperId} className="text-text-muted text-sm leading-relaxed">
          {helperText}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="text-sm text-[color:var(--color-brand)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const appointmentControlClassName =
  "border-brand-muted/40 bg-surface text-text focus-visible:border-brand w-full rounded-[var(--radius-md)] border px-3 py-3 text-base outline-none";
