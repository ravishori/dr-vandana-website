import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  cloneCommunicationsBundle,
  emptyCommunicationsBundle,
  isCommunicationsBundle,
  normalizeCommunicationsBundle,
  updateCommunicationsBundle,
  type CommunicationsRepository,
} from "@/lib/communications/repository";
import type { CommunicationsBundle } from "@/types/communications";

export class FileCommunicationsRepository implements CommunicationsRepository {
  private writeChain: Promise<void> = Promise.resolve();

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

  async compareAndSet(
    expectedRevision: number,
    next: CommunicationsBundle,
  ): Promise<boolean> {
    let saved = false;
    this.writeChain = this.writeChain.then(async () => {
      const current = await this.read();
      if (normalizeCommunicationsBundle(current).revision !== expectedRevision) {
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
    mutator: (
      current: CommunicationsBundle,
    ) => CommunicationsBundle | Promise<CommunicationsBundle>,
  ): Promise<CommunicationsBundle> {
    return updateCommunicationsBundle(this, mutator);
  }

  async ensureSeeded(): Promise<void> {
    // Empty by default — no seed conversations required.
  }
}
