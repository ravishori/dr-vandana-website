import type { ArticlesBundle } from "@/types/articles";
import {
  cloneArticlesBundle,
  emptyArticlesBundle,
  articlesSeedBundle,
} from "@/data/articles/seed";
import type { ArticlesRepository } from "@/lib/articles/repository";

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
    return cloneArticlesBundle(this.state.bundle);
  }

  async write(bundle: ArticlesBundle): Promise<void> {
    this.state.bundle = cloneArticlesBundle(bundle);
  }

  async ensureSeeded(seed: ArticlesBundle = articlesSeedBundle): Promise<void> {
    const current = await this.read();
    if (current.articles.length === 0) {
      await this.write(seed);
    }
  }

  /** Test helper */
  reset(): void {
    this.state.bundle = null;
  }
}
