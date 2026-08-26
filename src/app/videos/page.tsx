import type { Metadata } from "next";

import { VideoCard } from "@/components/cms/VideoCard";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/config/site";
import { listPublishedVideos } from "@/lib/cms/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Videos",
  description:
    "Educational YouTube videos related to mental wellness and practice updates from Dr. Vandana Rajiv Chaudhary.",
  alternates: { canonical: `${siteConfig.url}/videos` },
  openGraph: {
    title: "Videos",
    description: "Watch educational mental-wellness videos.",
    url: `${siteConfig.url}/videos`,
  },
};

export default async function VideosPage() {
  const result = await listPublishedVideos({ pageSize: 50 });
  const featured =
    result.items.find((item) => item.featured) ?? result.items[0] ?? null;
  const rest = result.items.filter((item) => item.id !== featured?.id);

  return (
    <Section aria-labelledby="videos-heading">
      <Container>
        <header className="max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-brand uppercase">
            Video library
          </p>
          <h1 id="videos-heading" className="text-text mt-2 text-4xl font-semibold">
            Dr. Vandana&apos;s YouTube Videos
          </h1>
          <p className="text-text-muted mt-4 text-lg leading-relaxed">
            Educational videos. Playback uses privacy-conscious embedding where
            possible. Videos do not autoplay.
          </p>
        </header>

        {featured ? (
          <div className="mt-12 max-w-3xl">
            <VideoCard video={featured} embed />
          </div>
        ) : (
          <p className="text-text-muted mt-12">No published videos yet.</p>
        )}

        {rest.length > 0 ? (
          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
