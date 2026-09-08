import type { ArticlesBundle } from "@/types/articles";
import {
  cloneArticlesBundle,
  emptyArticlesBundle,
  articlesSeedBundle,
} from "@/data/articles/seed";
import {
  normalizeArticlesBundle,
  updateArticlesBundle,
  type ArticlesRepository,
} from "@/lib/articles/repository";

type MemoryState = {
  bundle: ArticlesBundle | null;
};

const globalState: MemoryState = { bundle: null };

export class MemoryArticlesRepository implements ArticlesRepository {
  constructor(private readonly state: MemoryState = globalState) {}

  async read(): Promise<ArticlesBundle> {
    if (!this.state.bundle) {
      return emptyArticlesBundle();
    }
    return normalizeArticlesBundle(cloneArticlesBundle(this.state.bundle));
  }

  async write(bundle: ArticlesBundle): Promise<void> {
    this.state.bundle = normalizeArticlesBundle(cloneArticlesBundle(bundle));
  }

  async compareAndSet(
    expectedRevision: number,
    next: ArticlesBundle,
  ): Promise<boolean> {
    const currentRevision = this.state.bundle
      ? normalizeArticlesBundle(this.state.bundle).revision
      : 0;
    if (currentRevision !== expectedRevision) {
      return false;
    }
    this.state.bundle = normalizeArticlesBundle(cloneArticlesBundle(next));
    return true;
  }

  async update(
    mutator: (current: ArticlesBundle) => ArticlesBundle | Promise<ArticlesBundle>,
  ): Promise<ArticlesBundle> {
    return updateArticlesBundle(this, mutator, cloneArticlesBundle);
  }

  async ensureSeeded(seed: ArticlesBundle = articlesSeedBundle): Promise<void> {
    await this.update((current) => {
      if (current.articles.length > 0) {
        return current;
      }
      return cloneArticlesBundle(seed);
    });
  }

  /** Test helper */
  reset(): void {
    this.state.bundle = null;
  }
}
