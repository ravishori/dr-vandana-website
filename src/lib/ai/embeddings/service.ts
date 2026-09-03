/**
 * Embedding abstraction.
 * Default implementation is lexical (no external API).
 * An OpenAI-compatible embedding provider can be swapped in later
 * or used with VECTOR_DATABASE_URL / pgvector without changing callers.
 */

export interface EmbeddingService {
  readonly name: string;
  embed(text: string): Promise<number[]>;
}

const TOKEN_RE = /[a-z0-9']+/gi;

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []).filter(
    (token) => token.length > 1,
  );
}

/**
 * Deterministic hashed bag-of-words vector for optional hybrid scoring.
 * This is not a semantic embedding model; it keeps the interface replaceable.
 */
export class LexicalEmbeddingService implements EmbeddingService {
  readonly name = "lexical-hash";

  constructor(private readonly dimensions = 256) {}

  async embed(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    const tokens = tokenize(text);
    if (tokens.length === 0) {
      return vector;
    }
    for (const token of tokens) {
      const index = hashToken(token) % this.dimensions;
      vector[index] += 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (norm === 0) {
      return vector;
    }
    return vector.map((value) => value / norm);
  }
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const embeddingService: EmbeddingService = new LexicalEmbeddingService();
