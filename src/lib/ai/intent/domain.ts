import type { DomainIntent, SafetyCategory } from "@/types/ai";

export type DomainResolution = {
  domain: DomainIntent;
  secondary?: DomainIntent;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
};

export type DomainContext = {
  priorDomain?: DomainIntent;
  priorTopic?: string;
};

type DomainRule = {
  domain: DomainIntent;
  secondary?: DomainIntent;
  patterns: readonly RegExp[];
  reason: string;
};

const RELATIONSHIP_PATTERNS = [
  /\bin love\b/i,
  /\blove with (a |the )?(person|someone|somebody|him|her|them)\b/i,
  /\b(romantic|romance)\b/i,
  /\b(boyfriend|girlfriend|fiancé|fiancee|husband|wife|spouse|partner)\b/i,
  /\b(crush|soulmate|true love)\b/i,
  /\b(they|she|he) (love|likes) me\b/i,
  /\bwhether they love me\b/i,
  /\b(relationship|relationships|marriage|married|couple|break[- ]?up|heartbreak)\b/i,
  /\bcommunication in (a |the )?relationship\b/i,
];

const DOMAIN_RULES: readonly DomainRule[] = [
  {
    domain: "relationship",
    secondary: "emotional_wellbeing",
    patterns: RELATIONSHIP_PATTERNS,
    reason: "romantic-or-relationship-language",
  },
  {
    domain: "grief",
    patterns: [
      /\bgrief\b/i,
      /\bbereavement\b/i,
      /\bmourn(ing|s)?\b/i,
      /\b(passed away|died|death of|after (a |the )?loss|family loss)\b/i,
      /\bloss of (a |my )?(parent|mother|father|child|spouse|partner|loved one)\b/i,
    ],
    reason: "grief-or-bereavement-language",
  },
  {
    domain: "crisis_safety",
    patterns: [],
    reason: "safety-category",
  },
  {
    domain: "burnout",
    secondary: "workplace_mental_health",
    patterns: [/\bburnout\b/i, /\bemotional exhaustion\b/i],
    reason: "burnout-language",
  },
  {
    domain: "workplace_mental_health",
    secondary: "stress",
    patterns: [
      /\bworkplace (stress|mental health|pressure)\b/i,
      /\b(work stress|job stress|office stress)\b/i,
      /\b(boss|workload|long hours|work life)\b/i,
    ],
    reason: "workplace-language",
  },
  {
    domain: "anxiety",
    patterns: [/\banxiety\b/i, /\banxious\b/i, /\bpanic\b/i, /\boverthinking\b/i],
    reason: "anxiety-language",
  },
  {
    domain: "depression_awareness",
    patterns: [/\bdepression\b/i, /\blow mood\b/i, /\bhopeless\b/i],
    reason: "depression-awareness-language",
  },
  {
    domain: "stress",
    patterns: [/\bstress(ed|ful|es)?\b/i, /\boverwhelm(ed|ing)?\b/i],
    reason: "stress-language",
  },
  {
    domain: "anger_management",
    patterns: [/\bang(er|ry)\b/i, /\birritab(le|ility)\b/i],
    reason: "anger-language",
  },
  {
    domain: "parenting",
    secondary: "child_psychology",
    patterns: [/\bparent(ing|s)?\b/i, /\b(my|a) (child|kid|son|daughter)\b/i],
    reason: "parenting-language",
  },
  {
    domain: "child_psychology",
    secondary: "parenting",
    patterns: [/\bchild psychology\b/i, /\bchildren'?s (emotions|behaviour|behavior)\b/i],
    reason: "child-psychology-language",
  },
  {
    domain: "adolescent_psychology",
    patterns: [/\b(adolescent|teenager|teen)\b/i],
    reason: "adolescent-language",
  },
  {
    domain: "women_wellbeing",
    patterns: [/\bwomen'?s (mental health|wellbeing|well-being)\b/i, /\brole strain\b/i],
    reason: "women-wellbeing-language",
  },
  {
    domain: "self_esteem",
    secondary: "confidence",
    patterns: [/\bself[- ]?esteem\b/i, /\bself[- ]?worth\b/i, /\bself[- ]?criticism\b/i],
    reason: "self-esteem-language",
  },
  {
    domain: "confidence",
    secondary: "self_esteem",
    patterns: [/\b(self[- ]?)?confidence\b/i, /\bbuild confidence\b/i],
    reason: "confidence-language",
  },
  {
    domain: "mindfulness",
    patterns: [
      /\bmindfulness\b/i,
      /\bmeditation\b/i,
      /\bvisuali[sz]ation\b/i,
      /\bguided imagery\b/i,
    ],
    reason: "mindfulness-language",
  },
  {
    domain: "positive_psychology",
    patterns: [
      /\bpositive psychology\b/i,
      /\b(resilience|gratitude|strengths)\b/i,
      /\bpersonal growth\b/i,
    ],
    reason: "positive-psychology-language",
  },
  {
    domain: "psychological_assessment",
    patterns: [
      /\b(psychological|psych) assessment\b/i,
      /\bhow (do|does) (a )?psychologists? assess\b/i,
      /\bhow might a psychologist approach\b/i,
    ],
    reason: "assessment-language",
  },
  {
    domain: "professional_support",
    patterns: [
      /\b(when should i (see|seek)|when to seek)\b/i,
      /\b(first (counselling|counseling) session)\b/i,
      /\bhow does counsel+ing work\b/i,
      /\bbook (an )?appointment\b/i,
    ],
    reason: "professional-support-language",
  },
  {
    domain: "emotional_wellbeing",
    patterns: [
      /\bemotional (well[- ]?being|wellbeing|intelligence|regulation)\b/i,
      /\bemotions?\b/i,
      /\bfeelings?\b/i,
    ],
    reason: "emotional-wellbeing-language",
  },
  {
    domain: "general_psychology",
    patterns: [
      /\bwhat is (cbt|psychology|counselling|counseling)\b/i,
      /\bcognitive behavio(u)?ral therapy\b/i,
    ],
    reason: "general-psychology-language",
  },
];

const FOLLOW_UP_PATTERNS = [
  /^(what should i do|what can i do|what do i do)\b/i,
  /^(how (can|do|should) i|tell me more|and then|please help)\b/i,
  /^(what about (it|that|this)|and that)\b/i,
];

const AMBIGUOUS_BARE_PATTERNS = [
  /^(what|why|how|help|ok|okay|yes|no|hmm|\?)+$/i,
  /^(please help|help me|i need help)$/i,
];

export function isRomanticRelationshipQuestion(question: string): boolean {
  return RELATIONSHIP_PATTERNS.some((pattern) => pattern.test(question));
}

export function isSituationalLifeDifficultyQuestion(question: string): boolean {
  return /\b(tough|hard|difficult|challenging) to live (life )?when\b/i.test(
    question,
  );
}

export function looksLikeFollowUpQuestion(question: string): boolean {
  const trimmed = question.trim();
  if (FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }
  return (
    trimmed.length < 40 &&
    /\b(it|that|this|them|those|these)\b/i.test(trimmed)
  );
}

export function userAskedForCaseStudy(question: string): boolean {
  return /\b(case study|educational scenario|example (of|about) a case)\b/i.test(
    question,
  );
}

function matchDomainRules(question: string): DomainResolution | undefined {
  for (const rule of DOMAIN_RULES) {
    if (rule.patterns.length === 0) {
      continue;
    }
    if (rule.patterns.some((pattern) => pattern.test(question))) {
      return {
        domain: rule.domain,
        secondary: rule.secondary,
        confidence: "HIGH",
        reasons: [rule.reason],
      };
    }
  }
  return undefined;
}

export function classifyDomain(
  question: string,
  safetyCategory: SafetyCategory,
  context: DomainContext = {},
): DomainResolution {
  if (
    safetyCategory === "CRISIS_OR_EMERGENCY" ||
    safetyCategory === "SELF_HARM_OR_SUICIDE" ||
    safetyCategory === "VIOLENCE_OR_HARM"
  ) {
    return {
      domain: "crisis_safety",
      confidence: "HIGH",
      reasons: ["safety-category"],
    };
  }

  if (safetyCategory === "OUT_OF_SCOPE") {
    return {
      domain: "outside_scope",
      confidence: "HIGH",
      reasons: ["safety-out-of-scope"],
    };
  }

  const matched = matchDomainRules(question);
  if (matched) {
    return matched;
  }

  if (
    context.priorDomain &&
    context.priorDomain !== "outside_scope" &&
    context.priorDomain !== "crisis_safety" &&
    looksLikeFollowUpQuestion(question)
  ) {
    return {
      domain: context.priorDomain,
      confidence: "MEDIUM",
      reasons: ["session-follow-up"],
    };
  }

  if (
    AMBIGUOUS_BARE_PATTERNS.some((pattern) => pattern.test(question.trim())) &&
    !context.priorDomain
  ) {
    return {
      domain: "ambiguous",
      confidence: "HIGH",
      reasons: ["underspecified-question"],
    };
  }

  if (safetyCategory === "DR_VANDANA_SPECIFIC") {
    return {
      domain: "professional_support",
      confidence: "MEDIUM",
      reasons: ["practice-specific"],
    };
  }

  return {
    domain: "general_psychology",
    confidence: "LOW",
    reasons: ["default-general-psychology"],
  };
}

const DOMAIN_TOPICS: Record<DomainIntent, readonly string[]> = {
  relationship: ["romantic-love", "relationship-counselling", "relationships"],
  emotional_wellbeing: [
    "emotional-intelligence",
    "emotional-regulation",
    "life-skills",
    "romantic-love",
  ],
  stress: ["stress-management", "stress", "stress-vs-anxiety"],
  anxiety: ["anxiety-awareness", "anxiety", "stress-vs-anxiety"],
  depression_awareness: ["depression-awareness"],
  anger_management: ["anger", "emotional-regulation"],
  parenting: ["parenting-and-children", "parenting"],
  child_psychology: ["parenting-and-children", "child-development"],
  adolescent_psychology: ["adolescent-mental-health", "adolescents"],
  women_wellbeing: ["womens-mental-health"],
  workplace_mental_health: ["workplace-burnout", "stress-management"],
  burnout: ["workplace-burnout", "burnout"],
  grief: ["grief", "grief-after-loss"],
  self_esteem: ["self-esteem"],
  confidence: ["self-esteem", "confidence"],
  mindfulness: ["mindfulness", "visualization", "meditation"],
  positive_psychology: ["life-skills", "resilience", "emotional-intelligence"],
  general_psychology: [
    "cbt-concepts",
    "how-counselling-works",
    "emotional-intelligence",
    "psychology-fundamentals",
  ],
  psychological_assessment: ["case-approach-framework", "when-to-seek-help"],
  professional_support: [
    "when-to-seek-help",
    "how-counselling-works",
    "first-session",
    "counselling-approach",
  ],
  crisis_safety: [],
  outside_scope: [],
  ambiguous: [],
};

const RESTRICTED_TOPICS_UNLESS_REQUESTED = new Set([
  "grief",
  "grief-after-loss",
  "workplace-burnout",
  "adolescent-academic-pressure",
  "case-approach-framework",
]);

export function topicsForDomain(domain: DomainIntent): readonly string[] {
  return DOMAIN_TOPICS[domain];
}

export function documentMatchesDomain(
  topic: string,
  domain: DomainIntent,
  options?: { allowCaseStudies?: boolean },
): boolean {
  if (domain === "crisis_safety" || domain === "outside_scope" || domain === "ambiguous") {
    return false;
  }

  const allowed = topicsForDomain(domain);
  if (allowed.some((item) => topic === item || topic.includes(item) || item.includes(topic))) {
    return true;
  }

  if (!options?.allowCaseStudies && topic.includes("case")) {
    return false;
  }

  if (
    domain !== "grief" &&
    (topic === "grief" || topic === "grief-after-loss")
  ) {
    return false;
  }

  return false;
}

export function isRestrictedUnrelatedTopic(
  topic: string,
  domain: DomainIntent,
): boolean {
  if (domain === "grief" && (topic === "grief" || topic === "grief-after-loss")) {
    return false;
  }
  if (domain === "burnout" && topic.includes("burnout")) {
    return false;
  }
  if (
    domain === "adolescent_psychology" &&
    topic.includes("adolescent")
  ) {
    return false;
  }
  return RESTRICTED_TOPICS_UNLESS_REQUESTED.has(topic);
}

export function defaultTopicForDomain(domain: DomainIntent, fallback: string): string {
  return topicsForDomain(domain)[0] ?? fallback;
}
