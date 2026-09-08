import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  cloneCommunicationsBundle,
  emptyCommunicationsBundle,
  isCommunicationsBundle,
  type CommunicationsRepository,
} from "@/lib/communications/repository";
import type { CommunicationsBundle } from "@/types/communications";

export class FileCommunicationsRepository implements CommunicationsRepository {
  constructor(private readonly filePath: string) {}

  private resolvedPath(): string {
    if (path.isAbsolute(this.filePath)) {
      return this.filePath;
    }
    const safeRelative = this.filePath.replace(/^(\.\/)+/, "");
    return path.join(/*turbopackIgnore: true*/ process.cwd(), safeRelative);
  }

  async read(): Promise<CommunicationsBundle> {
    try {
      const raw = await readFile(this.resolvedPath(), "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!isCommunicationsBundle(parsed)) {
        return emptyCommunicationsBundle();
      }
      return cloneCommunicationsBundle(parsed);
    } catch {
      return emptyCommunicationsBundle();
    }
  }

  async write(bundle: CommunicationsBundle): Promise<void> {
    const target = this.resolvedPath();
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      JSON.stringify(cloneCommunicationsBundle(bundle), null, 2),
      "utf8",
    );
  }

  async ensureSeeded(): Promise<void> {
    // Empty by default — no seed conversations required.
  }
}
