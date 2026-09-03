export const KNOWLEDGE_GAP_OPENING =
  "I don't currently have an approved Dr. Vandana educational resource specifically covering this topic.";

export function composeKnowledgeGapAnswer(options?: {
  topic?: string;
  suggestCounselling?: boolean;
}): string {
  const lines = ["### Short Answer", KNOWLEDGE_GAP_OPENING];

  if (options?.topic && options.topic !== "general-education") {
    lines.push(
      "",
      `Your question appears to be about ${options.topic.replace(/-/g, " ")}. I can only answer from approved educational material, and I do not have enough verified content on that specific topic yet.`,
    );
  }

  lines.push(
    "",
    "### What This Means for You",
    "A concise, honest answer is better than unrelated psychology information. If you have a nearby topic such as stress, mindfulness, counselling, or self-esteem, you are welcome to ask about that directly.",
  );

  if (options?.suggestCounselling) {
    lines.push(
      "",
      "### When Professional Support May Help",
      "If this is a personal concern that feels persistent or confusing, speaking with a qualified mental-health professional may be more helpful than this chat.",
    );
  }

  return lines.join("\n");
}
