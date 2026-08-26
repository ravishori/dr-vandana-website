"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type BlogFiltersProps = {
  categories: readonly string[];
  currentCategory?: string;
  currentQuery?: string;
};

export function BlogFilters({
  categories,
  currentCategory = "",
  currentQuery = "",
}: BlogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    startTransition(() => {
      router.push(`/blog?${params.toString()}`);
    });
  }

  return (
    <form
      className="flex flex-col gap-3 md:flex-row md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        update({
          q: String(form.get("q") ?? ""),
          category: String(form.get("category") ?? ""),
        });
      }}
    >
      <label className="flex flex-1 flex-col gap-1 text-sm text-text">
        Search articles
        <input
          name="q"
          type="search"
          defaultValue={currentQuery}
          className="min-h-[var(--touch-target-min)] rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3"
          placeholder="Search by title or topic"
        />
      </label>
      <label className="flex min-w-[12rem] flex-col gap-1 text-sm text-text">
        Category
        <select
          name="category"
          defaultValue={currentCategory}
          className="min-h-[var(--touch-target-min)] rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="min-h-[var(--touch-target-min)] rounded-[var(--radius-md)] bg-brand px-5 text-sm font-medium text-white"
        disabled={pending}
      >
        {pending ? "Filtering…" : "Apply"}
      </button>
    </form>
  );
}
