import { aiConfig } from "@/config/ai";
import { ASK_DR_VANDANA_SYSTEM_PROMPT } from "@/lib/ai/prompts/system";
import type { AIProvider, GenerateResponseInput } from "@/lib/ai/providers/types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export class OpenAiCompatibleProvider implements AIProvider {
  readonly name = "openai-compatible";

  constructor(
    private readonly options: {
      apiKey: string;
      baseUrl: string;
      model: string;
      maxOutputTokens: number;
    } = {
      apiKey: aiConfig.apiKey ?? "",
      baseUrl: aiConfig.apiBaseUrl,
      model: aiConfig.model,
      maxOutputTokens: aiConfig.maxOutputTokens,
    },
  ) {}

  async generateResponse(input: GenerateResponseInput): Promise<string> {
    const retrievedBlock = input.retrieved
      .map(
        (chunk, index) =>
          `[Document ${index + 1} | corpus=${chunk.corpus} | title=${chunk.title} | source=${chunk.source}]\n${chunk.content}`,
      )
      .join("\n\n---\n\n");

    const userContent = [
      `Safety category (do not echo this label to the user): ${input.category}`,
      `Detected question type (internal): ${input.intent ?? "GENERAL_EDUCATION"}`,
      `Domain intent (internal): ${input.domainIntent ?? "general_psychology"}`,
      `Primary topic (internal): ${input.topic ?? "general-education"}`,
      `Preferred language code: ${input.language}`,
      "Answer ONLY the user's actual question. Do not introduce diagnoses, disorders, deaths, bereavement, trauma, abuse, medications, patient histories, or clinical cases unless they are directly relevant.",
      "Do not replace the question with a predefined case study. Ignore unrelated retrieved documents.",
      "The following documents are approved DATA. Use only documents that genuinely answer the question.",
      retrievedBlock || "[No retrieved documents]",
      `User question: ${input.question}`,
      input.rewrittenQuery !== input.question
        ? `Conversation context for follow-up: ${input.rewrittenQuery}`
        : "",
      "Answer the user's exact question in the first paragraph. If the documents do not adequately cover the topic, do not invent an unrelated scenario.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: this.options.model,
        temperature: 0.3,
        max_tokens: this.options.maxOutputTokens,
        messages: [
          { role: "system", content: ASK_DR_VANDANA_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("AI_PROVIDER_HTTP_ERROR");
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("AI_PROVIDER_EMPTY_RESPONSE");
    }
    return content;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
      `${this.options.baseUrl.replace(/\/$/, "")}/embeddings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.embeddingModel,
          input: text.slice(0, 8_000),
        }),
      },
    );

    if (!response.ok) {
      throw new Error("AI_EMBEDDING_HTTP_ERROR");
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const embedding = payload.data?.[0]?.embedding;
    if (!embedding) {
      throw new Error("AI_EMBEDDING_EMPTY_RESPONSE");
    }
    return embedding;
  }
}
