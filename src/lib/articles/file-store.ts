import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  articlesSeedBundle,
  cloneArticlesBundle,
  emptyArticlesBundle,
} from "@/data/articles/seed";
import {
  isArticlesBundle,
  normalizeArticlesBundle,
  updateArticlesBundle,
  type ArticlesRepository,
} from "@/lib/articles/repository";
import type { ArticlesBundle } from "@/types/articles";

export class FileArticlesRepository implements ArticlesRepository {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private resolvedPath(): string {
    if (path.isAbsolute(this.filePath)) {
      return this.filePath;
    }
    const safeRelative = this.filePath.replace(/^(\.\/)+/, "");
    return path.join(/*turbopackIgnore: true*/ process.cwd(), safeRelative);
  }

  async read(): Promise<ArticlesBundle> {
    try {
      const raw = await readFile(this.resolvedPath(), "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!isArticlesBundle(parsed)) {
        return emptyArticlesBundle();
      }
      return normalizeArticlesBundle(cloneArticlesBundle(parsed));
    } catch {
      return emptyArticlesBundle();
    }
  }

  async write(bundle: ArticlesBundle): Promise<void> {
    const target = this.resolvedPath();
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      JSON.stringify(normalizeArticlesBundle(cloneArticlesBundle(bundle)), null, 2),
      "utf8",
    );
  }

  async compareAndSet(
    expectedRevision: number,
    next: ArticlesBundle,
  ): Promise<boolean> {
    // Serialize compare-and-set on a promise chain for local file durability.
    let saved = false;
    this.writeChain = this.writeChain.then(async () => {
      const current = await this.read();
      if (current.revision !== expectedRevision) {
        saved = false;
        return;
      }
      await this.write(next);
      saved = true;
    });
    await this.writeChain;
    return saved;
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
}
