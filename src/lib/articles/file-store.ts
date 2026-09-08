import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  articlesSeedBundle,
  cloneArticlesBundle,
  emptyArticlesBundle,
} from "@/data/articles/seed";
import {
  isArticlesBundle,
  type ArticlesRepository,
} from "@/lib/articles/repository";
import type { ArticlesBundle } from "@/types/articles";

export class FileArticlesRepository implements ArticlesRepository {
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
      return cloneArticlesBundle(parsed);
    } catch {
      return emptyArticlesBundle();
    }
  }

  async write(bundle: ArticlesBundle): Promise<void> {
    const target = this.resolvedPath();
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      JSON.stringify(cloneArticlesBundle(bundle), null, 2),
      "utf8",
    );
  }

  async ensureSeeded(seed: ArticlesBundle = articlesSeedBundle): Promise<void> {
    const current = await this.read();
    if (current.articles.length === 0) {
      await this.write(seed);
    }
  }
}
