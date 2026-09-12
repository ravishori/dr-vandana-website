import type { CommunicationsBundle } from "@/types/communications";
import {
  cloneCommunicationsBundle,
  emptyCommunicationsBundle,
  normalizeCommunicationsBundle,
  updateCommunicationsBundle,
  type CommunicationsRepository,
} from "@/lib/communications/repository";

type MemoryState = {
  bundle: CommunicationsBundle | null;
};

const globalState: MemoryState = { bundle: null };

export class MemoryCommunicationsRepository
  implements CommunicationsRepository
{
  constructor(private readonly state: MemoryState = globalState) {}

  async read(): Promise<CommunicationsBundle> {
    if (!this.state.bundle) {
      return emptyCommunicationsBundle();
    }
    return cloneCommunicationsBundle(this.state.bundle);
  }

  async write(bundle: CommunicationsBundle): Promise<void> {
    this.state.bundle = cloneCommunicationsBundle(bundle);
  }

  async compareAndSet(
    expectedRevision: number,
    next: CommunicationsBundle,
  ): Promise<boolean> {
    const currentRevision = this.state.bundle
      ? normalizeCommunicationsBundle(this.state.bundle).revision
      : 0;
    if (currentRevision !== expectedRevision) {
      return false;
    }
    this.state.bundle = cloneCommunicationsBundle(next);
    return true;
  }

  async update(
    mutator: (
      current: CommunicationsBundle,
    ) => CommunicationsBundle | Promise<CommunicationsBundle>,
  ): Promise<CommunicationsBundle> {
    return updateCommunicationsBundle(this, mutator);
  }

  async ensureSeeded(): Promise<void> {
    if (!this.state.bundle) {
      this.state.bundle = emptyCommunicationsBundle();
    }
  }

  reset(): void {
    this.state.bundle = null;
  }
}
