import type {
  Annotation,
  Clarification,
  Draft,
  IntakeReviewTask,
  Submission,
} from "@/lib/intake/types";

export type IntakeState = {
  drafts: Record<string, Draft>;
  submissions: Record<string, Submission>;
  /** draftId -> submissionId, enforces one submission per draft. */
  submissionByDraft: Record<string, string>;
  /** idempotency key -> submissionId. */
  submissionByKey: Record<string, string>;
  tasks: Record<string, IntakeReviewTask>;
  clarifications: Record<string, Clarification>;
  annotations: Record<string, Annotation>;
};

export function emptyState(): IntakeState {
  return {
    drafts: {},
    submissions: {},
    submissionByDraft: {},
    submissionByKey: {},
    tasks: {},
    clarifications: {},
    annotations: {},
  };
}

/** Handle passed to code running inside a transaction. */
export type Tx = {
  state: IntakeState;
  /** Test hook: throws if this failpoint is armed. No effect otherwise. */
  failpoint(name: string): void;
};

/**
 * Transaction abstraction. A database implementation will map this onto a
 * real transaction (needs an approved migration); this in-memory version has
 * the same contract: all writes in `fn` commit together, or none do, and
 * transactions run one at a time (serialised).
 */
export interface IntakeStore {
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Read-only snapshot (deep copy) for queries outside a transaction. */
  read(): IntakeState;
}

/** Submitted answers, clarifications and annotations may never change or disappear. */
function assertAppendOnly(before: IntakeState, after: IntakeState): void {
  for (const table of ["submissions", "clarifications", "annotations"] as const) {
    for (const [id, row] of Object.entries(before[table])) {
      const next = (after[table] as Record<string, unknown>)[id];
      if (!next || JSON.stringify(next) !== JSON.stringify(row)) {
        throw new Error(`immutable_row_modified:${table}`);
      }
    }
  }
}

export class InMemoryIntakeStore implements IntakeStore {
  private state: IntakeState = emptyState();
  private queue: Promise<unknown> = Promise.resolve();
  readonly failpoints = new Set<string>();

  read(): IntakeState {
    return structuredClone(this.state);
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const working = structuredClone(this.state);
      const tx: Tx = {
        state: working,
        failpoint: (name) => {
          if (this.failpoints.has(name)) throw new Error(`failpoint:${name}`);
        },
      };
      const result = await fn(tx);
      assertAppendOnly(this.state, working);
      this.state = working; // commit
      return result;
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
