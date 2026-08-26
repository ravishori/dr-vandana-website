import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { cmsSeedBundle } from "@/data/cms/seed";
import {
  cloneBundle,
  emptyBundle,
  type CmsRepository,
} from "@/lib/cms/repository";
import type { CmsContentBundle } from "@/types/cms";

function isBundle(value: unknown): value is CmsContentBundle {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as CmsContentBundle;
  return (
    Array.isArray(candidate.articles) &&
    Array.isArray(candidate.resources) &&
    Array.isArray(candidate.videos)
  );
}

export class FileCmsRepository implements CmsRepository {
  constructor(private readonly filePath: string) {}

  private resolvedPath(): string {
    if (path.isAbsolute(this.filePath)) {
      return this.filePath;
    }
    // Keep path statically scoped under data/ for bundler tracing.
    const safeRelative = this.filePath.replace(/^(\.\/)+/, "");
    return path.join(/*turbopackIgnore: true*/ process.cwd(), safeRelative);
  }

  async read(): Promise<CmsContentBundle> {
    try {
      const raw = await readFile(this.resolvedPath(), "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!isBundle(parsed)) {
        return emptyBundle();
      }
      return cloneBundle(parsed);
    } catch {
      return emptyBundle();
    }
  }

  async write(bundle: CmsContentBundle): Promise<void> {
    const target = this.resolvedPath();
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(cloneBundle(bundle), null, 2), "utf8");
  }

  async ensureSeeded(seed: CmsContentBundle = cmsSeedBundle): Promise<void> {
    const current = await this.read();
    if (
      current.articles.length === 0 &&
      current.resources.length === 0 &&
      current.videos.length === 0
    ) {
      await this.write(seed);
    }
  }
}
