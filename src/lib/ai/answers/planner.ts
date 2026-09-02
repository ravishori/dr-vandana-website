import type { AskIntent, RetrievedChunk } from "@/types/ai";

export type AnswerSection =
  | "shortAnswer"
  | "whatItMeans"
  | "practicalSteps"
  | "howToPractise"
  | "stepByStep"
  | "keyDifferences"
  | "potentialBenefits"
  | "example"
  | "importantNote"
  | "whenHelp";

export type AnswerPlan = {
  sections: AnswerSection[];
  headings: Partial<Record<AnswerSection, string>>;
};

export function planAnswerStructure(intent: AskIntent): AnswerPlan {
  switch (intent) {
    case "HOW_TO":
    case "SELF_HELP":
      return {
        sections: ["shortAnswer", "practicalSteps", "example", "whenHelp"],
        headings: {
          shortAnswer: "Short Answer",
          practicalSteps: "Practical Steps",
          example: "Example",
          whenHelp: "When Professional Support May Help",
        },
      };
    case "TECHNIQUE":
      return {
        sections: [
          "shortAnswer",
          "whatItMeans",
          "howToPractise",
          "stepByStep",
          "importantNote",
        ],
        headings: {
          shortAnswer: "Short Answer",
          whatItMeans: "What It Means",
          howToPractise: "How to Practise It",
          stepByStep: "Step-by-Step",
          importantNote: "Important Note",
        },
      };
    case "COMPARISON":
      return {
        sections: ["shortAnswer", "keyDifferences", "example", "importantNote"],
        headings: {
          shortAnswer: "Short Answer",
          keyDifferences: "Key Differences",
          example: "Simple Example",
          importantNote: "Important Note",
        },
      };
    case "BENEFITS":
      return {
        sections: ["shortAnswer", "potentialBenefits", "importantNote"],
        headings: {
          shortAnswer: "Short Answer",
          potentialBenefits: "Potential Benefits",
          importantNote: "Important Considerations",
        },
      };
    case "WHEN_TO_SEEK_HELP":
      return {
        sections: ["shortAnswer", "whenHelp", "importantNote"],
        headings: {
          shortAnswer: "Short Answer",
          whenHelp: "When Professional Support May Help",
          importantNote: "Important Note",
        },
      };
    case "DEFINITION":
    default:
      return {
        sections: ["shortAnswer", "whatItMeans", "example", "importantNote"],
        headings: {
          shortAnswer: "Short Answer",
          whatItMeans: "What It Means",
          example: "Simple Example",
          importantNote: "Important Note",
        },
      };
  }
}

export function firstParagraph(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean)
    ?.split(/(?<=[.?!])\s+/)[0]
    ?.trim() ?? content.trim();
}

export function extractSentences(content: string, count = 2): string {
  return content
    .split(/(?<=[.?!])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, count)
    .join(" ");
}

export function practicalLines(chunks: readonly RetrievedChunk[]): string[] {
  const lines: string[] = [];
  for (const chunk of chunks) {
    if (chunk.practical_steps) {
      lines.push(...chunk.practical_steps);
    }
    for (const line of chunk.content.split("\n")) {
      const trimmed = line.replace(/^[\d.]+[\).]?\s*/, "").trim();
      if (/^[-*•]/.test(trimmed) || /^(\d+\.|-)/.test(line.trim())) {
        lines.push(trimmed.replace(/^[-*•]\s*/, ""));
      }
    }
  }
  return [...new Set(lines.filter((line) => line.length > 20))].slice(0, 6);
}

export function exampleLines(chunks: readonly RetrievedChunk[]): string[] {
  const lines: string[] = [];
  for (const chunk of chunks) {
    if (chunk.examples) {
      lines.push(...chunk.examples);
    }
  }
  return [...new Set(lines.filter(Boolean))].slice(0, 2);
}

export function cautionLines(chunks: readonly RetrievedChunk[]): string[] {
  const lines: string[] = [];
  for (const chunk of chunks) {
    if (chunk.cautions) {
      lines.push(...chunk.cautions);
    }
  }
  return [...new Set(lines.filter(Boolean))].slice(0, 3);
}

export function bullet(lines: readonly string[]): string {
  if (lines.length === 0) {
    return "";
  }
  return lines.map((line) => `- ${line}`).join("\n");
}
