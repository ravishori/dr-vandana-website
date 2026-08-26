import Link from "next/link";

import { ButtonLink } from "@/components/ui/ButtonLink";
import type { CmsResource } from "@/types/cms";

type ResourceCardProps = {
  resource: CmsResource;
};

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <article className="flex h-full flex-col gap-3 border-t border-brand-muted/30 pt-5">
      <p className="text-xs font-medium tracking-wide text-brand uppercase">
        {resource.resourceType}
      </p>
      <h3 className="text-text text-xl font-semibold">{resource.title}</h3>
      {resource.organizationName ? (
        <p className="text-text-muted text-sm">{resource.organizationName}</p>
      ) : null}
      <p className="text-text-muted flex-1 text-sm leading-relaxed">
        {resource.description}
      </p>
      <p className="text-xs text-text-muted">Category: {resource.category}</p>
      <div>
        <ButtonLink href={resource.url} variant="secondary" external>
          Open resource
        </ButtonLink>
      </div>
      <p className="text-xs text-text-muted">
        External site — not affiliated unless explicitly stated.{" "}
        <Link href="/resources#disclaimer" className="underline underline-offset-2">
          Read disclaimer
        </Link>
      </p>
    </article>
  );
}
