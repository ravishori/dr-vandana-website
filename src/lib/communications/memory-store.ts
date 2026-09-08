import type { CommunicationsBundle } from "@/types/communications";
import {
  cloneCommunicationsBundle,
  emptyCommunicationsBundle,
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

  async ensureSeeded(): Promise<void> {
    if (!this.state.bundle) {
      this.state.bundle = emptyCommunicationsBundle();
    }
  }

  reset(): void {
    this.state.bundle = null;
  }
}
