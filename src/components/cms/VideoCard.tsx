import Image from "next/image";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/cms/urls";
import type { CmsVideo } from "@/types/cms";

type VideoCardProps = {
  video: CmsVideo;
  embed?: boolean;
};

export function VideoCard({ video, embed = false }: VideoCardProps) {
  const watchUrl = youtubeWatchUrl(video.youtubeVideoId);
  const embedUrl = youtubeEmbedUrl(video.youtubeVideoId);

  return (
    <article className="flex h-full flex-col gap-3 border-t border-brand-muted/30 pt-5">
      <p className="text-xs font-medium tracking-wide text-brand uppercase">
        {video.category}
      </p>
      <h3 className="text-text text-xl font-semibold">{video.title}</h3>
      <p className="text-text-muted text-sm leading-relaxed">{video.description}</p>
      {embed ? (
        <div className="aspect-video overflow-hidden rounded-[var(--radius-md)] bg-surface-soft">
          <iframe
            title={video.title}
            src={embedUrl}
            className="h-full w-full border-0"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : video.thumbnailUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-[var(--radius-md)] bg-surface-soft">
          <Image
            src={video.thumbnailUrl}
            alt={`Thumbnail for: ${video.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-3 pt-2">
        <ButtonLink href={watchUrl} variant="secondary" external>
          Watch on YouTube
        </ButtonLink>
      </div>
    </article>
  );
}
