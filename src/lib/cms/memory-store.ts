import { cmsSeedBundle } from "@/data/cms/seed";
import {
  cloneBundle,
  emptyBundle,
  type CmsRepository,
} from "@/lib/cms/repository";
import type { CmsContentBundle } from "@/types/cms";

export class MemoryCmsRepository implements CmsRepository {
  private bundle: CmsContentBundle = emptyBundle();
  private seeded = false;

  async read(): Promise<CmsContentBundle> {
    return cloneBundle(this.bundle);
  }

  async write(bundle: CmsContentBundle): Promise<void> {
    this.bundle = cloneBundle(bundle);
  }

  async ensureSeeded(seed: CmsContentBundle = cmsSeedBundle): Promise<void> {
    if (this.seeded) {
      return;
    }
    if (
      this.bundle.articles.length === 0 &&
      this.bundle.resources.length === 0 &&
      this.bundle.videos.length === 0
    ) {
      this.bundle = cloneBundle(seed);
    }
    this.seeded = true;
  }
}
