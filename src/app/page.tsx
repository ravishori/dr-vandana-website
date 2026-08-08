import { professionalProfile } from "@/data/professional";
import { siteConfig } from "@/config/site";

/**
 * Milestone 1 placeholder only.
 * Homepage sections, navigation, and conversion UI belong to later milestones.
 */
export default function Home() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-[var(--space-page-x)] py-16"
    >
      <p className="text-text-muted text-sm tracking-wide uppercase">
        {siteConfig.profession}
      </p>
      <h1 className="mt-3">{professionalProfile.name}</h1>
      <p className="text-brand-muted mt-4 text-xl">{professionalProfile.tagline}</p>
      <p className="text-text-muted mt-6 max-w-2xl text-base">
        Project foundations are in place. Homepage sections and practice features
        will be added in later milestones.
      </p>
    </main>
  );
}
