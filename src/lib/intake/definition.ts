import { createHash } from "node:crypto";

import { authoringViolations } from "@/lib/intake/authoring-guard";
import type {
  AnswerEntry,
  Condition,
  Question,
  QuestionnaireDefinition,
} from "@/lib/intake/types";
import { QUESTION_KINDS } from "@/lib/intake/types";

export type IntakeEngineConfig = {
  /** Allow SYNTHETIC_FIXTURE content (tests, local development). Default false. */
  allowSyntheticContent: boolean;
  /** Hooks for future languages. English only in V1. */
  supportedLocales: readonly string[];
  /** Hooks for future age groups. Adults only in V1. */
  supportedAudiences: readonly string[];
};

export const DEFAULT_INTAKE_CONFIG: IntakeEngineConfig = {
  allowSyntheticContent: false,
  supportedLocales: ["en"],
  supportedAudiences: ["adult"],
};

const CHOICE_KINDS = new Set(["single_choice", "multiple_choice", "yes_no_unsure"]);

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Hash of the content that a clinician approves (not of status/approval). */
export function contentHash(def: QuestionnaireDefinition): string {
  return sha256(
    canonicalJson({
      id: def.id,
      version: def.version,
      locale: def.locale,
      audience: def.audience,
      contentStatus: def.contentStatus,
      sections: def.sections,
    }),
  );
}

export function allQuestions(def: QuestionnaireDefinition): Question[] {
  return def.sections.flatMap((s) => s.questions);
}

function conditionRefs(c: Condition): string[] {
  if (c.type === "answer_equals" || c.type === "answer_in") return [c.questionId];
  return c.conditions.flatMap(conditionRefs);
}

/** Returns a list of problems; empty means the definition is well formed. */
export function validateDefinition(def: QuestionnaireDefinition): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const sectionIds = new Set<string>();
  const order: Question[] = [];

  if (!Number.isInteger(def.version) || def.version < 1) errors.push("invalid_version");
  if (def.sections.length === 0) errors.push("no_sections");

  for (const section of def.sections) {
    if (sectionIds.has(section.id)) errors.push(`duplicate_section:${section.id}`);
    sectionIds.add(section.id);
    errors.push(...authoringViolations(section.title).map((e) => `${e}:${section.id}`));
    for (const q of section.questions) {
      if (seen.has(q.id)) errors.push(`duplicate_question:${q.id}`);
      seen.add(q.id);
      order.push(q);
    }
  }

  const position = new Map(order.map((q, i) => [q.id, i]));
  const byId = new Map(order.map((q) => [q.id, q]));

  for (const q of order) {
    if (!QUESTION_KINDS.includes(q.kind)) errors.push(`unknown_kind:${q.id}`);
    errors.push(...authoringViolations(q.prompt).map((e) => `${e}:${q.id}`));
    for (const o of q.options ?? []) {
      errors.push(...authoringViolations(o.label).map((e) => `${e}:${q.id}`));
    }
    if (CHOICE_KINDS.has(q.kind)) {
      const codes = (q.options ?? []).map((o) => o.code);
      if (q.kind !== "yes_no_unsure" && codes.length < 2) errors.push(`too_few_options:${q.id}`);
      if (new Set(codes).size !== codes.length) errors.push(`duplicate_option:${q.id}`);
    } else if (q.options && q.options.length > 0) {
      errors.push(`options_on_non_choice:${q.id}`);
    }
    if (q.showIf) {
      for (const ref of conditionRefs(q.showIf)) {
        const target = byId.get(ref);
        if (!target) {
          errors.push(`condition_unknown_question:${q.id}->${ref}`);
        } else if ((position.get(ref) ?? 0) >= (position.get(q.id) ?? 0)) {
          errors.push(`condition_not_earlier:${q.id}->${ref}`);
        } else if (!CHOICE_KINDS.has(target.kind)) {
          // Rules may never depend on free text.
          errors.push(`condition_on_non_choice:${q.id}->${ref}`);
        }
      }
    }
  }
  return errors;
}

/** Throws unless the definition may be served to patients under this config. */
export function assertServable(
  def: QuestionnaireDefinition,
  config: IntakeEngineConfig,
): void {
  const problems = validateDefinition(def);
  if (problems.length > 0) throw new Error(`definition invalid: ${problems.join(", ")}`);
  if (def.status !== "approved" || !def.approval) throw new Error("definition not approved");
  if (def.approval.contentHash !== contentHash(def)) {
    throw new Error("definition changed after approval (hash mismatch)");
  }
  if (def.contentStatus === "SYNTHETIC_FIXTURE" && !config.allowSyntheticContent) {
    throw new Error("synthetic fixture content cannot be served (OD-G1 not approved)");
  }
  if (!config.supportedLocales.includes(def.locale)) throw new Error("unsupported locale");
  if (!config.supportedAudiences.includes(def.audience)) throw new Error("unsupported audience");
}

/** Records an approval for the exact current content. */
export function approve(
  def: QuestionnaireDefinition,
  approvedBy: string,
  approvedAt: string,
): QuestionnaireDefinition {
  return {
    ...def,
    status: "approved",
    approval: { approvedBy, approvedAt, contentHash: contentHash(def) },
  };
}

function matches(c: Condition, answers: Record<string, AnswerEntry>): boolean {
  switch (c.type) {
    case "answer_equals": {
      const a = answers[c.questionId];
      return a?.state === "answered" && a.value === c.value;
    }
    case "answer_in": {
      const a = answers[c.questionId];
      if (a?.state !== "answered") return false;
      const v = a.value;
      return Array.isArray(v)
        ? v.some((x) => c.values.includes(x))
        : typeof v === "string" && c.values.includes(v);
    }
    case "all":
      return c.conditions.every((x) => matches(x, answers));
    case "any":
      return c.conditions.some((x) => matches(x, answers));
  }
}

/** A question is visible when it has no rule or its rule matches the answers so far. */
export function isVisible(q: Question, answers: Record<string, AnswerEntry>): boolean {
  return q.showIf ? matches(q.showIf, answers) : true;
}

/**
 * Visible questions evaluated in order, so a hidden question's stale answer
 * can never reveal a later question (hidden answers are ignored).
 */
export function visibleQuestions(
  def: QuestionnaireDefinition,
  answers: Record<string, AnswerEntry>,
): Question[] {
  const effective: Record<string, AnswerEntry> = {};
  const out: Question[] = [];
  for (const q of allQuestions(def)) {
    if (isVisible(q, effective)) {
      out.push(q);
      const a = answers[q.id];
      if (a) effective[q.id] = a;
    }
  }
  return out;
}
