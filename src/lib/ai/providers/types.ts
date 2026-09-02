import type { AskIntent, RetrievedChunk, SafetyCategory } from "@/types/ai";

export type GenerateResponseInput = {
  question: string;
  rewrittenQuery: string;
  category: SafetyCategory;
  retrieved: readonly RetrievedChunk[];
  language: string;
  intent?: AskIntent;
  topic?: string;
};

export interface AIProvider {
  readonly name: string;
  generateResponse(input: GenerateResponseInput): Promise<string>;
  classifySafety?(text: string): Promise<SafetyCategory | null>;
  generateEmbedding?(text: string): Promise<number[]>;
}
